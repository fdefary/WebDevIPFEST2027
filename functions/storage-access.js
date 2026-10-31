const TEAM_FILE_ROOTS = new Set([
  'team', 'payments', 'preliminary_submissions', 'final_submissions', 'finalreg_submissions'
])

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

  if (root === 'team' && user.role === 'delegates_relation') {
    if (parts.length !== 4 || parts[3] !== 'student_card.jpg') return false
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
