import { AppState, DayData } from "../store/useStore";
import { getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../gamification/events";

function avg(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }

export function buildCompactSummary(state: Pick<AppState,'days'|'cycles'|'language'>) {
  const days = Object.values(state.days||{}).sort((a:DayData,b:DayData)=>a.date.localeCompare(b.date));
  const last14 = days.slice(-14);
  const last7 = days.slice(-7);
  const waterAvg = avg(last14.map(d=>d.drinks?.water??0));
  const coffeeAvg = avg(last14.map(d=>d.drinks?.coffee??0));
  const pillAdh = last7.length ? (last7.filter(d=>d.pills?.morning && d.pills?.evening).length/last7.length) : 0;
  const weights = days.filter(d=>typeof d.weight==='number');
  let weightTrend = 0; let weightLast: number | undefined = undefined;
  if (weights.length>=3) {
    const first = weights[0].weight!; const last = weights[weights.length-1].weight!; weightLast = last;
    weightTrend = (last-first)/Math.max(1, weights.length-1);
  }
  // weekly event progress (current week)
  const week = getWeekRange(new Date());
  const evt = getCurrentWeeklyEvent(week.start);
  const { percent } = computeEventProgress(week.dayKeys, state as any, evt);

  return {
    lang: state.language,
    water_avg14: Number(waterAvg.toFixed(2)),
    coffee_avg14: Number(coffeeAvg.toFixed(2)),
    pill_adherence7: Number((pillAdh*100).toFixed(0)),
    weight_last: typeof weightLast==='number'? Number(weightLast.toFixed(1)) : null,
    weight_trend_per_day: Number(weightTrend.toFixed(3)),
    weekly_event: { id: evt.id, title: evt.title(state.language as any), progress: percent },
  };
}