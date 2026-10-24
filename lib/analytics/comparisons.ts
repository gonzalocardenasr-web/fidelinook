/** Reglas de comparación comercial. Fechas YYYY-MM-DD en calendario de Santiago. */
export type DateRange = { from: string; to: string };
const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
export const daysInMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};
export const shiftMonth = (date: string, delta: number) => {
  const [year, month] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};
export function previousEqualPeriod(from: string, to: string): DateRange {
  const length = Math.round((utc(to).getTime() - utc(from).getTime()) / 86400000) + 1;
  if (length < 1 || length > 370) throw new Error("Período inválido para comparación");
  return { from: iso(new Date(utc(from).getTime() - length * 86400000)), to: iso(new Date(utc(from).getTime() - 86400000)) };
}
export function monthlyComparison(from: string, to: string): { comparable: DateRange; full: DateRange } | null {
  if (from !== `${to.slice(0, 7)}-01`) return null;
  const previous = shiftMonth(to, -1);
  const full = { from: `${previous}-01`, to: `${previous}-${String(daysInMonth(previous)).padStart(2, "0")}` };
  const day = Math.min(Number(to.slice(8)), daysInMonth(previous));
  return { full, comparable: { from: full.from, to: `${previous}-${String(day).padStart(2, "0")}` } };
}
export function commercialDateStatus(to: string, today: string): "future" | "in_progress" | "past" {
  return to > today ? "future" : to === today ? "in_progress" : "past";
}
