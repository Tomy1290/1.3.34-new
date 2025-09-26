import { computeAchievements } from "../achievements";
import { AppState } from "../store/useStore";

export type ChainDef = { id: string; title: (l:'de'|'en')=>string; steps: string[] };

export const CHAIN_DEFS: ChainDef[] = [
  { id: 'perfect', title: (l)=> l==='de'? 'Perfekte Tage' : 'Perfect days', steps: ['perfekte_woche_7','perfekter_monat_30','diamant_status_100','zen_meister_365'] },
  { id: 'pills', title: (l)=> l==='de'? 'Pillen‑Meister' : 'Pill mastery', steps: ['pillen_profi_7','pillen_legende_100','jahres_champion_365'] },
  // Keep legacy weight goal chain, but add a new chain for loss streaks specifically
  { id: 'weight_loss', title: (l)=> l==='de'? 'Gewichtsziele' : 'Weight goals', steps: ['erste_erfolge_2kg','grosser_erfolg_5kg','transformation_10kg','mega_transformation_20kg'] },
  { id: 'weight_loss_streak', title: (l)=> l==='de'? 'Gewichtsverlust (Kette)' : 'Weight loss (streak)', steps: ['weight_loss_streak_2','weight_loss_streak_5','weight_loss_streak_10','weight_loss_streak_20','weight_loss_streak_30'] },
  { id: 'usage', title: (l)=> l==='de'? 'Dranbleiben' : 'Consistency', steps: ['first_steps_7','bestaendigkeits_koenig_200'] },
  // Extended water chain (Wasserdrache und weiter) incl. Joker-enabled streaks
  { id: 'water', title: (l)=> l==='de'? 'Wasser' : 'Water', steps: ['wasserdrache_5','wasserdrache_streak_3','wasserdrache_streak_7','wasserdrache_streak_14','wasserdrache_streak_30'] },
  { id: 'coffee', title: (l)=> l==='de'? 'Kaffee-Kontrolle' : 'Coffee control', steps: ['kaffee_kontrolle_7'] },
  { id: 'ginger', title: (l)=> l==='de'? 'Ingwer-Knoblauch-Tee' : 'Ginger-garlic tea', steps: ['tee_liebhaber_20'] },
  { id: 'early', title: (l)=> l==='de'? 'Frühaufsteher' : 'Early bird', steps: ['fruehaufsteher_30'] },
  { id: 'night', title: (l)=> l==='de'? 'Nachteule' : 'Night owl', steps: ['nachteule_50'] },
  // New: Photos & Period & Profile
  { id: 'photos', title: (l)=> l==='de'? 'Fotos' : 'Photos', steps: ['photos_1','photos_5','photos_20','photos_50','photos_100','photo_days_5','photo_days_10','photo_days_25','photo_days_50'] },
  { id: 'period', title: (l)=> l==='de'? 'Periode' : 'Period', steps: ['period_track_1','period_track_5','period_track_10','period_track_20','period_track_50'] },
  { id: 'profile', title: (l)=> l==='de'? 'Profil' : 'Profile', steps: ['profile_complete'] },
];

export type ChainStatus = { id: string; title: string; total: number; completed: number; nextIndex: number | null; nextPercent: number; nextId?: string; nextTitle?: string };

export function computeChains(state: Pick<AppState,'days'|'goal'|'reminders'|'chat'|'saved'|'achievementsUnlocked'|'xp'|'language'|'theme'|'profile'|'gallery'|'cycleLogs'>): ChainStatus[] {
  const ach = computeAchievements(state as any);
  const list = ach.list;
  const l = state.language;
  const byId = new Map(list.map(a => [a.id, a] as const));
  const res: ChainStatus[] = [];
  for (const def of CHAIN_DEFS) {
    let completed = 0; let nextIndex: number | null = null; let nextPercent = 0; let nextId: string | undefined; let nextTitle: string | undefined;
    for (let i=0; i<def.steps.length; i++) {
      const id = def.steps[i];
      const a = byId.get(id);
      if (!a) continue;
      if (a.completed) completed = i+1; else if (nextIndex === null) { nextIndex = i; nextPercent = a.percent; nextId = a.id; nextTitle = a.title; }
    }
    if (nextIndex === null && completed < def.steps.length) { nextIndex = completed; }
    res.push({ id: def.id, title: def.title(l), total: def.steps.length, completed, nextIndex, nextPercent, nextId, nextTitle });
  }
  return res;
}