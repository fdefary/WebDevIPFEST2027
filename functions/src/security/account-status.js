const { validTeamId } = require('./security-policy')

// Auth getUsers() accepts at most 100 identifiers per call.
const AUTH_LOOKUP_BATCH = 100
const MAX_TEAM_IDS = 1000

// A Team document ID is the leader's Auth UID, so the IDs double as account lookups.
function assertTeamIds(teamIds) {
  if (!Array.isArray(teamIds) || teamIds.length === 0 || teamIds.length > MAX_TEAM_IDS
    || !teamIds.every(validTeamId) || new Set(teamIds).size !== teamIds.length) {
    throw new Error('Invalid team IDs')
  }
}

function chunk(items, size = AUTH_LOOKUP_BATCH) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// Return only what the panel shows, never the full Auth record.
function summarizeAccounts(teamIds, users) {
  const byUid = new Map(users.map((user) => [user.uid, user]))
  return Object.fromEntries(teamIds.map((uid) => {
    const user = byUid.get(uid)
    return [uid, user ? {
      exists: true,
      emailVerified: Boolean(user.emailVerified),
      lastSignInAt: user.metadata?.lastSignInTime || null
    } : { exists: false, emailVerified: false, lastSignInAt: null }]
  }))
}

module.exports = { assertTeamIds, chunk, summarizeAccounts, AUTH_LOOKUP_BATCH, MAX_TEAM_IDS }
