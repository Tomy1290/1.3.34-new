import { Cycle } from "../store/useStore";

export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export function getAverageCycleLengthDays(cycles: Cycle[]): number {
  const starts = cycles.filter(c => c.start).map(c => c.start).sort();
  if (starts.length < 2) return 28;
  const diffs: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const a = new Date(starts[i-1]); const b = new Date(starts[i]);
    const diff = Math.round((+b - +a)/(24*60*60*1000));
    if (diff > 0) diffs.push(diff);
  }
  if (diffs.length === 0) return 28;
  const last3 = diffs.slice(-3);
  const avg = Math.round(last3.reduce((a,b)=>a+b,0)/last3.length);
  return avg || 28;
}

export function getAveragePeriodLengthDays(cycles: Cycle[]): number {
  // If ends are recorded, use average (end-start+1), fallback to 5 days
  const completed = cycles.filter(c => c.start && c.end);
  if (completed.length === 0) return 5;
  const lens = completed.map(c => {
    const s = new Date(c.start); const e = new Date(c.end as string);
    return Math.max(1, Math.round((+e - +s)/(24*60*60*1000)) + 1);
  });
  const last3 = lens.slice(-3);
  return Math.max(1, Math.round(last3.reduce((a,b)=>a+b,0)/last3.length));
}

export function averageStartToStart(cycles: Cycle[]): number {
  return getAverageCycleLengthDays(cycles);
}

export function predictNextStart(cycles: Cycle[]): Date | null {
  const avg = averageStartToStart(cycles);
  const starts = cycles.map(c => c.start).filter(Boolean).sort();
  const last = starts.slice(-1)[0];
  if (!last) return null;
  const dt = new Date(last);
  dt.setDate(dt.getDate() + avg);
  return dt;
}

// Luteal phase defaults to 14 days (typical range 12–16). Fertile window includes ovulation day.
export function getOvulationDate(cycles: Cycle[]): Date | null {
  const next = predictNextStart(cycles);
  if (!next) return null;
  const luteal = 14; // could be adapted later by user-specific data
  const ov = new Date(next);
  ov.setDate(ov.getDate() - luteal);
  return ov;
}

export function getFertileWindow(cycles: Cycle[]): { start: Date; end: Date } | null {
  const ov = getOvulationDate(cycles);
  if (!ov) return null;
  const start = new Date(ov);
  start.setDate(start.getDate() - 5);
  const end = new Date(ov); // include ovulation day as fertile
  return { start, end };
}

export function isWithin(date: Date, start: Date, end: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return +d >= +s && +d <= +e;
}

export function buildPeriodDaysSet(cycles: Cycle[], periodLength = 5): Set<string> {
  const set = new Set<string>();
  for (const c of cycles) {
    const start = new Date(c.start);
    const len = Math.max(1, periodLength);
    const end = new Date(start);
    end.setDate(start.getDate() + len - 1);
    let cur = new Date(start);
    while (+cur <= +end) { set.add(toKey(cur)); cur.setDate(cur.getDate()+1); }
  }
  return set;
}

export function markersForMonth(year: number, month: number, cycles: Cycle[]) {
  const today = new Date();
  const avgCycleLen = averageStartToStart(cycles);
  const avgPeriodLen = getAveragePeriodLengthDays(cycles);
  const expectedNext = predictNextStart(cycles);
  const fertile = getFertileWindow(cycles);
  const ovulation = getOvulationDate(cycles);

  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate()+1); }

  // Past/confirmed period days: from each cycle start up to today (clamped by period length)
  const confirmed = new Set<string>();
  const upcoming = new Set<string>();

  for (const c of cycles) {
    const s = new Date(c.start);
    const end = c.end ? new Date(c.end) : (() => { const tmp = new Date(s); tmp.setDate(tmp.getDate() + avgPeriodLen - 1); return tmp; })();
    let cur = new Date(s);
    while (+cur <= +end) {
      const key = toKey(cur);
      if (+cur <= +today) confirmed.add(key); else upcoming.add(key);
      cur.setDate(cur.getDate()+1);
    }
  }

  const period = new Set(days.filter(dd => confirmed.has(toKey(dd))).map(toKey));
  const upcomingPeriod = new Set(days.filter(dd => upcoming.has(toKey(dd))).map(toKey));
  const fertileSet = new Set(days.filter(dd => fertile && isWithin(dd, fertile.start, fertile.end)).map(toKey));
  const ovulationSet = new Set(days.filter(dd => ovulation && toKey(dd) === toKey(ovulation)).map(toKey));
  const expectedSet = new Set(days.filter(dd => expectedNext && toKey(dd) === toKey(expectedNext)).map(toKey));

  return { period, upcomingPeriod, fertile: fertileSet, ovulation: ovulationSet, expected: expectedSet, avgCycleLen, avgPeriodLen, expectedNext };
}