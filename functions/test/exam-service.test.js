const test = require('node:test')
const assert = require('node:assert/strict')
const { Firestore } = require('firebase-admin/firestore')
const {
  assertExamAdmin,
  assertTeamLeader,
  assertPacketRemovable,
  participantQuestion,
  reconcileAttempt,
  advanceAttemptQuestion,
  validateSessionWindow,
  assertTeamSession,
  createExamPacket,
  assignExamSession,
  getAdminExamData,
  getParticipantExamState,
  saveParticipantDraft,
  advanceExamQuestion,
  removeExamPacket,
  participantState,
  getParticipantExamSchedule
} = require('../src/exam/service')

test('allows only the Smart Competition manager claims', () => {
  assert.equal(assertExamAdmin({ uid: 'manager', token: {
    ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition'
  } }), true)
  assert.throws(() => assertExamAdmin(null), { code: 'unauthenticated' })
  assert.throws(() => assertExamAdmin({ uid: 'manager', token: {
    ipfestRole: 'competition_manager', ipfestCompetition: 'business case'
  } }), { code: 'permission-denied' })
})

test('requires the authenticated registered Smart Competition team leader', () => {
  const team = { competition: 'smart competition' }
  assert.equal(assertTeamLeader({ uid: 'team-1' }, 'team-1', team), true)
  assert.throws(() => assertTeamLeader({ uid: 'member' }, 'team-1', team), { code: 'permission-denied' })
  assert.throws(() => assertTeamLeader({ uid: 'team-1' }, 'team-1', { competition: 'business case' }), { code: 'permission-denied' })
  assert.throws(() => assertTeamLeader({ uid: 'team-1' }, 'team-1', null), { code: 'not-found' })
})

test('prevents deleting a packet that has ever been assigned or used', () => {
  assert.equal(assertPacketRemovable({ assignedEver: false, usedEver: false }), true)
  assert.throws(() => assertPacketRemovable({ assignedEver: true, usedEver: false }), { code: 'failed-precondition' })
  assert.throws(() => assertPacketRemovable({ assignedEver: false, usedEver: true }), { code: 'failed-precondition' })
})

