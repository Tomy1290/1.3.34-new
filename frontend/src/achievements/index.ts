import { differenceInCalendarDays } from "date-fns";
export type DayData = { date: string; pills: { morning: boolean; evening: boolean }; drinks: { water: number; coffee: number; slimCoffee: boolean; gingerGarlicTea: boolean; waterCure: boolean; sport: boolean }; weight?: number; weightTime?: number };
export type Goal = { targetWeight: number; targetDate: string; startWeight: number; active: boolean };
export type Reminder = { id: string; type: string; time: string; enabled: boolean };
export type ChatMessage = { id: string; sender: "user" | "bot"; text: string; createdAt: number };
export type SavedMessage = { id: string; title: string; text: string; createdAt: number; category?: string; tags?: string[] };
export type AchState = { days: Record<string, DayData>; goal?: Goal; reminders: Reminder[]; chat: ChatMessage[]; saved: SavedMessage[]; achievementsUnlocked: string[]; xp: number; language: 'de'|'en'; theme?: string };
export type AchievementConfig = { id: string; xp: number; progress: (s: AchState) => number; title: (lng: 'de'|'en') => string; description: (lng: 'de'|'en') => string; requires?: string[] };

const dayKeysSorted = (s: AchState) => Object.keys(s.days).sort();
const count = (arr: any[], pred: (x: any) => boolean) => arr.reduce((a, x) => a + (pred(x) ? 1 : 0), 0);
function isConsecutive(prev: string, next: string) { const d1 = new Date(prev); const d2 = new Date(next); return differenceInCalendarDays(d2, d1) === 1; }
function dayPerfect(d?: DayData) { if (!d) return false; const pills = !!d.pills?.morning && !!d.pills?.evening; const water = (d.drinks?.water ?? 0) >= 6; const weight = typeof d.weight === 'number'; return pills && water && weight; }
function perfectDaysCount(s: AchState) { return Object.values(s.days).filter(dayPerfect).length; }
function longestPerfectStreak(s: AchState) { const keys = dayKeysSorted(s); let max = 0, cur = 0; for (let i = 0; i < keys.length; i++) { const k = keys[i]; if (dayPerfect(s.days[k])) { if (i>0 && isConsecutive(keys[i-1], k) && dayPerfect(s.days[keys[i-1]])) cur += 1; else cur = 1; max = Math.max(max, cur); } else cur = 0; } return max; }
function complianceDays(s: AchState) { return Object.values(s.days).filter((d) => d.pills?.morning && d.pills?.evening).length; }
function appUsageDays(s: AchState) { return Object.keys(s.days).length; }
function waterGoalDays(s: AchState, goal = 6) { return count(Object.values(s.days), (d) => (d.drinks?.water ?? 0) >= goal); }
function coffeeUnderDays(s: AchState, limit = 6) { return count(Object.values(s.days), (d) => (d.drinks?.coffee ?? 0) < limit); }
function gingerTeaDays(s: AchState) { return count(Object.values(s.days), (d) => !!d.drinks?.gingerGarlicTea); }
function weightDelta(s: AchState) { const arr = Object.values(s.days).filter((d) => typeof d.weight === 'number').sort((a,b) => a.date.localeCompare(b.date)); if (arr.length < 2) return 0; return (arr[arr.length - 1].weight! - arr[0].weight!); }
function weighedBeforeHourCount(s: AchState, hour = 8) { return count(Object.values(s.days), (d) => typeof d.weight === 'number' && typeof d.weightTime === 'number' && new Date(d.weightTime).getHours() < hour); }
function trackedAfterHourCount(s: AchState, hour = 22) { return count(Object.values(s.days), (d) => typeof d.weightTime === 'number' && new Date(d.weightTime).getHours() >= hour); }

