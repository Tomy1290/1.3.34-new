import { AppState } from '../store/useStore';
import { computeAIPro } from './insights';
import { searchRecipes, pickDailySuggestions } from './recipes';
import { answerKnowledge } from './knowledge';

function t(lang: 'de'|'en'|'pl', de: string, en: string, pl?: string) { return lang==='en'?en:(lang==='pl'?(pl||en):de); }

export async function localGreeting(state: AppState) {
  const lang = state.language as 'de'|'en'|'pl';
  const tips = computeAIPro({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled, cycleLogs: state.cycleLogs });
  const tip = tips[0]?.text || t(lang,'Trink heute morgens ein Glas Wasser mehr.','Add one extra glass of water in the morning.','Dodaj rano jedną szklankę wody.');
  const picks = pickDailySuggestions(lang).slice(0,2);
  const rec = picks.map(p => `• ${p.title[lang]} (${p.durationMin} Min)`).join('\n');
  const txt = t(lang,
    `Tipp: ${tip}\nHinweis: Schau dir diese Rezepte an:\n${rec}`,
    `Tip: ${tip}\nNote: Check these recipes:\n${rec}`,
    `Wskazówka: ${tip}\nUwaga: Sprawdź te przepisy:\n${rec}`
  );
  return txt;
}

export async function localReply(state: AppState, userText: string) {
  const lang = state.language as 'de'|'en'|'pl';
  const q = userText.toLowerCase();

  // knowledge first (cycle & weight)
  const know = answerKnowledge(state, userText);
  if (know) return know;

  // recipes intent
  if (/(rezept|recipe|przepis|kochen|cook)/.test(q)) {
    const results = searchRecipes({ lang, keywords: userText, limit: 5 });
    if (results.length === 0) {
      const picks = pickDailySuggestions(lang).slice(0,3);
      const list = picks.map(p => `• ${p.title[lang]} – ${p.desc[lang]}`).join('\n');
      return t(lang, 
        `Keine passenden Rezepte gefunden. Vorschläge:\n${list}\n\n💡 Tipp: Nutze den "Rezepte filtern" Button für eine detaillierte Suche!`, 
        `No matching recipes. Suggestions:\n${list}\n\n💡 Tip: Use the "Filter recipes" button for detailed search!`, 
        `Brak pasujących przepisów. Propozycje:\n${list}\n\n💡 Wskazówka: Użyj przycisku "Filtruj przepisy" dla szczegółowego wyszukiwania!`
      );
    }
    const list = results.map(r => `• ${r.title[lang]} – ${r.desc[lang]}`).join('\n');
    return t(lang, 
      `Hier sind Rezepte für dich:\n${list}\n\n💡 Tipp: Nutze den "Rezepte filtern" Button unten für mehr Details und Filter-Optionen!`, 
      `Here are recipes for you:\n${list}\n\n💡 Tip: Use the "Filter recipes" button below for more details and filter options!`, 
      `Oto przepisy dla ciebie:\n${list}\n\n💡 Wskazówka: Użyj przycisku "Filtruj przepisy" poniżej, aby uzyskać więcej szczegółów i opcji filtrowania!`
    );
  }

  // analysis/tips intent
  if (/(analyse|analysis|analiza|trink|wasser|water|kaffee|coffee|pille|pills|sport)/.test(q)) {
    const tips = computeAIPro({ days: state.days, language: state.language, aiFeedback: state.aiFeedback, aiInsightsEnabled: state.aiInsightsEnabled, cycleLogs: state.cycleLogs });
    const top = tips.slice(0,3).map(x => `• ${x.text}`).join('\n');
    if (top) return t(lang, `Kurze Analyse & Tipps:\n${top}`, `Quick analysis & tips:\n${top}`, `Krótka analiza i wskazówki:\n${top}`);
  }

  // smalltalk default
  const fallback = t(lang,
    'Erzähl mir, wie es dir heute geht – oder frag nach Rezepten (z. B. „italienisches Abendessen, low carb”). Ich habe extra Wissen zu Zyklus & Gewicht.',
    'Tell me how you feel today – or ask for recipes (e.g., “Italian dinner, low carb”). I have extra knowledge for cycle & weight.',
    'Powiedz, jak się dziś czujesz – albo poproś o przepisy (np. „włoska kolacja, low carb”). Mam dodatkową wiedzę o cyklu i wadze.'
  );
  return fallback;
}