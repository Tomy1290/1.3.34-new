import { toKey } from "../utils/date";
import { AppState } from "../store/useStore";

export type WeeklyEvent = {
  id: string;
  title: (lng: 'de'|'en') => string;
  description: (lng: 'de'|'en') => string;
  progress: (dayKeys: string[], state: Pick<AppState, 'days'>) => number; // returns 0..100
  xp: number;
  bonusPercent: number;
};

export function getWeekRange(date: Date) {
  const d0 = new Date(date);
  const day = d0.getDay();
  const start = new Date(d0); start.setDate(d0.getDate() - day); start.setHours(0,0,0,0);
  const days: string[] = []; for (let i=0;i<7;i++){ const di = new Date(start); di.setDate(start.getDate()+i); days.push(toKey(di)); }
  const year = start.getFullYear();
  const weekIndexInYear = Math.floor(((+start - +new Date(year,0,1)) / (1000*60*60*24)) / 7);
  const weekKey = `${year}-W${String(weekIndexInYear).padStart(2,'0')}`;
  return { weekKey, start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate()+6), dayKeys: days };
}

function countDays(dayKeys: string[], state: Pick<AppState,'days'>, pred: (d: any) => boolean) {
  let c = 0; for (const k of dayKeys) { const d = (state as any).days[k]; if (pred(d)) c++; } return c;
}

function pct(hits: number, goal: number) { if (goal <= 0) return 0; const r = hits / goal; return Math.max(0, Math.min(100, Math.floor(r * 100))); }

