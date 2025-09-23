import { DayData } from "../store/useStore";

function toSortedDays(days: Record<string, DayData>) {
  return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeExtendedStats(days: Record<string, DayData>) {
  const arr = toSortedDays(days);
  // Wasser: 7/30-Tage Durchschnitt
  const lastN = (n: number) => arr.slice(-n);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const w7 = avg(lastN(7).map((d) => d.drinks?.water ?? 0));
  const w30 = avg(lastN(30).map((d) => d.drinks?.water ?? 0));

  // Gewicht: einfacher Trend (lineare Regression light: Differenz / Tage)
  const ws = arr.filter((d) => typeof d.weight === 'number');
  let weightTrendPerDay = 0;
  if (ws.length >= 2) {
    const first = ws[0].weight!;
    const last = ws[ws.length - 1].weight!;
    const daysDiff = ws.length - 1;
    weightTrendPerDay = (last - first) / daysDiff; // kg pro Tag (negativ ist gut bei Abnehmen)
  }

  // Pillen-Compliance: Anteil Tage mit morgens & abends
  const total = arr.length || 1;
  const complianceDays = arr.filter((d) => !!d.pills?.morning && !!d.pills?.evening).length;
  const complianceRate = complianceDays / total; // 0..1

  // Streaks (einfache perfekte Tage)
  function dayPerfect(d?: DayData) {
    if (!d) return false;
    const pills = !!d.pills?.morning && !!d.pills?.evening;
    const water = (d.drinks?.water ?? 0) >= 6;
    const weight = typeof d.weight === 'number';
    return pills && water && weight;
  }
  let best = 0, cur = 0;
  for (const d of arr) { if (dayPerfect(d)) { cur += 1; best = Math.max(best, cur); } else { cur = 0; } }

  return {
    waterAvg7: w7,
    waterAvg30: w30,
    weightTrendPerDay,
    complianceRate, // 0..1
    bestPerfectStreak: best,
  };
}

export function computePremiumInsights(days: Record<string, DayData>, lng: 'de'|'en') {
  const tips: string[] = [];
  const arr = toSortedDays(days);
  if (!arr.length) return tips;

  // EWMA der letzten 10 Gewichte
  const w = arr.filter((d) => typeof d.weight === 'number');
  if (w.length >= 2) {
    const alpha = 0.3;
    let ewma = w[0].weight!;
    for (let i = 1; i < w.length; i++) ewma = alpha * w[i].weight! + (1 - alpha) * ewma;
    tips.push(lng==='de' ? `Gewichts-EWMA: ${ewma.toFixed(1)} kg` : `Weight EWMA: ${ewma.toFixed(1)} kg`);

    // Kurzfristige Prognose (nächste 3 Tage aus linearem Trend)
    const first = w[0].weight!;
    const last = w[w.length - 1].weight!;
    const daysDiff = w.length - 1;
    const slope = (last - first) / Math.max(1, daysDiff);
    const forecast3 = last + slope * 3;
    tips.push(lng==='de' ? `Prognose (3 Tage): ${forecast3.toFixed(1)} kg` : `Forecast (3 days): ${forecast3.toFixed(1)} kg`);
  }

  // Ausreißer im Wasserverbrauch (±50% vom Median der letzten 14)
  const last14 = arr.slice(-14).map((d) => d.drinks?.water ?? 0);
  if (last14.length >= 5) {
    const sorted = [...last14].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] || 0;
    const high = last14.filter((x) => x > med * 1.5).length;
    const low = last14.filter((x) => x < med * 0.5).length;
    if (high > 0) tips.push(lng==='de' ? `Mehrere sehr hohe Trinktage (>${(med*1.5).toFixed(1)}) erkannt.` : `Several very high water days (>${(med*1.5).toFixed(1)}) detected.`);
    if (low > 0) tips.push(lng==='de' ? `Mehrere sehr niedrige Trinktage (<${(med*0.5).toFixed(1)}) erkannt.` : `Several very low water days (<${(med*0.5).toFixed(1)}) detected.`);
  }

  // Adhärenz-Score (letzte 7 Tage)
  const last7 = arr.slice(-7);
  const scoreParts = last7.map((d) => {
    let s = 0;
    s += (d.pills?.morning && d.pills?.evening) ? 40 : 0;
    s += Math.min(30, (d.drinks?.water ?? 0) * 5);
    s += typeof d.weight === 'number' ? 15 : 0;
    s += d.drinks?.sport ? 15 : 0;
    return s;
  });
  const avgScore = scoreParts.length ? Math.round(scoreParts.reduce((a,b)=>a+b,0)/scoreParts.length) : 0;
  tips.push(lng==='de' ? `Ø Adhärenz (7T): ${avgScore}/100` : `Avg adherence (7d): ${avgScore}/100`);

  return tips;
}