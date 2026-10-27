const STAFF = {
  'bcc.ipfest2027@gmail.com': ['competition_manager', 'business case'],
  'gdpc.ipfest2027@gmail.com': ['competition_manager', 'geothermal development plan'],
  'mic.ipfest2027@gmail.com': ['competition_manager', 'mud inovation'],
  'ordc.ipfest2027@gmail.com': ['competition_manager', 'oil rig design'],
  'podc.ipfest2027@gmail.com': ['competition_manager', 'plan of development'],
  'ppc.ipfest2027@gmail.com': ['competition_manager', 'paper and poster'],
  'sc.ipfest2027@gmail.com': ['competition_manager', 'smart competition'],
  'wdc.ipfest2027@gmail.com': ['competition_manager', 'well design'],
  'hc.ipfest2027@gmail.com': ['competition_manager', 'hackaton'],
  'treasury.ipfest2027@gmail.com': ['treasury'],
  'officialdelegates.ipfest2027@gmail.com': ['delegates_relation'],
  'entrepreneurship.ipfest2026@gmail.com': ['merch_manager'],
  'event@ipfest2026.com': ['event_staff']
}

function resolveRoleClaims(email) {
  const assignment = STAFF[String(email || '').trim().toLowerCase()]
  return assignment ? Object.fromEntries([['ipfestRole', assignment[0]], ...(assignment[1] ? [['ipfestCompetition', assignment[1]]] : [])]) : null
}

function mergeRoleClaims(existing = {}, assigned) {
  const claims = { ...existing }
  delete claims.ipfestRole
  delete claims.ipfestCompetition
  return assigned ? { ...claims, ...assigned } : claims
}

module.exports = { resolveRoleClaims, mergeRoleClaims, STAFF }
