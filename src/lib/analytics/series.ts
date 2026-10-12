// Shared by server and client: chart series helpers.

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const shortDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
export const formatDay = (day: string) => shortDate.format(new Date(`${day}T00:00:00Z`));
const longDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
/** "lun, 12 oct" */
export const formatWeekday = (day: string) => longDate.format(new Date(`${day}T00:00:00Z`));

/** One point per day between `from` and `to` (inclusive, YYYY-MM-DD), zero where there is no data. */
export function fillDays(points: { day: string; value: number }[], from: string, to: string) {
  const byDay = new Map(points.map((p) => [p.day, p.value]));
  const out: { day: string; value: number }[] = [];
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${to}T00:00:00Z`); ms += DAY_MS) {
    const day = isoDay(ms);
    out.push({ day, value: byDay.get(day) ?? 0 });
  }
  return out;
}

/** Monday (UTC) of the week a day belongs to. */
function weekStart(day: string): string {
  const ms = Date.parse(`${day}T00:00:00Z`);
  const weekday = (new Date(ms).getUTCDay() + 6) % 7;
  return isoDay(ms - weekday * DAY_MS);
}

/** Sums daily points into weeks starting on Monday, with empty weeks in between. */
export function toWeeks(points: { day: string; value: number }[]) {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day));
  const filled = fillDays(sorted, weekStart(sorted[0].day), sorted[sorted.length - 1].day);
  const weeks = new Map<string, number>();
  for (const p of filled) weeks.set(weekStart(p.day), (weeks.get(weekStart(p.day)) ?? 0) + p.value);
  return Array.from(weeks, ([day, value]) => ({ day, value }));
}

export const todayUtc = () => isoDay(Date.now());
export const daysAgoUtc = (days: number) => isoDay(Date.now() - days * DAY_MS);

/** The day `n` days after `day` (YYYY-MM-DD). */
export const addDays = (day: string, n: number) => isoDay(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS);
