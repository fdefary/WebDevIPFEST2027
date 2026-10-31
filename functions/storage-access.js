const TEAM_FILE_ROOTS = new Set([
  'team', 'payments', 'preliminary_submissions', 'final_submissions', 'finalreg_submissions'
])
const PAYMENT_PROOF_ROOTS = new Set(['payments', 'finalreg_submissions'])
const PARTICIPANT_DOCUMENTS = new Set(['student_card.jpg', 'twibbon.jpg', 'follow_ig.jpg'])
const TEAM_DOCUMENT_SUFFIXES = ['StudentID', 'Twibbon', 'Follow', 'AddToStory', 'LikeRepost']

function isTeamRegistrationDocument(path) {
  const parts = path.split('/')
  return parts.length === 4
    && parts[0] === 'team'
    && parts[2] === 'documents'
    && TEAM_DOCUMENT_SUFFIXES.some(suffix => parts[3].endsWith(`_${suffix}.pdf`))
}

function validPath(path) {
  return typeof path === 'string'
    && path.length > 0
    && path.length <= 1024
    && !path.startsWith('/')
    && !/[\\\u0000-\u001f]/.test(path)
    && !/%(?:2f|5c|2e)/i.test(path)
    && path.split('/').every((part) => part && part !== '.' && part !== '..')
}

async function authorizeStoragePath(user, path, teamLookup) {
  if (!user?.uid || !validPath(path) || typeof teamLookup !== 'function') return false
  const parts = path.split('/')
  const root = parts[0]

  if (root === 'team' && parts[2] === 'documents') {
    if (!isTeamRegistrationDocument(path)) return false
    const ownerUid = parts[1]
    if (user.uid === ownerUid) return true
    if (!['competition_manager', 'delegates_relation'].includes(user.role)) return false
    const team = await teamLookup(ownerUid)
    if (!team) return false
    return user.role === 'delegates_relation' || user.competition === team.competition
  }

  if (PAYMENT_PROOF_ROOTS.has(root) && parts.length >= 3) {
    if (user.uid === parts[1]) return true
    if (user.role !== 'treasury') return false
    return Boolean(await teamLookup(parts[1]))
  }

  if (root === 'team' && (user.role === 'delegates_relation' || user.role === 'treasury')) {
    if (parts.length !== 4) return false
    const allowedFiles = user.role === 'treasury' ? PARTICIPANT_DOCUMENTS : new Set(['student_card.jpg'])
    if (!allowedFiles.has(parts[3])) return false
    const team = await teamLookup(parts[1])
    if (!team) return false
    if (parts[2] === 'leader') return Boolean(team.leader)
    const memberIndex = Number(parts[2].match(/^member([1-9]\d*)$/)?.[1])
    return Number.isInteger(memberIndex) && memberIndex <= (team.members?.length ?? 0) && Boolean(team.members[memberIndex - 1])
  }

  if (TEAM_FILE_ROOTS.has(root) && parts.length >= 3) {
    const ownerUid = parts[1]
    if (user.uid === ownerUid) return true
    const team = await teamLookup(ownerUid)
    const managerCompetition = user.role === 'competition_manager' ? user.competition : null
    return Boolean(team && managerCompetition && managerCompetition === team.competition)
  }

  if (root === 'Case' && parts.length >= 3) {
    const competition = parts[1]
    const managerCompetition = user.role === 'competition_manager' ? user.competition : null
    if (managerCompetition === competition) return true
    const team = await teamLookup(user.uid)
    return Boolean(team && team.competition === competition)
  }

  return false
}

function signedReadOptions(now = Date.now()) {
  return {
    action: 'read',
    expires: new Date(now + 5 * 60 * 1000),
    version: 'v4'
  }
}

module.exports = { authorizeStoragePath, signedReadOptions }
