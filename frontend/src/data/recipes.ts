export type Cuisine = 'de'|'pl'|'it'|'gr'|'tr'|'us';
export type Meal = 'breakfast'|'lunch'|'dinner';
export type Category = 'fleisch'|'lowcarb'|'abnehmen'|'vegetarisch'|'kuchen'|'suesses';

export type LocalText = { de: string; en: string; pl: string };

export type Recipe = {
  id: string;
  cuisine: Cuisine;
  meal: Meal;
  category: Category;
  title: LocalText;
  desc: LocalText;
  durationMin: number;
  kcal: number;
  ingredients: { de: string[]; en: string[]; pl: string[] };
  steps: { de: string[]; en: string[]; pl: string[] };
};

const CUISINES: Cuisine[] = ['de','pl','it','gr','tr','us'];
const MEALS: Meal[] = ['breakfast','lunch','dinner'];
const CATS: Category[] = ['fleisch','lowcarb','abnehmen','vegetarisch','kuchen','suesses'];

const BASE_DE: Record<Category, string[]> = {
  fleisch: ['Hähnchenpfanne','Rinderstreifen','Hackpfanne','Putenfilet','Schweinefilet','Schnitzel','Frikadellen','Fleischspieße','Gulasch schnell','Steakstreifen','Hackbällchen','Curry-Hähnchen','Gyros-Pfanne','Kebap-Teller'],
  lowcarb: ['Zucchini-Nudeln','Blumenkohlreis','Kohlrabi-Pommes','Ei-Wrap','Lachs mit Brokkoli','Thunfischsalat','Shakshuka','Griechischer Salat','Gefüllte Paprika','Auberginen-Schiffchen','Kohlrabi-Carbonara','Rinderfilet auf Spargel','Pilzpfanne','Huevos Rancheros'],
  abnehmen: ['Gemüsepfanne','Leichter Quark','Haferschale','Mageres Chili','Hähnchen aus dem Ofen','Linsensuppe','Tomatensuppe','Krautsalat','Forelle mit Salat','Ofengemüse','Joghurt mit Beeren','Thunfisch auf Salat','Brühe mit Gemüse','Zucchini-Suppe'],
  vegetarisch: ['Gemüseomelett','Pasta Arrabbiata','Tomate-Mozzarella','Falafel-Box','Griechischer Salat','Käse-Spätzle','Pilzrisotto','Ratatouille','Gemüse-Lasagne','Bohnen-Eintopf','Brokkoli-Kartoffel-Pfanne','Couscous-Salat','Caprese-Sandwich','Spinat-Feta-Pfanne'],
  kuchen: ['Rührkuchen','Apfelkuchen','Marmorkuchen','Schokokuchen','Zitronenkuchen','Käsekuchen','Karottenkuchen','Bananenbrot','Mohnkuchen','Brownies','Mandelkuchen','Muffins Vanille','Muffins Schoko','Russischer Zupfkuchen'],
  suesses: ['Grießbrei','Milchreis','Pfannkuchen','Waffeln','Joghurtcreme','Quarkdessert','Karamellpudding','Vanillepudding','Schoko-Creme','Obstsalat','Erdbeerquark','Bircher Müsli','Energy Balls','Schoko-Hafer-Becher'],
};

const BASE_EN: Record<Category, string[]> = {
  fleisch: ['Chicken skillet','Beef strips','Minced pan','Turkey fillet','Pork fillet','Schnitzel','Meatballs','Skewers','Quick goulash','Steak strips','Meat dumplings','Chicken curry','Gyros skillet','Kebab plate'],
  lowcarb: ['Zucchini noodles','Cauliflower rice','Kohlrabi fries','Egg wrap','Salmon & broccoli','Tuna salad','Shakshuka','Greek salad','Stuffed peppers','Eggplant boats','Kohlrabi carbonara','Beef & asparagus','Mushroom pan','Huevos Rancheros'],
  abnehmen: ['Veggie pan','Light quark','Oat bowl','Lean chili','Oven chicken','Lentil soup','Tomato soup','Cabbage salad','Trout & salad','Roasted veggies','Yogurt with berries','Tuna on salad','Clear broth veggies','Zucchini soup'],
  vegetarisch: ['Veg omelette','Pasta arrabbiata','Tomato mozzarella','Falafel box','Greek salad','Cheese spaetzle','Mushroom risotto','Ratatouille','Veg lasagna','Bean stew','Broccoli potato pan','Couscous salad','Caprese sandwich','Spinach feta pan'],
  kuchen: ['Pound cake','Apple pie','Marble cake','Chocolate cake','Lemon cake','Cheesecake','Carrot cake','Banana bread','Poppy seed cake','Brownies','Almond cake','Vanilla muffins','Chocolate muffins','Zupfkuchen'],
  suesses: ['Semolina pudding','Rice pudding','Pancakes','Waffles','Yogurt cream','Quark dessert','Caramel pudding','Vanilla pudding','Chocolate cream','Fruit salad','Strawberry quark','Bircher muesli','Energy balls','Choco-oat cup'],
};