const A: AchievementConfig[] = [
  { id: 'first_steps_7', xp: 50, progress: (s) => Math.min(100, Math.round((appUsageDays(s)/7)*100)), title: (l)=> l==='de'?'Erste Schritte':'First steps', description:(l)=> l==='de'?'7 Tage App verwendet.':'Use the app for 7 days.' },
  { id: 'pillen_profi_7', xp: 100, progress: (s) => Math.min(100, Math.round((complianceDays(s)/7)*100)), title:(l)=> l==='de'?'Pillen-Profi':'Pill pro', description:(l)=> l==='de'?'7 Tage alle Tabletten.':'All pills for 7 days.' },
  { id: 'wasserdrache_5', xp: 75, progress: (s) => Math.min(100, Math.round((waterGoalDays(s)/5)*100)), title:(l)=> l==='de'?'Wasserdrache':'Water dragon', description:(l)=> l==='de'?'5 Tage Wasserziel erreicht.':'Hit water goal on 5 days.' },
  { id: 'kaffee_kontrolle_7', xp: 80, progress: (s) => Math.min(100, Math.round((coffeeUnderDays(s,6)/7)*100)), title:(l)=> l==='de'?'Kaffee-Kontrolle':'Coffee control', description:(l)=> l==='de'?'7 Tage unter 6 Kaffees.':'Under 6 coffees for 7 days.' },

  { id: 'perfekte_woche_7', xp: 250, progress: (s) => Math.min(100, Math.round((perfectDaysCount(s)/7)*100)), title:(l)=> l==='de'?'Perfekte Woche':'Perfect week', description:(l)=> l==='de'?'7 Tage alle Ziele.':'7 perfect days.', requires: ['first_steps_7','pillen_profi_7','wasserdrache_5','kaffee_kontrolle_7'] },
  { id: 'tee_liebhaber_20', xp: 120, progress: (s) => Math.min(100, Math.round((gingerTeaDays(s)/20)*100)), title:(l)=> l==='de'?'Tee-Liebhaber':'Tea lover', description:(l)=> l==='de'?'20x Ingwer-Knoblauch-Tee.':'20x ginger-garlic tea.' },
  { id: 'erste_erfolge_2kg', xp: 400, progress: (s) => { const d = weightDelta(s); if (d <= -2) return 100; if (d >= 0) return 0; return Math.min(100, Math.round((Math.abs(d)/2)*100)); }, title:(l)=> l==='de'?'Erste Erfolge':'First success', description:(l)=> l==='de'?'2kg abgenommen.':'Lose 2kg.', requires: ['perfekte_woche_7'] },
  { id: 'fruehaufsteher_30', xp: 200, progress: (s) => Math.min(100, Math.round((weighedBeforeHourCount(s,8)/30)*100)), title:(l)=> l==='de'?'Frühaufsteher':'Early bird', description:(l)=> l==='de'?'30x vor 8:00 gewogen.':'30x weighed before 8:00.' },

  { id: 'pillen_legende_100', xp: 1000, progress: (s) => Math.min(100, Math.round((complianceDays(s)/100)*100)), title:(l)=> l==='de'?'Pillen-Legende':'Pill legend', description:(l)=> l==='de'?'100 Tage alle Tabletten.':'100 days all pills.', requires: ['pillen_profi_7'] },
  { id: 'perfekter_monat_30', xp: 750, progress: (s) => Math.min(100, Math.round((perfectDaysCount(s)/30)*100)), title:(l)=> l==='de'?'Perfekter Monat':'Perfect month', description:(l)=> l==='de'?'30 Tage alle Ziele.':'30 perfect days.', requires: ['perfekte_woche_7'] },
  { id: 'grosser_erfolg_5kg', xp: 800, progress: (s) => { const d = weightDelta(s); if (d <= -5) return 100; if (d >= 0) return 0; return Math.min(100, Math.round((Math.abs(d)/5)*100)); }, title:(l)=> l==='de'?'Großer Erfolg':'Big success', description:(l)=> l==='de'?'5kg abgenommen.':'Lose 5kg.', requires: ['erste_erfolge_2kg'] },

  { id: 'streak_master_50', xp: 1200, progress: (s) => Math.min(100, Math.round((longestPerfectStreak(s)/50)*100)), title:(l)=> l==='de'?'Streak-Master':'Streak master', description:(l)=> l==='de'?'50 Tage perfekt (Streak).':'50-day perfect streak.', requires: ['perfekter_monat_30'] },
  { id: 'jahres_champion_365', xp: 2500, progress: (s) => Math.min(100, Math.round((complianceDays(s)/365)*100)), title:(l)=> l==='de'?'Jahres-Champion':'Year champion', description:(l)=> l==='de'?'365 Tage Tabletten.':'365 days pills.', requires: ['pillen_legende_100'] },
  { id: 'transformation_10kg', xp: 2000, progress: (s) => { const d = weightDelta(s); if (d <= -10) return 100; if (d >= 0) return 0; return Math.min(100, Math.round((Math.abs(d)/10)*100)); }, title:(l)=> l==='de'?'Transformation':'Transformation', description:(l)=> l==='de'?'10kg abgenommen.':'Lose 10kg.', requires: ['grosser_erfolg_5kg'] },

  { id: 'diamant_status_100', xp: 3000, progress: (s) => Math.min(100, Math.round((perfectDaysCount(s)/100)*100)), title:(l)=> l==='de'?'Diamant-Status':'Diamond status', description:(l)=> l==='de'?'100 Tage perfekt.':'100 perfect days.', requires: ['streak_master_50'] },
  { id: 'bestaendigkeits_koenig_200', xp: 4000, progress: (s) => Math.min(100, Math.round((appUsageDays(s)/200)*100)), title:(l)=> l==='de'?'Beständigkeits-König':'Consistency king', description:(l)=> l==='de'?'200 Tage App-Nutzung.':'200 days of app usage.' },
  { id: 'mega_transformation_20kg', xp: 5000, progress: (s) => { const d = weightDelta(s); if (d <= -20) return 100; if (d >= 0) return 0; return Math.min(100, Math.round((Math.abs(d)/20)*100)); }, title:(l)=> l==='de'?'Mega-Transformation':'Mega transformation', description:(l)=> l==='de'?'20kg abgenommen.':'Lose 20kg.', requires: ['transformation_10kg'] },
  { id: 'zen_meister_365', xp: 10000, progress: (s) => Math.min(100, Math.round((perfectDaysCount(s)/365)*100)), title:(l)=> l==='de'?'Zen-Meister':'Zen master', description:(l)=> l==='de'?'365 Tage perfekte Balance.':'365 days perfect balance.', requires: ['diamant_status_100'] },

  { id: 'nachteule_50', xp: 150, progress: (s) => Math.min(100, Math.round((trackedAfterHourCount(s,22)/50)*100)), title:(l)=> l==='de'?'Nachteule':'Night owl', description:(l)=> l==='de'?'50x nach 22:00 getrackt.':'50x tracked after 22:00.' },
  { id: 'chat_enthusiast_100', xp: 200, progress: (s) => Math.min(100, Math.round((s.chat.filter(m=>m.sender==='user').length/100)*100)), title:(l)=> l==='de'?'Chat-Enthusiast':'Chat enthusiast', description:(l)=> l==='de'?'100 Nachrichten mit Gugi.':'100 messages with Gugi.' },
  { id: 'wissenssammler_50', xp: 250, progress: (s) => Math.min(100, Math.round(((s.saved?.length ?? 0)/50)*100)), title:(l)=> l==='de'?'Wissenssammler':'Knowledge collector', description:(l)=> l==='de'?'50 Tipps gespeichert.':'Save 50 tips.' },
];

export type AchievementProgress = { id: string; title: string; description: string; percent: number; xp: number; completed: boolean };

export function getAchievementConfigById(id: string) { return A.find((x) => x.id === id); }

export function computeAchievements(state: AchState) {
  const unlockedSet = new Set(state.achievementsUnlocked);
  const list: AchievementProgress[] = A.map((cfg) => {
    const depsOk = !cfg.requires || cfg.requires.every((id) => unlockedSet.has(id));
    const raw = cfg.progress(state);
    const gated = depsOk ? raw : 0;
    const percent = Math.min(100, Math.max(0, Math.round(gated)));
    const completed = depsOk && percent >= 100;
    return { id: cfg.id, title: cfg.title(state.language), description: cfg.description(state.language), percent, xp: cfg.xp, completed };
  });
  const unlockedIds = new Set<string>(state.achievementsUnlocked);
  let xp = 0;
  for (const ach of list) { if (ach.completed) unlockedIds.add(ach.id); }
  for (const id of unlockedIds) { const found = A.find((x) => x.id === id); if (found) xp += found.xp; }
  return { list, unlocked: Array.from(unlockedIds), xp };
}