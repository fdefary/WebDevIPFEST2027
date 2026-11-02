const NORMAL_START = Date.parse('2026-11-12T00:00:00+07:00');
const LATE_START = Date.parse('2026-12-05T00:00:00+07:00');
const REGISTRATION_CLOSE = Date.parse('2026-12-12T00:00:00+07:00');
const COMPETITION_CLOSE = { 'smart competition': Date.parse('2026-12-09T00:00:00+07:00') };

export function registrationPriceAt(value, competition) {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  if (time < NORMAL_START) return { amount: 150000, usd: 12, tier: 'Early Bird' };
  if (time < LATE_START) return { amount: 175000, usd: 14, tier: 'Normal Registration' };
  if (time >= (COMPETITION_CLOSE[competition] ?? REGISTRATION_CLOSE)) return null;
  return { amount: 225000, usd: 18, tier: 'Late Registration' };
}