const BASE_PL: Record<Category, string[]> = {
  fleisch: ['Patelnia z kurczakiem','Paski wołowe','Patelnia z mielonym','Filet z indyka','Polędwica wieprzowa','Sznycel','Klopsiki','Szaszłyki','Szybki gulasz','Paski stekowe','Pulpety','Kurczak curry','Patelnia gyros','Talerz kebab'],
  lowcarb: ['Makaron z cukinii','Ryż z kalafiora','Frytki z kalarepy','Zawijaniec jajeczny','Łosoś z brokułem','Sałatka z tuńczykiem','Szakszuka','Sałatka grecka','Faszerowana papryka','Łódki z bakłażana','Carbonara z kalarepy','Wołowina ze szparagami','Patelnia grzybowa','Huevos Rancheros'],
  abnehmen: ['Warzywna patelnia','Lekki twaróg','Miska owsiana','Lekkie chili','Kurczak z pieca','Zupa z soczewicy','Zupa pomidorowa','Sałatka z kapusty','Pstrąg z sałatą','Warzywa z pieca','Jogurt z owocami','Tuńczyk na sałacie','Bulion z warzywami','Zupa z cukinii'],
  vegetarisch: ['Omlet warzywny','Makaron arrabbiata','Pomidor mozzarella','Falafel box','Sałatka grecka','Käsespätzle (serowe)','Risotto grzybowe','Ratatouille','Lasagne warzywna','Gulasz z fasoli','Patelnia brokuł-ziemniak','Sałatka kuskus','Kanapka caprese','Patelnia szpinak-feta'],
  kuchen: ['Ciasto ucierane','Szarlotka','Ciasto marmurkowe','Ciasto czekoladowe','Ciasto cytrynowe','Sernik','Ciasto marchewkowe','Chlebek bananowy','Ciasto makowe','Brownie','Ciasto migdałowe','Muffiny waniliowe','Muffiny czekoladowe','Sernik „Zupfkuchen”'],
  suesses: ['Kasza manna na mleku','Ryż na mleku','Naleśniki','Gofry','Krem jogurtowy','Deser z twarogu','Budyń karmelowy','Budyń waniliowy','Krem czekoladowy','Sałatka owocowa','Twaróg truskawkowy','Musli birchera','Kulki mocy','Kubek z płatkami i kakao'],
};

function mkTitle(cat: Category, idx: number): LocalText {
  return { de: BASE_DE[cat][idx], en: BASE_EN[cat][idx], pl: BASE_PL[cat][idx] } as const;
}

function mkIngredients(cat: Category, cuisine: Cuisine, lang: 'de'|'en'|'pl') {
  // Procedural minimal ingredient templates
  const base = {
    de: ['Olivenöl', 'Salz', 'Pfeffer'],
    en: ['Olive oil','Salt','Pepper'],
    pl: ['Oliwa','Sól','Pieprz'],
  };
  const extraByCat: Record<Category, Record<'de'|'en'|'pl', string[]>> = {
    fleisch: { de: ['Hähnchen/ Rind/ Pute', 'Paprika', 'Zwiebel'], en: ['Chicken/Beef/Turkey','Bell pepper','Onion'], pl: ['Kurczak/Wołowina/Indyk','Papryka','Cebula'] },
    lowcarb: { de: ['Zucchini/Kohlrabi', 'Ei', 'Käse'], en: ['Zucchini/Kohlrabi','Egg','Cheese'], pl: ['Cukinia/Kalarepa','Jajko','Ser'] },
    abnehmen: { de: ['Magerquark/Brühe', 'Gemüse-Mix'], en: ['Low-fat quark/Broth','Veg mix'], pl: ['Chudy twaróg/Bulion','Miks warzyw'] },
    vegetarisch: { de: ['Gemüse-Mix', 'Käse/Feta'], en: ['Veg mix','Cheese/Feta'], pl: ['Miks warzyw','Ser/Feta'] },
    kuchen: { de: ['Mehl','Eier','Zucker','Butter'], en: ['Flour','Eggs','Sugar','Butter'], pl: ['Mąka','Jajka','Cukier','Masło'] },
    suesses: { de: ['Milch','Grieß/Reis','Zucker'], en: ['Milk','Semolina/Rice','Sugar'], pl: ['Mleko','Kasza manna/Ryż','Cukier'] },
  };
  const catExtra = extraByCat[cat][lang];
  const baseList = base[lang];
  // Cuisine tweak
  const tweak: Record<Cuisine, Record<'de'|'en'|'pl', string>> = {
    de: { de:'Petersilie', en:'Parsley', pl:'Pietruszka' },
    pl: { de:'Koperek', en:'Dill', pl:'Koperek' },
    it: { de:'Basilikum', en:'Basil', pl:'Bazylia' },
    gr: { de:'Oregano', en:'Oregano', pl:'Oregano' },
    tr: { de:'Paprika edelsüß', en:'Sweet paprika', pl:'Papryka słodka' },
    us: { de:'BBQ-Gewürz', en:'BBQ spice', pl:'Przyprawa BBQ' },
  };
  return [...catExtra, ...baseList, tweak[cuisine][lang]].slice(0,7);
}

