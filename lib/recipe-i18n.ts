// Client-safe: the two languages a recipe can be read in, and how a recipe looks in each.
// No Node imports here (see lib/recipe-media.ts for why).

import type { Ingredient } from "@/lib/recipe-media";

export type Lang = "he" | "en";

export const LANG_COOKIE = "recipes.lang";

export const LANG_NAMES: Record<Lang, { he: string; en: string }> = {
  he: { he: "עברית", en: "Hebrew" },
  en: { he: "אנגלית", en: "English" },
};

export function otherLang(l: Lang): Lang {
  return l === "he" ? "en" : "he";
}

export function dirOf(l: Lang): "rtl" | "ltr" {
  return l === "he" ? "rtl" : "ltr";
}

export function detectLanguage(text: string): Lang {
  return /[֐-׿]/.test(text) ? "he" : "en";
}

/** The words of a recipe in one language: everything a translation has to carry. */
export interface RecipeText {
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  yieldUnit?: string;
}

/**
 * A recipe in its other language, and the original text it was made from. Wherever `source`
 * no longer matches the recipe (an item was edited or added since), that item is stale and
 * gets re-translated; everything else is kept, so a one-word edit never rewrites the rest.
 * An item that was never translated has an empty source ("" / { name: "", quantity: "" }).
 */
export interface RecipeTranslation {
  text: RecipeText;
  source: RecipeText;
}

/** The fields of a stored recipe this module needs; Recipe (lib/recipes.ts) satisfies it. */
export interface TextHolder {
  lang: Lang;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  yield?: { amount: number; unit: string };
  translations?: Partial<Record<Lang, RecipeTranslation>>;
}

export function baseText(r: TextHolder): RecipeText {
  return {
    name: r.name,
    ingredients: r.ingredients,
    steps: r.steps,
    ...(r.yield ? { yieldUnit: r.yield.unit } : {}),
  };
}

/** Which parts of `base` the translation made from `source` does not cover. */
export interface TextDiff {
  name: boolean;
  yieldUnit: boolean;
  ingredients: number[];
  steps: number[];
}

export function diffText(base: RecipeText, source: RecipeText): TextDiff {
  const ingredients: number[] = [];
  base.ingredients.forEach((ing, i) => {
    const s = source.ingredients[i];
    if (!s || s.name !== ing.name || s.quantity !== ing.quantity) ingredients.push(i);
  });
  const steps: number[] = [];
  base.steps.forEach((step, i) => {
    if (source.steps[i] !== step) steps.push(i);
  });
  return {
    name: base.name !== source.name,
    yieldUnit: base.yieldUnit !== undefined && base.yieldUnit !== source.yieldUnit,
    ingredients,
    steps,
  };
}

export function isEmptyDiff(d: TextDiff): boolean {
  return !d.name && !d.yieldUnit && d.ingredients.length === 0 && d.steps.length === 0;
}

export interface RecipeView {
  /** The language the page is being read in. */
  lang: Lang;
  text: RecipeText;
  /** true when `lang` is the language the recipe was written in. */
  original: boolean;
  /**
   * The translation is missing or behind the original. Untranslated parts are shown in the
   * original language until the translator catches up (seconds); editing waits for it.
   */
  pending: boolean;
}

export function viewOf(r: TextHolder, lang: Lang): RecipeView {
  const base = baseText(r);
  if (lang === r.lang) return { lang, text: base, original: true, pending: false };
  const t = r.translations?.[lang];
  if (!t) return { lang, text: base, original: false, pending: true };
  const d = diffText(base, t.source);
  const staleIng = new Set(d.ingredients);
  const staleStep = new Set(d.steps);
  return {
    lang,
    original: false,
    pending: !isEmptyDiff(d),
    text: {
      name: d.name ? base.name : t.text.name,
      ingredients: base.ingredients.map((ing, i) => (staleIng.has(i) ? ing : t.text.ingredients[i])),
      steps: base.steps.map((s, i) => (staleStep.has(i) ? s : t.text.steps[i])),
      ...(base.yieldUnit !== undefined ? { yieldUnit: d.yieldUnit ? base.yieldUnit : t.text.yieldUnit } : {}),
    },
  };
}

/** The recipe with its words swapped for the ones shown in `view`; media and ids untouched. */
export function withText<T extends TextHolder>(r: T, text: RecipeText): T {
  return {
    ...r,
    name: text.name,
    ingredients: text.ingredients,
    steps: text.steps,
    ...(r.yield && text.yieldUnit !== undefined ? { yield: { ...r.yield, unit: text.yieldUnit } } : {}),
  };
}
