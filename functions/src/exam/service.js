function examError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function assertExamAdmin(auth) {
  if (!auth) throw examError('unauthenticated', 'Sign-in required.')
  if (auth.token?.ipfestRole !== 'competition_manager'
    || auth.token?.ipfestCompetition !== 'smart competition') {
    throw examError('permission-denied', 'Smart Competition manager role required.')
  }
  return true
}

function assertTeamLeader(auth, teamId, team) {
  if (!auth) throw examError('unauthenticated', 'Sign-in required.')
  if (!team) throw examError('not-found', 'Registered team not found.')
  if (auth.uid !== teamId || team.competition !== 'smart competition') {
    throw examError('permission-denied', 'Only the registered Smart Competition team leader may take the exam.')
  }
  return true
}

function assertPacketRemovable(packet) {
  if (packet?.assignedEver || packet?.usedEver) {
    throw examError('failed-precondition', 'A packet that was assigned or used cannot be removed.')
  }
  return true
}

function validDocumentId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

function validateSessionWindow(input = {}) {
  const { packetId, teamId = null, opensAtMs, closesAtMs } = input
  if (!validDocumentId(packetId) || (teamId !== null && !validDocumentId(teamId))
    || !Number.isFinite(opensAtMs) || !Number.isFinite(closesAtMs) || closesAtMs <= opensAtMs) {
    throw examError('invalid-argument', 'Packet, optional team, and a valid opening/closing window are required.')
  }
  return { packetId, teamId, opensAtMs, closesAtMs }
}

function assertTeamSession(existingSessionId, requestedSessionId) {
  if (existingSessionId && existingSessionId !== requestedSessionId) {
    throw examError('failed-precondition', 'A team can be assigned to only one exam session.')
  }
  return true
}

async function assignExamSession(db, auth, input = {}) {
  assertExamAdmin(auth)
  const { packetId, teamId, opensAtMs, closesAtMs } = validateSessionWindow(input)
  const sessionId = input.sessionId || db.collection('SC_ExamSessions').doc().id
  if (!validDocumentId(sessionId)) throw examError('invalid-argument', 'Invalid exam session ID.')

  const packetRef = db.collection('SC_ExamPackets').doc(packetId)
  const sessionRef = db.collection('SC_ExamSessions').doc(sessionId)
  const assignmentRef = teamId ? db.collection('SC_ExamAssignments').doc(teamId) : null
  const teamRef = teamId ? db.collection('Team').doc(teamId) : null

  await db.runTransaction(async (transaction) => {
    const packet = await transaction.get(packetRef)
    const session = await transaction.get(sessionRef)
    const team = teamRef ? await transaction.get(teamRef) : null
    const assignment = assignmentRef ? await transaction.get(assignmentRef) : null
    const attempt = teamId ? await transaction.get(db.collection('SC_ExamAttempts').doc(teamId)) : null
    if (!packet.exists) throw examError('not-found', 'Packet not found.')
    if (teamRef && (!team.exists || team.data().competition !== 'smart competition')) {
      throw examError('not-found', 'Registered Smart Competition team not found.')
    }

    const previous = session.exists ? session.data() : null
    if (previous?.teamId && previous.teamId !== teamId) {
      throw examError('failed-precondition', 'An assigned session cannot be moved to a different team.')
    }
    assertTeamSession(assignment?.exists ? assignment.data().sessionId : null, sessionId)
    // The export pairs an attempt's answers with the session's packet, so the two must not drift apart.
    if (previous && previous.packetId !== packetId && attempt?.exists) {
      throw examError('failed-precondition', 'The team has already started this exam, so its packet can no longer be changed.')
    }

    const now = new Date()
    const updated = {
      packetId, teamId, opensAt: new Date(opensAtMs), closesAt: new Date(closesAtMs),
      createdAt: previous?.createdAt || now, createdBy: previous?.createdBy || auth.uid,
      updatedAt: now, updatedBy: auth.uid
    }
    transaction.set(sessionRef, updated)
    transaction.set(packetRef, { assignedEver: true }, { merge: true })
    if (assignmentRef) transaction.set(assignmentRef, {
      sessionId, assignedAt: (assignment.exists && assignment.data().assignedAt) || now
    })
    transaction.create(sessionRef.collection('Events').doc(), {
      type: previous ? 'session_updated' : 'session_created',
      previous: previous ? { packetId: previous.packetId, teamId: previous.teamId, opensAt: previous.opensAt, closesAt: previous.closesAt } : null,
      current: { packetId, teamId, opensAt: updated.opensAt, closesAt: updated.closesAt },
      by: auth.uid, at: now
    })
  })

  return { sessionId }
}

