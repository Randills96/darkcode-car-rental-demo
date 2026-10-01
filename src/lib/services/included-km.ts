export type IncludedKmPolicy = {
  firstDayKm: number;
  extraDayKm: number;
};

export function calculateIncludedKmAllowance(
  rentalDays: number,
  firstDayKm: number,
  extraDayKm: number = firstDayKm
): number {
  const days = Math.max(1, Math.floor(Number(rentalDays)) || 1);
  const first = Math.max(0, Number(firstDayKm) || 0);
  const extra = Math.max(0, Number(extraDayKm) || 0);
  return first + extra * (days - 1);
}

export function describeIncludedKmPolicy(
  rentalDays: number,
  firstDayKm: number,
  extraDayKm: number = firstDayKm
): string {
  const days = Math.max(1, Math.floor(Number(rentalDays)) || 1);
  const first = Math.max(0, Number(firstDayKm) || 0);
  const extra = Math.max(0, Number(extraDayKm) || 0);
  const total = calculateIncludedKmAllowance(days, first, extra);

  if (days === 1) {
    return `${first.toLocaleString()} km free on day 1`;
  }
  if (first === extra) {
    return `${first.toLocaleString()} km/day × ${days} days = ${total.toLocaleString()} km`;
  }
  return `Day 1: ${first.toLocaleString()} km, then ${extra.toLocaleString()} km × ${days - 1} extra day${
    days - 1 === 1 ? "" : "s"
  } = ${total.toLocaleString()} km total`;
}

export function exampleIncludedKmPolicy(firstDayKm: number, extraDayKm: number): string {
  const one = calculateIncludedKmAllowance(1, firstDayKm, extraDayKm);
  const three = calculateIncludedKmAllowance(3, firstDayKm, extraDayKm);
  if (firstDayKm === extraDayKm) {
    return `1 day = ${one.toLocaleString()} km · 3 days = ${three.toLocaleString()} km (${firstDayKm.toLocaleString()} km/day)`;
  }
  return `1 day = ${one.toLocaleString()} km · 3 days = ${three.toLocaleString()} km (day 1 ${firstDayKm.toLocaleString()} + two extra days ${extraDayKm.toLocaleString()} each)`;
}
