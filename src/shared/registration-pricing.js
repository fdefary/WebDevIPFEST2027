const NORMAL_START = Date.parse('2026-11-12T00:00:00+07:00');
const LATE_START = Date.parse('2026-12-05T00:00:00+07:00');

export function registrationPriceAt(value) {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  if (time < NORMAL_START) return { amount: 150000, tier: 'Early Bird' };
  if (time < LATE_START) return { amount: 175000, tier: 'Normal Registration' };
  return { amount: 225000, tier: 'Late Registration' };
}