function participantQuestion(question) {
  const { number, question: text, category, assets = [], formulaLatex = '' } = question
  return { number, question: text, category, assets, formulaLatex }
}

const { questionDurationMs, categoryForQuestion } = require('./domain')
const { validatePacketQuestions, parseListItems, gradeListAnswer, gradeCalculation } = require('./domain')
const { buildExamExportRows } = require('./export')
const PACKET_QUESTION_CATEGORIES = Array.from({ length: 30 }, (_, index) => ({
  number: index + 1, category: categoryForQuestion(index + 1)
}))

async function createExamPacket(db, auth, input = {}) {
  assertExamAdmin(auth)
  if (typeof input.packetName !== 'string' || !input.packetName.trim() || input.packetName.trim().length > 100) {
    throw examError('invalid-argument', 'Packet name is required and must be at most 100 characters.')
  }
  try { validatePacketQuestions(input.questions) } catch (error) {
    throw examError('invalid-argument', error.message)
  }
  for (const question of input.questions) {
    const assets = question.assets ?? []
    if (!Array.isArray(assets) || assets.length > 5
      || assets.some((path) => typeof path !== 'string'
        || !path.startsWith(`SC_ExamAssets/${auth.uid}/`)
        || !/^SC_ExamAssets\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]{1,120}$/.test(path))) {
      throw examError('invalid-argument', `Question ${question.number} has an invalid image asset reference.`)
    }
    if (question.category === 'List-Based') {
      try {
        const expected = parseListItems(question.answer)
        if (!expected.length || expected.some((item) => !item.trim())) throw new Error('Empty list item.')
      } catch {
        throw examError('invalid-argument', `Question ${question.number} requires a valid comma-separated list answer key.`)
      }
    }
    if (question.category === 'Calculation') {
      if (typeof question.tolerance !== 'number' || !Number.isFinite(question.tolerance) || question.tolerance < 0) {
        throw examError('invalid-argument', `Question ${question.number} requires a non-negative calculation tolerance.`)
      }
      try { gradeCalculation('', question.answer, question.tolerance) }
      catch { throw examError('invalid-argument', `Question ${question.number} requires a numeric answer key and valid tolerance.`) }
    }
  }

  const packetRef = db.collection('SC_ExamPackets').doc()
  const batch = db.batch()
  const now = new Date()
  batch.create(packetRef, {
    name: input.packetName.trim(), sourceType: input.sourceType === 'PDF' ? 'PDF' : 'CSV',
    questionCount: input.questions.length, assignedEver: false, usedEver: false,
    createdAt: now, createdBy: auth.uid
  })
  input.questions.forEach((question) => {
    batch.create(packetRef.collection('Questions').doc(String(question.number)), {
      number: question.number, question: question.question.trim(), category: question.category,
      assets: question.assets ?? [],
      formulaLatex: typeof question.formulaLatex === 'string' ? question.formulaLatex : ''
    })
    batch.create(packetRef.collection('AnswerKeys').doc(String(question.number)), {
      answer: question.answer, ...(question.category === 'Calculation' ? { tolerance: question.tolerance } : {})
    })
  })
  await batch.commit()
  return { packetId: packetRef.id }
}

async function listExamPackets(db, auth) {
  assertExamAdmin(auth)
  const snapshot = await db.collection('SC_ExamPackets').get()
  return { packets: snapshot.docs.map((doc) => ({ packetId: doc.id, ...doc.data() })) }
}

