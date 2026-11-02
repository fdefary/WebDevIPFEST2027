const { createHash } = require('node:crypto')

const RELEASES = {
  preliminary: Date.parse('2026-12-05T00:00:00+07:00'),
  final: Date.parse('2027-01-20T00:00:00+07:00')
}
const INFO_DOCS = {
  'business case': 'TKNSFPMRQ6GGLdVurLCv', 'geothermal development plan': 'u5XFl4812coW1J6yMqrm',
  'mud inovation': 'pHlZbe6UyXpKpO35LInb', 'oil rig design': 'yRP8ZxRSXbIlJx0vcoO3',
  'plan of development': 'G9gLvFCkxiviK2UDc5qX', 'paper and poster': 'BzdUKfPbIbyRYlLJmk1c',
  'well design': 'YgdwqPY6IIhqSDY45UMH', 'hackaton': '6gRhBNQ5yjBMg1tbK66d'
}
function assertPaymentUpdates(updates) {
  if (!Array.isArray(updates) || !updates.length || updates.length > 450 || updates.some((update) =>
    !update || typeof update !== 'object' || !validTeamId(update.teamId) || !['registration', 'final'].includes(update.kind)
    || !(update.kind === 'registration' ? ['pending_verification', 'verified'] : ['pending', 'down_payment_verified', 'verified']).includes(update.status))
    || new Set(updates.map((update) => update?.teamId)).size !== updates.length) {
    throw new Error('Invalid payment updates')
  }
}
function validTeamId(teamId) {
  return typeof teamId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(teamId)
}
function assertResult(field, value) {
  const valid = field === 'final' ? value === null || typeof value === 'boolean'
    : field === 'rank' ? value === null || Number.isInteger(value) && value >= 1 && value <= 10000
    : field === 'score' ? value === null || typeof value === 'number' && value >= 0 && value <= 250
    : false
  if (!valid) throw new Error('Invalid result')
}
function assertCase({ role, competition, stage, path, now = Date.now() }) {
  if (role !== 'competition_manager' || !INFO_DOCS[competition] || !['preliminary', 'final'].includes(stage)
    || !Number.isFinite(now) || now < RELEASES[stage] || typeof path !== 'string'
    || !path.startsWith(`Case/${competition}/`) || path.length > 1024 || path.includes('..')) throw new Error('Invalid case release')
  return INFO_DOCS[competition]
}
function certificateId(event, attendeeId) {
  if (!['Career_Talk', 'Grand_IPCONVEX'].includes(event) || typeof attendeeId !== 'string' || !/^[^/]{1,254}$/.test(attendeeId)) throw new Error('Invalid attendance source')
  const digest = createHash('sha256').update(`${event}\0${attendeeId}`).digest('hex')
  return `${event}_${digest}`
}
function validateCertificateAttendance(data) {
  const name = data?.full_name ?? data?.name
  const checkedIn = data?.checkin?.toDate?.()?.getTime()
  const checkedOut = data?.checkout?.toDate?.()?.getTime()
  if (typeof name !== 'string' || !name.trim() || name.length > 120
    || typeof data?.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    || !Number.isFinite(checkedIn) || !Number.isFinite(checkedOut) || checkedOut - checkedIn < 2.5 * 60 * 60 * 1000) {
    throw new Error('Attendance is not certificate-eligible')
  }
  return { name: name.trim(), email: data.email.trim() }
}
module.exports = { assertPaymentUpdates, assertResult, assertCase, validTeamId, certificateId, validateCertificateAttendance, INFO_DOCS, RELEASES }