test('removal rechecks packet assignment atomically before deleting it', async () => {
  const manager = { uid: 'manager', token: { ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition' } }
  let transactionRead = false
  const packetRef = {
    get: async () => ({ exists: true, data: () => ({ assignedEver: false, usedEver: false }) }),
    collection: () => ({ get: async () => ({ docs: [] }) })
  }
  const db = {
    collection: () => ({ doc: () => packetRef }),
    runTransaction: async (operation) => operation({
      get: async () => {
        transactionRead = true
        return { exists: true, data: () => ({ assignedEver: true, usedEver: false }) }
      },
      delete: () => {}
    }),
    batch: () => ({ delete() {}, commit: async () => {} })
  }
  await assert.rejects(removeExamPacket(db, manager, 'packet-1'), { code: 'failed-precondition' })
  assert.equal(transactionRead, true)
})

test('returns only participant-safe question fields', () => {
  assert.deepEqual(participantQuestion({
    number: 1, question: 'Question', category: 'Short Answer', assets: [], formulaLatex: 'x',
    answer: 'secret key', tolerance: 1, createdBy: 'admin'
  }), { number: 1, question: 'Question', category: 'Short Answer', assets: [], formulaLatex: 'x' })
})

const questions = [
  { number: 1, category: 'Short Answer' },
  { number: 2, category: 'Long Answer' },
  { number: 3, category: 'Calculation' }
]

function attempt(overrides = {}) {
  return {
    status: 'in_progress', questionNumber: 1, questionStartedAtMs: 1000,
    lastActivityAtMs: 1000, drafts: {}, answers: {}, ...overrides
  }
}

function packetWithoutTolerance() {
  const categories = [
    ...Array(20).fill('Short Answer'), ...Array(5).fill('Long Answer'),
    ...Array(3).fill('List-Based'), ...Array(2).fill('Calculation')
  ]
  return categories.map((category, index) => ({
    number: index + 1, question: `Question ${index + 1}`, answer: `Answer ${index + 1}`, category
  }))
}

test('advances expired questions from server time and submits the last timeout answer or blank', () => {
  const started = attempt({ drafts: { 1: 'saved answer' } })
  const afterFirst = reconcileAttempt({ attempt: started, questions, nowMs: 15000, closesAtMs: 999999 })
  assert.equal(afterFirst.questionNumber, 2)
  assert.equal(afterFirst.answers[1], 'saved answer')

  const afterSecond = reconcileAttempt({ attempt: afterFirst, questions, nowMs: 40000, closesAtMs: 999999 })
  assert.equal(afterSecond.questionNumber, 3)
  assert.equal(afterSecond.answers[2], '')
})

test('finalizes at the three-minute reconnect cutoff and at the session close', () => {
  const cutoff = reconcileAttempt({
    attempt: attempt(), questions: packetWithoutTolerance(), nowMs: 181000, closesAtMs: 999999
  })
  assert.equal(cutoff.status, 'submitted')
  assert.equal(cutoff.submissionReason, 'reconnect_cutoff')
  assert.equal(cutoff.completedThrough, 12)

  const closing = reconcileAttempt({
    attempt: attempt({ drafts: { 1: 'last answer' } }), questions, nowMs: 11000, closesAtMs: 11000
  })
  assert.equal(closing.status, 'submitted')
  assert.equal(closing.submissionReason, 'session_closed')
  assert.equal(closing.answers[1], 'last answer')

  const closeAdvance = advanceAttemptQuestion({
    attempt: attempt({ drafts: { 1: 'last answer' } }), questions,
    response: 'late client answer', nowMs: 11000, closesAtMs: 11000
  })
  assert.equal(closeAdvance.status, 'submitted')
  assert.equal(closeAdvance.answers[1], 'last answer')
})

test('gives the same cutoff result whether or not the scheduled check ran first', () => {
  const full = packetWithoutTolerance()
  const started = attempt({ drafts: { 1: 'my answer' } })
  const swept = reconcileAttempt({
    attempt: reconcileAttempt({ attempt: started, questions: full, nowMs: 60000, closesAtMs: 999999 }),
    questions: full, nowMs: 600000, closesAtMs: 999999
  })
  const unswept = reconcileAttempt({ attempt: started, questions: full, nowMs: 600000, closesAtMs: 999999 })
  const outcome = ({ status, submissionReason, submittedAtMs, completedThrough, answers, drafts }) =>
    ({ status, submissionReason, submittedAtMs, completedThrough, answers, drafts })
  assert.deepEqual(outcome(unswept), outcome(swept))
  assert.equal(unswept.answers[1], 'my answer')
  assert.equal(unswept.submissionReason, 'reconnect_cutoff')
  assert.equal(unswept.completedThrough, 12)
})

test('reports the time left when the reply is built, not when the request started', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 })
  const context = {
    sessionId: 'session-1', questions, closesAtMs: 999999,
    packetRef: { collection: () => ({ doc: () => ({ get: async () => {
      t.mock.timers.tick(400)
      return { exists: true, data: () => ({ number: 1, question: 'Question', category: 'Short Answer' }) }
    } }) }) }
  }
  const reply = await participantState(context, attempt({ questionDeadlineMs: 15000 }))
  assert.equal(reply.remainingMs, 13600)
})

test('locks completed questions and cannot advance a submitted attempt', () => {
  const started = attempt()
  const next = advanceAttemptQuestion({ attempt: started, questions, response: 'final answer', nowMs: 5000, closesAtMs: 999999 })
  assert.equal(next.questionNumber, 2)
  assert.equal(next.answers[1], 'final answer')
  assert.throws(() => advanceAttemptQuestion({ attempt: { ...next, status: 'submitted' }, questions, response: '', nowMs: 6000, closesAtMs: 999999 }), { code: 'failed-precondition' })
})

test('grades Calculation answers on the server when a question completes', () => {
  const calcAttempt = attempt({ questionNumber: 3, questionStartedAtMs: 1000, drafts: { 3: '10.5' } })
  const complete = reconcileAttempt({
    attempt: calcAttempt,
    questions,
    answerKeys: { 3: { answer: '10 m', tolerance: 0.5 } },
    nowMs: 61000,
    closesAtMs: 100000
  })
  assert.equal(complete.verdicts[3], 'Correct')
})

test('grades List-Based answers as unordered all-or-nothing sets on completion', () => {
  const listQuestions = [{ number: 1, category: 'List-Based' }]
  const listAttempt = attempt({ drafts: { 1: 'B, A' } })
  const complete = reconcileAttempt({
    attempt: listAttempt, questions: listQuestions,
    answerKeys: { 1: { answer: 'A, B' } }, nowMs: 26000, closesAtMs: 100000
  })
  assert.equal(complete.verdicts[1], 'Correct')
})