async function getAdminExamData(db, auth) {
  assertExamAdmin(auth)
  const [teams, sessions, packets, attempts] = await Promise.all([
    db.collection('Team').where('competition', '==', 'smart competition').get(),
    db.collection('SC_ExamSessions').get(),
    db.collection('SC_ExamPackets').get(),
    db.collection('SC_ExamAttempts').get()
  ])
  const sessionLogs = await Promise.all(sessions.docs.map((doc) => doc.ref.collection('Events').get()))
  const attemptLogs = await Promise.all(attempts.docs.map((doc) => doc.ref.collection('Events').get()))
  return {
    teams: teams.docs.map((doc) => {
      const team = doc.data()
      return {
        teamId: doc.id, teamName: team.teamName || '',
        leader: [team.leader?.firstName, team.leader?.lastName].filter(Boolean).join(' '),
        university: team.university || team.leader?.university || ''
      }
    }),
    sessions: sessions.docs.map((doc, index) => ({
      sessionId: doc.id, ...doc.data(),
      events: sessionLogs[index].docs.map((event) => ({ eventId: event.id, ...event.data() }))
    })),
    packets: packets.docs.map((doc) => ({ packetId: doc.id, ...doc.data() })),
    attempts: attempts.docs.map((doc, index) => ({
      teamId: doc.id, status: doc.data().status,
      completedThrough: doc.data().completedThrough || 0,
      submissionReason: doc.data().submissionReason || null,
      events: attemptLogs[index].docs.map((event) => ({ eventId: event.id, ...event.data() }))
    }))
  }
}

async function exportExamSubmissions(db, auth, input = {}) {
  assertExamAdmin(auth)
  if (!validDocumentId(input.sessionId)) throw examError('invalid-argument', 'A valid session ID is required.')
  const sessionSnap = await db.collection('SC_ExamSessions').doc(input.sessionId).get()
  if (!sessionSnap.exists) throw examError('not-found', 'Exam session not found.')
  const session = sessionSnap.data()
  if (!session.teamId) throw examError('failed-precondition', 'Assign a team before exporting submissions.')
  const packetRef = db.collection('SC_ExamPackets').doc(session.packetId)
  const [teamSnap, packetSnap, attemptSnap, questionSnap, keySnap] = await Promise.all([
    db.collection('Team').doc(session.teamId).get(), packetRef.get(),
    db.collection('SC_ExamAttempts').doc(session.teamId).get(),
    packetRef.collection('Questions').get(), packetRef.collection('AnswerKeys').get()
  ])
  if (!packetSnap.exists || !teamSnap.exists) throw examError('failed-precondition', 'Session records are incomplete.')
  const questions = questionSnap.docs.map((doc) => doc.data()).sort((a, b) => a.number - b.number)
  const answerKeys = Object.fromEntries(keySnap.docs.map((doc) => [Number(doc.id), doc.data()]))
  const team = { ...teamSnap.data(), teamId: session.teamId }
  const rows = buildExamExportRows({ team, packet: packetSnap.data(), questions, answerKeys, attempt: attemptSnap.exists ? attemptSnap.data() : {} })
  return { rows }
}

function timestampMs(value) {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value?.toMillis === 'function') return value.toMillis()
  return Number.NaN
}

async function getSystemAnswerKeys(packetRef) {
  const numbers = [26, 27, 28, 29, 30]
  const entries = await Promise.all(numbers.map(async (number) => [
    number, await packetRef.collection('AnswerKeys').doc(String(number)).get()
  ]))
  return Object.fromEntries(entries.filter(([, snap]) => snap.exists)
    .map(([number, snap]) => [number, snap.data()]))
}

async function getParticipantContext(db, auth, includeSystemKeys = false) {
  if (!auth) throw examError('unauthenticated', 'Sign-in required.')
  const teamId = auth.uid
  const [team, assignment] = await Promise.all([
    db.collection('Team').doc(teamId).get(), db.collection('SC_ExamAssignments').doc(teamId).get()
  ])
  assertTeamLeader(auth, teamId, team.exists ? team.data() : null)
  if (!assignment.exists) throw examError('not-found', 'No exam session is assigned to this team.')
  const sessionId = assignment.data().sessionId
  const sessionSnap = await db.collection('SC_ExamSessions').doc(sessionId).get()
  if (!sessionSnap.exists || sessionSnap.data().teamId !== teamId) {
    throw examError('failed-precondition', 'The assigned exam session is unavailable.')
  }
  const session = sessionSnap.data()
  const packetRef = db.collection('SC_ExamPackets').doc(session.packetId)
  const systemKeyNumbers = includeSystemKeys ? [26, 27, 28, 29, 30] : []
  const [packet, ...systemKeys] = await Promise.all([
    packetRef.get(), ...systemKeyNumbers.map((number) => packetRef.collection('AnswerKeys').doc(String(number)).get())
  ])
  if (!packet.exists || packet.data().questionCount !== 30) throw examError('failed-precondition', 'The assigned packet is unavailable.')
  return {
    teamId, sessionId, session, packetRef,
    opensAtMs: timestampMs(session.opensAt), closesAtMs: timestampMs(session.closesAt),
    questions: PACKET_QUESTION_CATEGORIES,
    answerKeys: Object.fromEntries(systemKeys.filter((snap) => snap.exists).map((snap, index) => [systemKeyNumbers[index], snap.data()]))
  }
}

