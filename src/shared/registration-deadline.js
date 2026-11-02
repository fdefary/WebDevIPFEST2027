const SMART_COMPETITION_DEADLINE = Date.parse('2026-12-08T23:59:00+07:00');

export function isRegistrationOpen(competition, value = new Date()) {
  if (competition !== 'smart competition') return true;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) && time < SMART_COMPETITION_DEADLINE;
}
