import { computeAchievements } from "../achievements";
import { AppState } from "../store/useStore";

export type ChainDef = { id: string; title: (l:'de'|'en')=>string; steps: string[] };

export const CHAIN_DEFS: ChainDef[] = [
  { id: 'perfect', title: (l)=> l==='de'? 'Perfekte Tage' : 'Perfect days', steps: ['perfekte_woche_7','perfekter_monat_30','diamant_status_100','zen_meister_365'] },
  { id: 'pills', title: (l)=> l==='de'? 'Pillen‑Meister' : 'Pill mastery', steps: ['pillen_profi_7','pillen_legende_100','jahres_champion_365'] },
  { id: 'weight_loss', title: (l)=> l==='de'? 'Gewichtsziele' : 'Weight goals', steps: ['erste_erfolge_2kg','grosser_erfolg_5kg','transformation_10kg','mega_transformation_20kg'] },
  { id: 'usage', title: (l)=> l==='de'? 'Dranbleiben' : 'Consistency', steps: ['first_steps_7','bestaendigkeits_koenig_200'] },
  { id: 'water', title: (l)=> l==='de'? 'Wasser' : 'Water', steps: ['wasserdrache_5'] },
  { id: 'coffee', title: (l)=> l==='de'? 'Kaffee-Kontrolle' : 'Coffee control', steps: ['kaffee_kontrolle_7'] },
  { id: 'ginger', title: (l)=> l==='de'? 'Ingwer-Knoblauch-Tee' : 'Ginger-garlic tea', steps: ['tee_liebhaber_20'] },
  { id: 'early', title: (l)=> l==='de'? 'Frühaufsteher' : 'Early bird', steps: ['fruehaufsteher_30'] },
  { id: 'night', title: (l)=> l==='de'? 'Nachteule' : 'Night owl', steps: ['nachteule_50'] },
];

export type ChainStatus = { id: string; title: string; total: number; completed: number; nextIndex: number | null; nextPercent: number; nextId?: string; nextTitle?: string };

export function computeChains(state: Pick<AppState,'days'|'goal'|'reminders'|'chat'|'saved'|'achievementsUnlocked'|'xp'|'language'|'theme'>): ChainStatus[] {
  const ach = computeAchievements(state);
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