async function participantState(context, attempt) {
  if (attempt.status !== 'in_progress') {
    return { status: 'submitted', submissionReason: attempt.submissionReason || 'submitted' }
  }
  const questionSnap = await context.packetRef.collection('Questions').doc(String(attempt.questionNumber)).get()
  if (!questionSnap.exists) throw examError('failed-precondition', 'The active question is unavailable.')
  const question = questionSnap.data()
  return {
    status: 'in_progress', sessionId: context.sessionId,
    questionNumber: attempt.questionNumber, questionCount: context.questions.length,
    question: participantQuestion(question), answer: attempt.drafts[attempt.questionNumber] ?? '',
    questionStartedAtMs: attempt.questionStartedAtMs,
    questionDeadlineMs: attempt.questionDeadlineMs,
    // Measured now, so time spent in transactions and reads is not handed back to the countdown.
    remainingMs: Math.max(0, attempt.questionDeadlineMs - Date.now()),
    closesAtMs: context.closesAtMs
  }
}

async function getParticipantExamState(db, auth, input = {}) {
  const context = await getParticipantContext(db, auth)
  const nowMs = Date.now()
  if (nowMs < context.opensAtMs) {
    return { status: 'scheduled', opensAtMs: context.opensAtMs, closesAtMs: context.closesAtMs }
  }

  const attemptRef = db.collection('SC_ExamAttempts').doc(context.teamId)
  const previousAttempt = await attemptRef.get()
  if (previousAttempt.exists && previousAttempt.data().questionNumber >= 26) {
    context.answerKeys = await getSystemAnswerKeys(context.packetRef)
  }
  const packetRef = context.packetRef
  const attempt = await db.runTransaction(async (transaction) => {
    const [attemptSnap, packetSnap] = await Promise.all([
      transaction.get(attemptRef), transaction.get(packetRef)
    ])
    if (!attemptSnap.exists) {
      if (nowMs >= context.closesAtMs) return null
      const initial = {
        teamId: context.teamId, sessionId: context.sessionId, status: 'in_progress',
        questionNumber: 1, questionStartedAtMs: nowMs, questionDeadlineMs: Math.min(
          nowMs + questionDurationMs(context.questions[0].category), context.closesAtMs
        ),
        lastActivityAtMs: nowMs, completedThrough: 0, drafts: {}, answers: {}, verdicts: {}, createdAt: new Date(nowMs)
      }
      transaction.create(attemptRef, initial)
      transaction.set(packetRef, { usedEver: true }, { merge: true })
      transaction.create(attemptRef.collection('Events').doc(), {
        type: 'started', at: new Date(nowMs), by: context.teamId
      })
      return initial
    }

    const previous = attemptSnap.data()
    if (previous.sessionId !== context.sessionId) throw examError('failed-precondition', 'This team has already used its exam session.')
    const next = reconcileAttempt({
      attempt: previous, questions: context.questions, answerKeys: context.answerKeys,
      nowMs, closesAtMs: context.closesAtMs
    })
    if (next.status === 'in_progress') next.lastActivityAtMs = nowMs
    transaction.set(attemptRef, next)
    if (next.status === 'submitted' && previous.status === 'in_progress') {
      transaction.create(attemptRef.collection('Events').doc(), {
        type: next.submissionReason, at: new Date(next.submittedAtMs), by: 'system'
      })
    } else if (input.resume === true && next.status === 'in_progress') {
      transaction.create(attemptRef.collection('Events').doc(), { type: 'resumed', at: new Date(nowMs), by: context.teamId })
    }
    return next
  })

  if (!attempt) return { status: 'closed', closesAtMs: context.closesAtMs }
  return participantState(context, attempt)
}