test('saves a session edit when the team assignment has no assignedAt time', async () => {
  const manager = { uid: 'manager', token: { ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition' } }
  const real = new Firestore({ projectId: 'demo-offline' })
  const batch = real.batch() // validates writes as Firestore does; it is never committed
  const records = {
    'SC_ExamPackets/packet-2': {},
    'Team/team-1': { competition: 'smart competition' },
    'SC_ExamSessions/session-1': { packetId: 'packet-1', teamId: 'team-1', opensAt: new Date(1), closesAt: new Date(2) },
    'SC_ExamAssignments/team-1': { sessionId: 'session-1' }
  }
  const db = {
    collection: (name) => real.collection(name),
    runTransaction: (operation) => operation({
      get: async (ref) => ({ exists: ref.path in records, data: () => records[ref.path] }),
      set: (...args) => batch.set(...args),
      create: (...args) => batch.create(...args)
    })
  }
  assert.deepEqual(await assignExamSession(db, manager, {
    sessionId: 'session-1', packetId: 'packet-2', teamId: 'team-1', opensAtMs: 1000, closesAtMs: 2000
  }), { sessionId: 'session-1' })
})

// A database that can only be read: it has no way to write or to open a transaction.
function readOnlyDb(records) {
  const reference = (path) => ({
    get: async () => ({ exists: path in records, data: () => records[path] }),
    collection: (name) => ({ doc: (id) => reference(`${path}/${name}/${id}`) })
  })
  return { collection: (name) => ({ doc: (id) => reference(`${name}/${id}`) }) }
}

function scheduleRecords({ opensAt, closesAt, attemptRecord }) {
  return {
    'Team/team-1': { competition: 'smart competition' },
    'SC_ExamAssignments/team-1': { sessionId: 'session-1' },
    'SC_ExamSessions/session-1': { teamId: 'team-1', packetId: 'packet-1', opensAt: new Date(opensAt), closesAt: new Date(closesAt) },
    'SC_ExamPackets/packet-1': { questionCount: 30 },
    ...(attemptRecord ? { 'SC_ExamAttempts/team-1': { sessionId: 'session-1', drafts: {}, answers: {}, verdicts: {}, ...attemptRecord } } : {})
  }
}

test('reports the team exam schedule and state without starting or changing anything', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 })
  const running = { status: 'in_progress', questionNumber: 1, questionStartedAtMs: 95_000, lastActivityAtMs: 95_000 }
  const cases = [
    ['scheduled', { opensAt: 200_000, closesAt: 900_000 }],
    ['open', { opensAt: 50_000, closesAt: 900_000 }],
    ['closed', { opensAt: 10_000, closesAt: 90_000 }],
    ['in_progress', { opensAt: 50_000, closesAt: 900_000, attemptRecord: running }],
    ['submitted', { opensAt: 50_000, closesAt: 900_000, attemptRecord: { status: 'submitted' } }],
    // Still marked as running, but its window has ended and no scheduled check has finalised it yet.
    ['submitted', { opensAt: 50_000, closesAt: 99_000, attemptRecord: running }]
  ]
  for (const [expected, setup] of cases) {
    const reply = await getParticipantExamSchedule(readOnlyDb(scheduleRecords(setup)), { uid: 'team-1' })
    assert.deepEqual(reply, { status: expected, opensAtMs: setup.opensAt, closesAtMs: setup.closesAt })
  }
})

test('shows the exam schedule only to the assigned team leader', async () => {
  const records = scheduleRecords({ opensAt: 1, closesAt: 2 })
  await assert.rejects(getParticipantExamSchedule(readOnlyDb(records), null), { code: 'unauthenticated' })
  await assert.rejects(getParticipantExamSchedule(readOnlyDb(records), { uid: 'someone-else' }), { code: 'not-found' })
  delete records['SC_ExamAssignments/team-1']
  await assert.rejects(getParticipantExamSchedule(readOnlyDb(records), { uid: 'team-1' }), { code: 'not-found' })
})

// An in-memory database with transactions, enough for the session and draft operations.
function memoryDb(records) {
  let nextId = 0
  const written = []
  const reference = (path) => ({
    path,
    get: async () => ({ exists: path in records, data: () => records[path] }),
    collection: (name) => collection(`${path}/${name}`)
  })
  const collection = (name) => ({ doc: (id = `generated-${nextId += 1}`) => reference(`${name}/${id}`) })
  const put = (ref, value) => { records[ref.path] = value; written.push(ref.path) }
  return {
    records, written, collection,
    runTransaction: async (operation) => operation({ get: (ref) => ref.get(), set: put, create: put })
  }
}

