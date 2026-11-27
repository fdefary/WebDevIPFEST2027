const PROJECT_ID = 'demo-ipfest-local'
const PORTS = { auth: 39099, firestore: 39180, storage: 39199 }
const credentials = {
  admin: { uid: 'local-sc-admin', email: 'exam-admin@local.test', password: 'LocalExamAdmin123!' },
  leader: { uid: 'sc-demo-team', email: 'exam-leader@local.test', password: 'LocalExamLeader123!' }
}
// These have no exam session: assign them one in the admin page.
const extraTeams = [2, 3].map((number) => ({
  teamName: `Local Demo Team ${number}`,
  user: { uid: `sc-demo-team-${number}`, email: `exam-leader${number}@local.test`, password: credentials.leader.password }
}))

process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIREBASE_AUTH_EMULATOR_HOST = `127.0.0.1:${PORTS.auth}`
process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${PORTS.firestore}`
process.env.FIREBASE_STORAGE_EMULATOR_HOST = `127.0.0.1:${PORTS.storage}`

const admin = require('firebase-admin')
admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` })

async function ensureUser(user, claims = {}) {
  let record
  try {
    record = await admin.auth().getUserByEmail(user.email)
    record = await admin.auth().updateUser(record.uid, { password: user.password, emailVerified: true })
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
    record = await admin.auth().createUser({ ...user, emailVerified: true })
  }
  await admin.auth().setCustomUserClaims(record.uid, claims)
  return record
}

async function main() {
  const manager = await ensureUser(credentials.admin, {
    ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition'
  })
  const leader = await ensureUser(credentials.leader)
  const db = admin.firestore()
  const now = Date.now()
  const teamId = leader.uid
  const packetId = 'local-demo-packet'
  const sessionId = 'local-demo-session'
  const teams = [{ id: teamId, teamName: 'Local Demo Team' }]
  for (const { user, teamName } of extraTeams) teams.push({ id: (await ensureUser(user)).uid, teamName })
  const resetBatch = db.batch()
  for (const { id } of teams) {
    const attemptRef = db.doc(`SC_ExamAttempts/${id}`)
    const oldEvents = await attemptRef.collection('Events').get()
    oldEvents.docs.forEach((event) => resetBatch.delete(event.ref))
    resetBatch.delete(attemptRef)
  }
  await resetBatch.commit()
  const categories = [
    ...Array(20).fill('Short Answer'), ...Array(5).fill('Long Answer'),
    ...Array(3).fill('List-Based'), ...Array(2).fill('Calculation')
  ]

  await Promise.all([
    ...teams.map(({ id, teamName }) => db.doc(`Team/${id}`).set({
      competition: 'smart competition', teamName, university: 'Local Test University',
      leader: { firstName: 'Local', lastName: 'Leader', university: 'Local Test University' }, members: []
    })),
    db.doc(`SC_ExamAssignments/${teamId}`).set({ sessionId, assignedAt: new Date(now) })
  ])

  const packetRef = db.doc(`SC_ExamPackets/${packetId}`)
  await packetRef.set({
    name: 'Local Demo Packet', sourceType: 'Seed', questionCount: 30,
    assignedEver: true, usedEver: false, createdAt: new Date(now), createdBy: manager.uid
  })
  await db.doc(`SC_ExamSessions/${sessionId}`).set({
    packetId, teamId, opensAt: new Date(now - 60_000), closesAt: new Date(now + 30 * 60_000),
    createdAt: new Date(now), createdBy: manager.uid, updatedAt: new Date(now), updatedBy: manager.uid
  })

  const batch = db.batch()
  categories.forEach((category, index) => {
    const number = index + 1
    const questionRef = packetRef.collection('Questions').doc(String(number))
    const answerRef = packetRef.collection('AnswerKeys').doc(String(number))
    batch.set(questionRef, {
      number, category, question: `Local test question ${number} (${category})`, assets: [], formulaLatex: ''
    })
    const answer = category === 'List-Based' ? 'alpha, beta'
      : category === 'Calculation' ? '100 m'
        : `Local answer ${number}`
    batch.set(answerRef, {
      answer, ...(category === 'Calculation' ? { tolerance: 0.5 } : {})
    })
  })
  await batch.commit()

  console.log(`Seeded ${PROJECT_ID} only.`)
  console.log(`Admin: ${credentials.admin.email} / ${credentials.admin.password}`)
  console.log(`Team leader: ${credentials.leader.email} / ${credentials.leader.password}`)
  for (const { user, teamName } of extraTeams) console.log(`${teamName} (no session yet): ${user.email} / ${user.password}`)
  console.log(`Exam URL: http://localhost:9000/dashboard/smart-competition/loginsc.html`)
}

main().catch((error) => {
  console.error('Could not seed the local exam emulators:', error.message)
  process.exitCode = 1
}).finally(() => admin.app().delete())