export const EVENTS: WeeklyEvent[] = [
  { id: 'water_boost', title:(l)=> l==='de'? 'Hydration Boost' : 'Hydration Boost', description:(l)=> l==='de'? 'Erreiche an 4 Tagen das Wasserziel (≥6).' : 'Hit water goal (≥6) on 4 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> (d?.drinks?.water ?? 0) >= 6), 4), xp: 120, bonusPercent: 0.10 },
  { id: 'pill_focus', title:(l)=> l==='de'? 'Pillen-Fokus' : 'Pill Focus', description:(l)=> l==='de'? 'An 5 Tagen morgens & abends Pillen.' : 'Morning & evening pills on 5 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.pills?.morning && !!d?.pills?.evening), 5), xp: 140, bonusPercent: 0.05 },
  { id: 'coffee_control', title:(l)=> l==='de'? 'Kaffee-Kontrolle' : 'Coffee Control', description:(l)=> l==='de'? 'Max. 2 Tage mit ≥6 Kaffees.' : 'At most 2 days with ≥6 coffees.', progress:(keys,s)=> { const hi = countDays(keys,s,(d)=> (d?.drinks?.coffee ?? 0) >= 6); const ok = hi <= 2 ? 1 : Math.max(0, (2 - hi)/2); return Math.floor(ok*100); }, xp: 100, bonusPercent: 0.08 },
  { id: 'ginger_tea_week', title:(l)=> l==='de'? 'Ingwer-Knoblauch-Woche' : 'Ginger-Garlic Week', description:(l)=> l==='de'? 'Trinke 3× Ingwer-Knoblauch-Tee.' : 'Drink ginger-garlic tea 3 times.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.drinks?.gingerGarlicTea), 3), xp: 110, bonusPercent: 0.07 },
  { id: 'sport_spark', title:(l)=> l==='de'? 'Sport-Funken' : 'Sport Spark', description:(l)=> l==='de'? 'Aktiviere Sport an 3 Tagen.' : 'Enable Sport on 3 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.drinks?.sport), 3), xp: 130, bonusPercent: 0.12 },
  { id: 'weigh_in_rhythm', title:(l)=> l==='de'? 'Wiegerhythmus' : 'Weigh-in Rhythm', description:(l)=> l==='de'? 'Wiege dich an 4 Tagen.' : 'Weigh yourself on 4 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> typeof d?.weight === 'number'), 4), xp: 120, bonusPercent: 0.06 },
  { id: 'water_cure_focus', title:(l)=> l==='de'? 'Wasserkur-Fokus' : 'Water Cure Focus', description:(l)=> l==='de'? 'Aktiviere Wasserkur an 2 Tagen.' : 'Enable Water Cure on 2 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.drinks?.waterCure), 2), xp: 90, bonusPercent: 0.05 },
  { id: 'slim_coffee_week', title:(l)=> l==='de'? 'Abnehmkaffee-Woche' : 'Slim Coffee Week', description:(l)=> l==='de'? 'Aktiviere Abnehmkaffee an 3 Tagen.' : 'Enable Slim Coffee on 3 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.drinks?.slimCoffee), 3), xp: 100, bonusPercent: 0.06 },
  { id: 'perfect_day_duo', title:(l)=> l==='de'? 'Perfekt x2' : 'Perfect x2', description:(l)=> l==='de'? 'Schaffe 2 perfekte Tage.' : 'Achieve 2 perfect days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> { if(!d) return false; const pills=!!d?.pills?.morning && !!d?.pills?.evening; const water=(d?.drinks?.water ?? 0) >= 6; const weight=typeof d?.weight==='number'; return pills && water && weight; }), 2), xp: 150, bonusPercent: 0.15 },
  { id: 'low_coffee', title:(l)=> l==='de'? 'Weniger Kaffee' : 'Lower Coffee', description:(l)=> l==='de'? 'Max. 3 Tage mit ≥4 Kaffees.' : 'At most 3 days with ≥4 coffees.', progress:(keys,s)=> { const hi = countDays(keys,s,(d)=> (d?.drinks?.coffee ?? 0) >= 4); const ok = hi <= 3 ? 1 : Math.max(0, (3 - hi)/3); return Math.floor(ok*100); }, xp: 100, bonusPercent: 0.08 },
  { id: 'evening_pill_focus', title:(l)=> l==='de'? 'Abendroutine' : 'Evening Routine', description:(l)=> l==='de'? 'An 5 Tagen Abendpille.' : 'Evening pill on 5 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.pills?.evening), 5), xp: 100, bonusPercent: 0.07 },
  { id: 'morning_pill_focus', title:(l)=> l==='de'? 'Morgenroutine' : 'Morning Routine', description:(l)=> l==='de'? 'An 5 Tagen Morgenpille.' : 'Morning pill on 5 days.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.pills?.morning), 5), xp: 100, bonusPercent: 0.07 },
  { id: 'water_streak', title:(l)=> l==='de'? 'Wasser-Streak' : 'Water Streak', description:(l)=> l==='de'? '2 Tage in Folge Wasserziel.' : 'Water goal 2 days in a row.', progress:(keys,s)=> { let best=0,cur=0; for(const k of keys){ const ok=((s as any).days[k]?.drinks?.water ?? 0) >= 6; if(ok){ cur+=1; best=Math.max(best,cur);} else cur=0; } return pct(best,2); }, xp: 120, bonusPercent: 0.10 },
  { id: 'sport_duo', title:(l)=> l==='de'? 'Sport-Duo' : 'Sport Duo', description:(l)=> l==='de'? '2 Sporttage in der Woche.' : '2 sport days this week.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> !!d?.drinks?.sport), 2), xp: 110, bonusPercent: 0.12 },
  { id: 'weigh_early', title:(l)=> l==='de'? 'Früh gewogen' : 'Weigh Early', description:(l)=> l==='de'? '2× vor 8:00 wiegen.' : 'Weigh before 8:00 twice.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> typeof d?.weightTime==='number' && new Date(d.weightTime).getHours() < 8), 2), xp: 120, bonusPercent: 0.06 },
  { id: 'night_owl', title:(l)=> l==='de'? 'Nachteule' : 'Night Owl', description:(l)=> l==='de'? '2× nach 22:00 tracken.' : 'Track after 22:00 twice.', progress:(keys,s)=> pct(countDays(keys,s,(d)=> typeof d?.weightTime==='number' && new Date(d.weightTime).getHours() >= 22), 2), xp: 90, bonusPercent: 0.05 },
  { id: 'save_tips', title:(l)=> l==='de'? 'Tipps speichern' : 'Save tips', description:(l)=> l==='de'? '3 Tipps in der Woche speichern.' : 'Save 3 tips this week.', progress:()=> 0, xp: 0, bonusPercent: 0.05 },
  { id: 'chat_week', title:(l)=> l==='de'? 'Chat-Woche' : 'Chat Week', description:(l)=> l==='de'? '5 Nachrichten mit Gugi.' : 'Send 5 messages to Gugi.', progress:()=> 0, xp: 0, bonusPercent: 0.05 },
  { id: 'water_plus', title:(l)=> l==='de'? 'Mehr Wasser' : 'More Water', description:(l)=> l==='de'? 'Wasserziel an 5 Tagen.' : 'Hit water goal 5 days.', progress:(k,s)=> pct(countDays(k,s,(d)=> (d?.drinks?.water ?? 0) >= 6), 5), xp: 140, bonusPercent: 0.10 },
  { id: 'pills_4', title:(l)=> l==='de'? 'Pillen 4' : 'Pills 4', description:(l)=> l==='de'? '4 Tage beide Pillen.' : '4 days both pills.', progress:(k,s)=> pct(countDays(k,s,(d)=> !!d?.pills?.morning && !!d?.pills?.evening), 4), xp: 120, bonusPercent: 0.06 },
  { id: 'sport_plus', title:(l)=> l==='de'? 'Mehr Sport' : 'More Sport', description:(l)=> l==='de'? '4 Sporttage.' : '4 sport days.', progress:(k,s)=> pct(countDays(k,s,(d)=> !!d?.drinks?.sport), 4), xp: 160, bonusPercent: 0.12 },
  { id: 'tea_plus', title:(l)=> l==='de'? 'Mehr Tee' : 'More Tea', description:(l)=> l==='de'? '4× Ingwer-Knoblauch-Tee.' : 'Tea 4 times.', progress:(k,s)=> pct(countDays(k,s,(d)=> !!d?.drinks?.gingerGarlicTea), 4), xp: 120, bonusPercent: 0.07 },
  { id: 'coffee_cut', title:(l)=> l==='de'? 'Kaffee reduzieren' : 'Cut Coffee', description:(l)=> l==='de'? 'Keine Tage ≥6 Kaffee.' : 'No days with ≥6 coffees.', progress:(k,s)=> { const hi = countDays(k,s,(d)=> (d?.drinks?.coffee ?? 0) >= 6); return hi===0 ? 100 : 0; }, xp: 150, bonusPercent: 0.15 },
  { id: 'weigh_5', title:(l)=> l==='de'? 'Wiegen 5' : 'Weigh 5', description:(l)=> l==='de'? '5 Tage wiegen.' : 'Weigh on 5 days.', progress:(k,s)=> pct(countDays(k,s,(d)=> typeof d?.weight === 'number'), 5), xp: 130, bonusPercent: 0.06 },
  { id: 'water_cure_plus', title:(l)=> l==='de'? 'Wasserkur +' : 'Water Cure +', description:(l)=> l==='de'? '3 Tage Wasserkur.' : 'Water Cure 3 days.', progress:(k,s)=> pct(countDays(k,s,(d)=> !!d?.drinks?.waterCure), 3), xp: 110, bonusPercent: 0.05 },
  { id: 'slim_coffee_plus', title:(l)=> l==='de'? 'Abnehmkaffee +' : 'Slim Coffee +', description:(l)=> l==='de'? '4 Tage Abnehmkaffee.' : 'Slim Coffee 4 days.', progress:(k,s)=> pct(countDays(k,s,(d)=> !!d?.drinks?.slimCoffee), 4), xp: 120, bonusPercent: 0.07 },
  { id: 'perfect_triple', title:(l)=> l==='de'? 'Perfekt x3' : 'Perfect x3', description:(l)=> l==='de'? '3 perfekte Tage.' : '3 perfect days.', progress:(k,s)=> pct(countDays(k,s,(d)=> { if(!d) return false; const p=!!d?.pills?.morning && !!d?.pills?.evening; const w=(d?.drinks?.water ?? 0) >= 6; const g=typeof d?.weight==='number'; return p && w && g; }), 3), xp: 180, bonusPercent: 0.15 },
  { id: 'coffee_3max', title:(l)=> l==='de'? 'Kaffee ≤3' : 'Coffee ≤3', description:(l)=> l==='de'? 'Mind. 4 Tage mit ≤3 Kaffees.' : 'At least 4 days with ≤3 coffees.', progress:(k,s)=> pct(countDays(k,s,(d)=> (d?.drinks?.coffee ?? 0) <= 3), 4), xp: 140, bonusPercent: 0.10 },
  { id: 'early_bird', title:(l)=> l==='de'? 'Frühaufsteher' : 'Early Bird', description:(l)=> l==='de'? '3× vor 8:00 wiegen.' : 'Weigh before 8:00 three times.', progress:(k,s)=> pct(countDays(k,s,(d)=> typeof d?.weightTime==='number' && new Date(d.weightTime).getHours() < 8), 3), xp: 150, bonusPercent: 0.08 },
  { id: 'night_tracker', title:(l)=> l==='de'? 'Nacht-Tracker' : 'Night Tracker', description:(l)=> l==='de'? '3× nach 22:00 tracken.' : 'Track after 22:00 three times.', progress:(k,s)=> pct(countDays(k,s,(d)=> typeof d?.weightTime==='number' && new Date(d.weightTime).getHours() >= 22), 3), xp: 110, bonusPercent: 0.05 },
];

export function getCurrentWeeklyEvent(date: Date): WeeklyEvent { const { start } = getWeekRange(date); const idx = Math.abs((start.getFullYear()*37 + start.getMonth()*5 + start.getDate())) % EVENTS.length; return EVENTS[idx]; }

export function computeEventProgress(dayKeys: string[], state: Pick<AppState, 'days'>, evt: WeeklyEvent) { const percent = Math.max(0, Math.min(100, Math.floor(evt.progress(dayKeys, state)))); return { percent, completed: percent >= 100 }; }