const examAdminAuth = { uid: 'manager', token: { ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition' } }
const assignedRecords = (extra = {}) => ({
  'SC_ExamPackets/packet-1': { questionCount: 30 },
  'SC_ExamPackets/packet-2': { questionCount: 30 },
  'Team/team-1': { competition: 'smart competition' },
  'SC_ExamSessions/session-1': { packetId: 'packet-1', teamId: 'team-1', opensAt: new Date(1), closesAt: new Date(2) },
  'SC_ExamAssignments/team-1': { sessionId: 'session-1', assignedAt: new Date(1) },
  ...extra
})
const editSession = (db, packetId, closesAtMs = 5000) => assignExamSession(db, examAdminAuth,
  { sessionId: 'session-1', packetId, teamId: 'team-1', opensAtMs: 1000, closesAtMs })

test('allows the packet to change until the team starts its attempt', async () => {
  const db = memoryDb(assignedRecords())
  await editSession(db, 'packet-2')
  assert.equal(db.records['SC_ExamSessions/session-1'].packetId, 'packet-2')
})

test('blocks a packet change once the team has started, but still allows new times', async () => {
  const db = memoryDb(assignedRecords({ 'SC_ExamAttempts/team-1': { sessionId: 'session-1', status: 'submitted' } }))
  await assert.rejects(editSession(db, 'packet-2'), { code: 'failed-precondition', message: /already started.*packet/i })
  assert.deepEqual(db.written, [])
  await editSession(db, 'packet-1', 9000)
  assert.equal(db.records['SC_ExamSessions/session-1'].closesAt.getTime(), 9000)
})

test('records the cutoff when a late draft save is what discovers it', async () => {
  const now = Date.now()
  const db = memoryDb(assignedRecords({
    'SC_ExamSessions/session-1': { packetId: 'packet-1', teamId: 'team-1', opensAt: new Date(now - 600_000), closesAt: new Date(now + 600_000) },
    'SC_ExamAttempts/team-1': {
      sessionId: 'session-1', status: 'in_progress', questionNumber: 1, questionStartedAtMs: now - 200_000,
      questionDeadlineMs: now - 186_000, lastActivityAtMs: now - 200_000, completedThrough: 0, drafts: {}, answers: {}, verdicts: {}
    }
  }))
  assert.deepEqual(await saveParticipantDraft(db, { uid: 'team-1' }, { questionNumber: 1, response: 'late' }), { saved: false })
  const events = db.written.filter((path) => path.startsWith('SC_ExamAttempts/team-1/Events/')).map((path) => db.records[path].type)
  assert.deepEqual(events, ['reconnect_cutoff'])
})

test('accepts a draft session without a team and requires a valid access window', () => {
  assert.deepEqual(validateSessionWindow({
    packetId: 'packet-1', teamId: null, opensAtMs: 1000, closesAtMs: 2000
  }), { packetId: 'packet-1', teamId: null, opensAtMs: 1000, closesAtMs: 2000 })
  assert.throws(() => validateSessionWindow({
    packetId: 'packet-1', teamId: null, opensAtMs: 2000, closesAtMs: 1000
  }), { code: 'invalid-argument' })
  assert.throws(() => validateSessionWindow({
    packetId: '', teamId: null, opensAtMs: 1000, closesAtMs: 2000
  }), { code: 'invalid-argument' })
})

test('prevents one team from being assigned to multiple exam sessions', () => {
  assert.equal(assertTeamSession(null, 'session-1'), true)
  assert.equal(assertTeamSession('session-1', 'session-1'), true)
  assert.throws(() => assertTeamSession('session-1', 'session-2'), { code: 'failed-precondition' })
})

test('requires admin authorization and tolerances before creating an immutable packet', async () => {
  await assert.rejects(createExamPacket(null, null, {}), { code: 'unauthenticated' })
  const manager = { uid: 'manager', token: { ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition' } }
  const data = { packetName: 'Packet One', questions: packetWithoutTolerance() }
  await assert.rejects(createExamPacket(null, manager, data), /tolerance/i)
})

test('rejects invalid or unauthorized session assignments before accessing Firestore', async () => {
  await assert.rejects(assignExamSession(null, null, {}), { code: 'unauthenticated' })
  const manager = { uid: 'manager', token: { ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition' } }
  await assert.rejects(assignExamSession(null, manager, {
    packetId: 'packet-1', teamId: null, opensAtMs: 2000, closesAtMs: 1000
  }), { code: 'invalid-argument' })
})

test('requires Smart Competition admin authorization before loading dashboard records', async () => {
  await assert.rejects(getAdminExamData(null, null), { code: 'unauthenticated' })
})

test('requires a registered leader before any participant exam operation', async () => {
  await assert.rejects(getParticipantExamState(null, null), { code: 'unauthenticated' })
  await assert.rejects(saveParticipantDraft(null, null, {}), { code: 'unauthenticated' })
  await assert.rejects(advanceExamQuestion(null, null, {}), { code: 'unauthenticated' })
})
