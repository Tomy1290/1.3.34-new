import { AppState, DayData } from "../store/useStore";

export type AIItem = { id: string; text: string; category: 'water'|'pill'|'weight'|'sport'|'coffee'|'habit'|'cycle'; score: number };
function avg(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function median(xs: number[]) { if (!xs.length) return 0; const s=[...xs].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s[m]; }

export function computeAIv1(state: Pick<AppState,'days'|'language'|'aiFeedback'|'aiInsightsEnabled'>): AIItem[] {
  const { days, language, aiFeedback } = state as any;
  const lng = language as 'de'|'en'|'pl';
  const items: AIItem[] = [];
  const values = Object.values(days||{}).sort((a:DayData,b:DayData)=>a.date.localeCompare(b.date));

  // weekday water pattern
  const weekday = Array.from({length:7},()=>({sum:0,n:0}));
  for (const d of values) { const w=new Date(d.date).getDay(); weekday[w].sum+=(d.drinks?.water??0); weekday[w].n+=1; }
  const wAvg = weekday.map(x=>x.n?x.sum/x.n:0);
  let lowW = 0; for(let i=1;i<7;i++){ if (wAvg[i] < wAvg[lowW]) lowW = i; }
  const dayDe=['So','Mo','Di','Mi','Do','Fr','Sa'];
  const dayEn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayPl=['Nd','Pn','Wt','Śr','Cz','Pt','So'];
  if (wAvg.some(x=>x>0)) {
    items.push({ id:'water_low_day', category:'water', score: 0.7, text: lng==='de'?`Am ${dayDe[lowW]} trinkst du im Schnitt am wenigsten – plane hier eine Extraschluck‑Erinnerung.`: (lng==='pl'?`W ${dayPl[lowW]} pijesz najmniej – zaplanuj dodatkowe przypomnienie o łyku.`:`You drink the least on ${dayEn[lowW]} – add an extra sip reminder.`), });
  }

  // Weight trend + plateau basics (same as before)
  const ws = values.filter(d=>typeof d.weight==='number');
  if (ws.length>=3) {
    const first = ws[0].weight!; const last = ws[ws.length-1].weight!; const trend = (last-first)/Math.max(1, ws.length-1);
    items.push({ id:'weight_trend', category:'weight', score: 0.75, text: lng==='de'?`Gewichtstrend/Tag: ${trend>=0?'+':''}${trend.toFixed(2)} kg – bewerte über mehrere Tage.`:(lng==='pl'?`Trend wagi/dzień: ${trend>=0?'+':''}${trend.toFixed(2)} kg – oceniaj w ujęciu kilku dni.`:`Weight trend/day: ${trend>=0?'+':''}${trend.toFixed(2)} kg – assess over multiple days.`) });
    const last7 = ws.slice(-7).map(d=>d.weight!);
    if (last7.length>=5) {
      const range = Math.max(...last7)-Math.min(...last7);
      if (range < 0.6) items.push({ id:'plateau', category:'weight', score: 0.85, text: lng==='de'?`Plateau in den letzten Tagen: Kleine Anpassung bei Wasser/Sport kann helfen.`:(lng==='pl'?`Plateau ostatnich dni: małe korekty woda/sport mogą pomóc.`:`Plateau detected: small tweaks to water/sport may help.`) });
    }
  }

  // Water outliers (last 14)
  const last14 = values.slice(-14).map(d=>d.drinks?.water??0);
  if (last14.length>=5) {
    const med = median(last14);
    const highs = last14.filter(x=>x>med*1.5).length; const lows = last14.filter(x=>x<med*0.5).length;
    if (highs>0) items.push({ id:'water_outlier_high', category:'water', score:0.5, text: lng==='de'?`Mehrere sehr hohe Trinktage (>~${(med*1.5).toFixed(1)}). Achte auf Balance.`:(lng==='pl'?`Kilka bardzo wysokich dni nawodnienia (>~${(med*1.5).toFixed(1)}). Zachowaj równowagę.`:`Several very high water days (>~${(med*1.5).toFixed(1)}). Aim for balance.`) });
    if (lows>0) items.push({ id:'water_outlier_low', category:'water', score:0.5, text: lng==='de'?`Mehrere sehr niedrige Trinktage (<~${(med*0.5).toFixed(1)}). Erhöhe schrittweise.`:(lng==='pl'?`Kilka bardzo niskich dni nawodnienia (<~${(med*0.5).toFixed(1)}). Zwiększaj stopniowo.`:`Several very low water days (<~${(med*0.5).toFixed(1)}). Increase gradually.`) });
  }

  // Pill adherence (last 7)
  const last7 = values.slice(-7);
  const pillDays = last7.filter(d=>d.pills?.morning && d.pills?.evening).length;
  if (last7.length) {
    const ratio = pillDays/last7.length;
    items.push({ id:'pill_adherence', category:'pill', score: 0.65, text: lng==='de'?`Pillen‑Adhärenz (7T): ${(ratio*100|0)}%. Koppel Einnahme an Routine.`:(lng==='pl'?`Adherencja tabletek (7 dni): ${(ratio*100|0)}%. Powiąż przyjmowanie z rutyną.`:`Pill adherence (7d): ${(ratio*100|0)}%. Tie intake to routines.`) });
  }

  return items.sort((a,b)=>b.score-a.score);
}

export function computeAIPro(state: Pick<AppState,'days'|'language'|'aiFeedback'|'aiInsightsEnabled'|'cycleLogs'>): AIItem[] {
  const base = computeAIv1(state as any);
  const lng = (state as any).language as 'de'|'en'|'pl';
  const items: AIItem[] = [...base];
  const values = Object.values((state as any).days||{}).sort((a:DayData,b:DayData)=>a.date.localeCompare(b.date));

  // Weekend hydration dip (already covered roughly in v1, keep)
  const wdays = Array.from({length:7},()=>({sum:0,n:0}));
  for (const d of values) { const w=new Date(d.date).getDay(); wdays[w].sum+=(d.drinks?.water??0); wdays[w].n+=1; }
  const wk = (wd:number)=> (wdays[wd].n? wdays[wd].sum/wdays[wd].n : 0);
  const weekend = (wk(0)+wk(6))/2; const weekdays = (wk(1)+wk(2)+wk(3)+wk(4)+wk(5))/5;
  if (weekdays>0 && weekend < weekdays*0.7) {
    items.push({ id:'water_weekend_drop', category:'water', score: 0.8, text: lng==='de'?`Wochenend‑Delle beim Trinken – plane eine feste Erinnerung Sa/So.`:(lng==='pl'?`Spadek nawodnienia w weekend – zaplanuj stałe przypomnienie Sb/Nd.`:`Weekend dip in hydration – schedule a fixed Sat/Sun reminder.`) });
  }

  // Late intake analysis via activityLog (last 14 days)
  const logs = values.slice(-14).flatMap(d => (d.activityLog||[]).map(l => ({...l, date: d.date})));
  if (logs.length>0) {
    const waterAdds = logs.filter(l => l.action==='drink_water' && typeof l.value==='number' && (l.value as number)>0);
    const coffeeAdds = logs.filter(l => l.action==='drink_coffee' && typeof l.value==='number' && (l.value as number)>0);
    const waterLate = waterAdds.filter(l => new Date(l.ts).getHours()>=18).length;
    const waterAll = waterAdds.length || 1;
    if (waterLate / waterAll >= 0.6 && waterAll>=5) {
      items.push({ id:'water_late_intake', category:'water', score: 0.72, text: lng==='de'?`Ein Großteil des Wassers wird abends getrunken – plane einen „Start‑Schluck“ am Morgen.`:(lng==='pl'?`Większość wody pijesz wieczorem – zaplanuj „łyk startowy” rano.`:`Most water intake happens in the evening – plan a morning “start sip”.`) });
    }
    const coffeeLate = coffeeAdds.filter(l => new Date(l.ts).getHours()>=16).length;
    const coffeeAll = coffeeAdds.length || 1;
    if (coffeeLate / coffeeAll >= 0.4 && coffeeAll>=3) {
      items.push({ id:'coffee_late', category:'coffee', score: 0.6, text: lng==='de'?`Viel Kaffee nach 16 Uhr – versuche eine Tasse früher am Tag zu ersetzen.`:(lng==='pl'?`Dużo kawy po 16 – spróbuj jedną filiżankę zamienić wcześniej w ciągu dnia.`:`Lots of coffee after 4pm – try swapping one cup earlier in the day.`) });
    }
  }

  // Sport consistency
  const sportDays = values.filter(d=>!!d.drinks?.sport).length;
  if (sportDays>=4) items.push({ id:'sport_consistency', category:'sport', score: 0.55, text: lng==='de'?`Gute Sport‑Konstanz – kleine Steigerungen einplanen.`:(lng==='pl'?`Dobra regularność sportu – zaplanuj małe zwiększenia.`:`Good workout consistency – plan small increases.`) });

  // Cycle symptom cluster (last 14)
  try {
    const cLogs = (state as any).cycleLogs || {};
    const keys = Object.keys(cLogs).sort();
    const last = keys.slice(-14);
    const c = { cramps:0, headache:0, nausea:0, painHigh:0, lowEnergy:0 } as any;
    for (const k of last) {
      const l = (cLogs as any)[k]; if (!l) continue;
      if (l.cramps) c.cramps++;
      if (l.headache) c.headache++;
      if (l.nausea) c.nausea++;
      if (typeof l.pain==='number' && l.pain>=7) c.painHigh++;
      if (typeof l.energy==='number' && l.energy<=3) c.lowEnergy++;
    }
    const sum = c.cramps + c.headache + c.nausea + c.painHigh + c.lowEnergy;
    if (sum>=3) items.push({ id:'cycle_cluster', category:'cycle', score: 0.7, text: lng==='de'?`Zyklus‑Symptome häufen sich – plane entlastende Tage (Wärme, Ruhe, leicht bewegen).`:(lng==='pl'?`Objawy cyklu się kumulują – zaplanuj dni odciążenia (ciepło, odpoczynek, lekki ruch).`:`Cycle symptoms cluster – plan light, relieving days (warmth, rest, gentle movement).`) });
  } catch {}

  // De-duplicate and sort by score
  const map: Record<string,AIItem> = {};
  for (const it of items) map[it.id]=it;
  return Object.values(map).sort((a,b)=>b.score-a.score);
}