// For the team dashboard. It only reads: getParticipantExamState would start the attempt.
async function getParticipantExamSchedule(db, auth) {
  const context = await getParticipantContext(db, auth)
  const nowMs = Date.now()
  const { opensAtMs, closesAtMs } = context
  const snap = await db.collection('SC_ExamAttempts').doc(context.teamId).get()
  // Worked out in memory: an attempt that has run out may not have been finalised yet.
  const attempt = snap.exists
    ? reconcileAttempt({ attempt: snap.data(), questions: context.questions, nowMs, closesAtMs })
    : null
  let status
  if (attempt && attempt.status !== 'in_progress') status = 'submitted'
  else if (nowMs < opensAtMs) status = 'scheduled'
  else if (attempt) status = 'in_progress'
  else status = nowMs < closesAtMs ? 'open' : 'closed'
  return { status, opensAtMs, closesAtMs }
}

async function authorizeExamAssetAccess(db, auth, assetPath) {
  if (typeof assetPath !== 'string' || !/^SC_ExamAssets\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]{1,120}$/.test(assetPath)) {
    throw examError('invalid-argument', 'Invalid exam asset path.')
  }
  if (auth?.token?.ipfestRole === 'competition_manager'
    && auth?.token?.ipfestCompetition === 'smart competition') {
    const match = await db.collectionGroup('Questions').where('assets', 'array-contains', assetPath).limit(1).get()
    if (!match.empty) return assetPath
    throw examError('not-found', 'Exam asset not found.')
  }

  const context = await getParticipantContext(db, auth)
  const attempt = await db.collection('SC_ExamAttempts').doc(context.teamId).get()
  if (!attempt.exists || attempt.data().status !== 'in_progress') throw examError('permission-denied', 'Exam asset access is unavailable.')
  const number = attempt.data().questionNumber
  const question = await context.packetRef.collection('Questions').doc(String(number)).get()
  if (!question.exists || !question.data().assets?.includes(assetPath)) throw examError('permission-denied', 'Exam asset access is unavailable.')
  return assetPath
}

function validateParticipantAnswer(question, response) {
  if (typeof response !== 'string' || response.length > 20_000) {
    throw examError('invalid-argument', 'Answer must be text of at most 20,000 characters.')
  }
  if (question.category === 'Short Answer' && response.trim().split(/\s+/).filter(Boolean).length > 4) {
    throw examError('invalid-argument', 'Short Answer responses may contain at most four words.')
  }
}

async function saveParticipantDraft(db, auth, input = {}) {
  const context = await getParticipantContext(db, auth, input.questionNumber >= 26)
  const nowMs = Date.now()
  const requestedNumber = input.questionNumber
  const question = context.questions[requestedNumber - 1]
  if (!Number.isInteger(requestedNumber) || !question) throw examError('invalid-argument', 'Invalid question number.')
  validateParticipantAnswer(question, input.response)

  const attemptRef = db.collection('SC_ExamAttempts').doc(context.teamId)
  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(attemptRef)
    if (!snap.exists) throw examError('failed-precondition', 'Exam attempt has not started.')
    const current = snap.data()
    if (current.sessionId !== context.sessionId || current.status !== 'in_progress') {
      throw examError('failed-precondition', 'This exam attempt is closed.')
    }
    const next = reconcileAttempt({
      attempt: current, questions: context.questions, answerKeys: context.answerKeys,
      nowMs, closesAtMs: context.closesAtMs
    })
    if (next.questionNumber !== requestedNumber || next.status !== 'in_progress'
      || nowMs >= next.questionDeadlineMs) {
      if (next.status === 'in_progress') next.lastActivityAtMs = nowMs
      transaction.set(attemptRef, next)
      if (next.status === 'submitted') transaction.create(attemptRef.collection('Events').doc(), {
        type: next.submissionReason, at: new Date(next.submittedAtMs), by: 'system'
      })
      return false
    }
    next.drafts[requestedNumber] = input.response
    next.lastActivityAtMs = nowMs
    transaction.set(attemptRef, next)
    return true
  })
  return { saved: result }
}

