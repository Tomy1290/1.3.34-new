import { Recipe, generateRecipes, Cuisine, Meal, Category } from '../data/recipes';

let CACHE: Recipe[] | null = null;
export function getAllRecipes(): Recipe[] { if (!CACHE) CACHE = generateRecipes(); return CACHE!; }

export type RecipeQuery = {
  lang: 'de'|'en'|'pl';
  cuisine?: Cuisine | 'any';
  meal?: Meal | 'any';
  category?: Category | 'any';
  keywords?: string;
  limit?: number;
};

export function searchRecipes(q: RecipeQuery) {
  const all = getAllRecipes();
  const kw = (q.keywords||'').toLowerCase().trim();
  let list = all.filter(r => (
    (!q.cuisine || q.cuisine==='any' || r.cuisine===q.cuisine) &&
    (!q.meal || q.meal==='any' || r.meal===q.meal) &&
    (!q.category || q.category==='any' || r.category===q.category) &&
    (!kw || r.title[q.lang].toLowerCase().includes(kw) || r.desc[q.lang].toLowerCase().includes(kw))
  ));
  if ((q.limit||0) > 0) list = list.slice(0, q.limit!);
  return list;
}

export function pickDailySuggestions(lang: 'de'|'en'|'pl') {
  const all = getAllRecipes();
  const seed = new Date().getDate();
  const a = all[(seed * 13) % all.length];
  const b = all[(seed * 29 + 7) % all.length];
  const c = all[(seed * 31 + 11) % all.length];
  return [a,b,c];
}

export function getRecipeDetail(id: string) {
  const r = getAllRecipes().find(x=>x.id===id);
  return r || null;
}