function mkSteps(cat: Category, cuisine: Cuisine, lang: 'de'|'en'|'pl') {
  const s: Record<'de'|'en'|'pl', string[]> = {
    de: ['Schneiden/Vorbereiten','Anbraten/Erhitzen','Würzen & garen','Abschmecken & servieren'],
    en: ['Chop/prepare','Sauté/heat','Season & cook','Taste & serve'],
    pl: ['Kroić/przygotować','Podsmażyć/podgrzać','Doprawić i gotować','Doprawić i podać'],
  };
  // Add cuisine hint
  const hint: Record<Cuisine, Record<'de'|'en'|'pl', string>> = {
    de: { de:'Mit Petersilie bestreuen.', en:'Garnish with parsley.', pl:'Posypać pietruszką.' },
    pl: { de:'Z koperkiem.', en:'Add dill.', pl:'Z koperkiem.' },
    it: { de:'Mit Basilikum servieren.', en:'Serve with basil.', pl:'Podawać z bazylią.' },
    gr: { de:'Mit Oregano abrunden.', en:'Finish with oregano.', pl:'Doprawić oregano.' },
    tr: { de:'Mit Paprika verfeinern.', en:'Add sweet paprika.', pl:'Dodać słodką paprykę.' },
    us: { de:'BBQ‑Note geben.', en:'Add BBQ note.', pl:'Nadać nutę BBQ.' },
  };
  return [...s[lang], hint[cuisine][lang]];
}

export function generateRecipes(): Recipe[] {
  const out: Recipe[] = [];
  let idCounter = 1;
  for (const cuisine of CUISINES) {
    for (const meal of MEALS) {
      for (const cat of CATS) {
        for (let i = 0; i < 14; i++) {
          const idx = i % 14;
          const title = mkTitle(cat, idx);
          const titleAll = { de: title.de, en: title.en, pl: title.pl };
          const dur = 10 + ((i * 5 + (meal==='dinner'?10:0)) % 35);
          const kcalBase = cat==='kuchen' || cat==='suesses' ? 420 : (cat==='abnehmen' ? 280 : 360);
          const kcal = kcalBase + ((i*17) % 120);
          const descAll = {
            de: `${titleAll.de} – ${cuisine.toUpperCase()} · ${meal==='breakfast'?'Frühstück':meal==='lunch'?'Mittag':'Abend'} · ${dur} Min · ca. ${kcal} kcal.`,
            en: `${titleAll.en} – ${cuisine.toUpperCase()} · ${meal==='breakfast'?'Breakfast':meal==='lunch'?'Lunch':'Dinner'} · ${dur} min · ~${kcal} kcal.`,
            pl: `${titleAll.pl} – ${cuisine.toUpperCase()} · ${meal==='breakfast'?'Śniadanie':meal==='lunch'?'Obiad':'Kolacja'} · ${dur} min · ok. ${kcal} kcal.`,
          };
          const ingredients = {
            de: mkIngredients(cat, cuisine, 'de'),
            en: mkIngredients(cat, cuisine, 'en'),
            pl: mkIngredients(cat, cuisine, 'pl'),
          };
          const steps = {
            de: mkSteps(cat, cuisine, 'de'),
            en: mkSteps(cat, cuisine, 'en'),
            pl: mkSteps(cat, cuisine, 'pl'),
          };
          out.push({ id: `r${idCounter++}`, cuisine, meal, category: cat, title: titleAll, desc: descAll, durationMin: dur, kcal, ingredients, steps });
        }
      }
    }
  }
  return out;
}