async function advanceExamQuestion(db, auth, input = {}) {
  const context = await getParticipantContext(db, auth, input.questionNumber >= 26)
  const number = input.questionNumber
  const question = context.questions[number - 1]
  if (!Number.isInteger(number) || !question) throw examError('invalid-argument', 'Invalid question number.')
  validateParticipantAnswer(question, input.response ?? '')
  const nowMs = Date.now()
  const attemptRef = db.collection('SC_ExamAttempts').doc(context.teamId)
  const next = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(attemptRef)
    if (!snap.exists) throw examError('failed-precondition', 'Exam attempt has not started.')
    const current = snap.data()
    if (current.sessionId !== context.sessionId || current.status !== 'in_progress') {
      throw examError('failed-precondition', 'This exam attempt is closed.')
    }
    if (current.questionNumber !== number) throw examError('failed-precondition', 'Only the current question can be advanced.')
    const updated = advanceAttemptQuestion({
      attempt: current, questions: context.questions, answerKeys: context.answerKeys,
      response: input.response ?? current.drafts[number] ?? '', nowMs, closesAtMs: context.closesAtMs
    })
    if (updated.status === 'in_progress') updated.lastActivityAtMs = nowMs
    transaction.set(attemptRef, updated)
    if (updated.status === 'submitted') transaction.create(attemptRef.collection('Events').doc(), {
      type: updated.submissionReason, at: new Date(updated.submittedAtMs), by: context.teamId
    })
    return updated
  })
  return participantState(context, next)
}

async function submitExam(db, auth, input = {}) {
  const context = await getParticipantContext(db, auth)
  const attempt = await db.collection('SC_ExamAttempts').doc(context.teamId).get()
  if (!attempt.exists || attempt.data().questionNumber !== context.questions.length) {
    throw examError('failed-precondition', 'The exam can be submitted after the final question only.')
  }
  return advanceExamQuestion(db, auth, { ...input, questionNumber: context.questions.length })
}

async function finalizeExpiredExamAttempts(db) {
  const nowMs = Date.now()
  const active = await db.collection('SC_ExamAttempts').where('status', '==', 'in_progress').get()
  let changedCount = 0
  for (const doc of active.docs) {
    const attempt = doc.data()
    const sessionSnap = await db.collection('SC_ExamSessions').doc(attempt.sessionId).get()
    if (!sessionSnap.exists) continue
    const closesAtMs = timestampMs(sessionSnap.data().closesAt)
    if (nowMs < closesAtMs && nowMs < attempt.questionDeadlineMs
      && nowMs < attempt.lastActivityAtMs + 180_000) continue

    const packetRef = db.collection('SC_ExamPackets').doc(sessionSnap.data().packetId)
    const answerKeys = attempt.questionNumber >= 26 ? await getSystemAnswerKeys(packetRef) : {}
    const questionList = PACKET_QUESTION_CATEGORIES
    const attemptRef = doc.ref
    const changed = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(attemptRef)
      if (!fresh.exists || fresh.data().status !== 'in_progress') return false
      const current = fresh.data()
      const next = reconcileAttempt({ attempt: current, questions: questionList, answerKeys, nowMs, closesAtMs })
      if (next.questionNumber === current.questionNumber && next.status === current.status
        && JSON.stringify(next.answers) === JSON.stringify(current.answers)) return false
      transaction.set(attemptRef, next)
      if (next.status === 'submitted') transaction.create(attemptRef.collection('Events').doc(), {
        type: next.submissionReason, at: new Date(next.submittedAtMs), by: 'system'
      })
      return true
    })
    if (changed) changedCount += 1
  }
  return { updated: changedCount }
}

async function getAdminExamPacket(db, auth, packetId) {
  assertExamAdmin(auth)
  if (typeof packetId !== 'string') throw examError('invalid-argument', 'Packet ID is required.')
  const packetRef = db.collection('SC_ExamPackets').doc(packetId)
  const [packet, questions, keys] = await Promise.all([
    packetRef.get(), packetRef.collection('Questions').orderBy('number').get(),
    packetRef.collection('AnswerKeys').get()
  ])
  if (!packet.exists) throw examError('not-found', 'Packet not found.')
  const keyByNumber = new Map(keys.docs.map((doc) => [Number(doc.id), doc.data()]))
  return {
    packetId,
    ...packet.data(),
    questions: questions.docs.map((doc) => ({ ...doc.data(), ...keyByNumber.get(Number(doc.id)) }))
  }
}

async function removeExamPacket(db, auth, packetId) {
  assertExamAdmin(auth)
  if (typeof packetId !== 'string') throw examError('invalid-argument', 'Packet ID is required.')
  const packetRef = db.collection('SC_ExamPackets').doc(packetId)
  await db.runTransaction(async (transaction) => {
    const packet = await transaction.get(packetRef)
    if (!packet.exists) throw examError('not-found', 'Packet not found.')
    assertPacketRemovable(packet.data())
    transaction.delete(packetRef)
  })
  const [questions, keys] = await Promise.all([
    packetRef.collection('Questions').get(), packetRef.collection('AnswerKeys').get()
  ])
  const childDocs = [...questions.docs, ...keys.docs]
  if (childDocs.length) {
    const batch = db.batch()
    for (const doc of childDocs) batch.delete(doc.ref)
    await batch.commit()
  }
  return { removed: true }
}

