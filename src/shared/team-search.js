// Text the admin search looks through: team, leader and every member.
// Phone numbers are also indexed as digits only, so "0812" finds "0812-3456" and "+62 812".
export function teamSearchText(team, competitionLabel = '') {
  const people = [team?.leader || {}, ...(Array.isArray(team?.members) ? team.members : [])]
  const phoneDigits = (phone) => {
    const digits = String(phone ?? '').replace(/\D/g, '')
    return digits.startsWith('62') ? [digits, `0${digits.slice(2)}`] : [digits]
  }
  return [
    team?.teamName, team?.leader?.university, competitionLabel,
    ...people.flatMap((p) => [p?.firstName, p?.lastName, p?.email, p?.phoneNo, p?.studentId, ...phoneDigits(p?.phoneNo)])
  ].filter(Boolean).join(' ').toLowerCase()
}

// Every word in the query must appear somewhere, in any order.
export function matchesSearch(text, query) {
  const words = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  return words.every((word) => text.includes(word))
}