function saveCompletedAnswer(next, number, response, question, answerKeys) {
  next.answers[number] = response
  if (question.category === 'List-Based' && answerKeys[number]) {
    next.verdicts[number] = gradeListAnswer(response, answerKeys[number].answer).verdict
  }
  if (question.category === 'Calculation' && answerKeys[number]) {
    next.verdicts[number] = gradeCalculation(
      response, answerKeys[number].answer, answerKeys[number].tolerance
    ).verdict
  }
  next.completedThrough = number
}

function reconcileAttempt({ attempt, questions, answerKeys = {}, nowMs, closesAtMs }) {
  const next = {
    ...attempt, drafts: { ...attempt.drafts }, answers: { ...attempt.answers },
    verdicts: { ...attempt.verdicts }
  }
  if (next.status !== 'in_progress') return next

  // After a reconnect cutoff, replay only up to the cutoff, so the result does not depend on
  // whether a scheduled check happened to run while the team was away.
  const cutoffAtMs = next.lastActivityAtMs + 180_000
  const cutOff = nowMs >= cutoffAtMs && cutoffAtMs <= closesAtMs
  const asOfMs = cutOff ? cutoffAtMs : nowMs

  while (next.status === 'in_progress') {
    const number = next.questionNumber
    const question = questions[number - 1]
    const deadline = next.questionStartedAtMs + questionDurationMs(question.category)

    if (!cutOff && nowMs >= closesAtMs) {
      saveCompletedAnswer(next, number, next.drafts[number] ?? '', question, answerKeys)
      next.status = 'submitted'
      next.submissionReason = 'session_closed'
      next.submittedAtMs = closesAtMs
      return next
    }

    if (asOfMs < deadline) {
      if (cutOff) break
      next.questionDeadlineMs = Math.min(deadline, closesAtMs)
      return next
    }

    saveCompletedAnswer(next, number, next.drafts[number] ?? '', question, answerKeys)
    delete next.drafts[number]
    if (number === questions.length) {
      next.status = 'submitted'
      next.submissionReason = 'exam_complete'
      next.submittedAtMs = deadline
      return next
    }
    next.questionNumber += 1
    next.questionStartedAtMs = deadline
  }

  next.status = 'submitted'
  next.submissionReason = 'reconnect_cutoff'
  next.submittedAtMs = cutoffAtMs
  next.completedThrough = next.questionNumber - 1
  delete next.drafts[next.questionNumber]
  return next
}

function advanceAttemptQuestion({ attempt, questions, answerKeys = {}, response, nowMs, closesAtMs }) {
  if (attempt.status !== 'in_progress') throw examError('failed-precondition', 'This exam attempt is already closed.')
  const next = reconcileAttempt({ attempt, questions, answerKeys, nowMs, closesAtMs })
  if (next.status !== 'in_progress') return next
  if (next.questionNumber !== attempt.questionNumber) return next
  if (typeof response !== 'string') throw examError('invalid-argument', 'Answer must be text.')

  const number = next.questionNumber
  saveCompletedAnswer(next, number, response, questions[number - 1], answerKeys)
  delete next.drafts[number]
  if (number === questions.length) {
    next.status = 'submitted'
    next.submissionReason = 'exam_complete'
    next.submittedAtMs = nowMs
    return next
  }
  next.questionNumber += 1
  next.questionStartedAtMs = nowMs
  next.questionDeadlineMs = Math.min(nowMs + questionDurationMs(questions[number].category), closesAtMs)
  next.lastActivityAtMs = nowMs
  return next
}

module.exports = {
  assertExamAdmin, assertTeamLeader, assertPacketRemovable, participantQuestion,
  reconcileAttempt, advanceAttemptQuestion, validateSessionWindow, assertTeamSession,
  createExamPacket, listExamPackets, getAdminExamPacket, removeExamPacket, assignExamSession,
  getAdminExamData, exportExamSubmissions, getParticipantExamState, saveParticipantDraft, advanceExamQuestion, submitExam,
  authorizeExamAssetAccess, finalizeExpiredExamAttempts, participantState, getParticipantExamSchedule
}
