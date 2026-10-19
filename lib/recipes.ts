import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { RecipeAudio, RecipeImages, RecipeVideo, RecipeYield, Ingredient } from "@/lib/recipe-media";
import {
  baseText,
  detectLanguage,
  otherLang,
  viewOf,
  type Lang,
  type RecipeText,
  type RecipeTranslation,
} from "@/lib/recipe-i18n";

export { realignStepMedia } from "@/lib/recipe-media";
export type { Ingredient, RecipeYield, RecipeImages, RecipeVideo, RecipeAudio, Segment, StepMedia } from "@/lib/recipe-media";
export type { Lang, RecipeText, RecipeTranslation } from "@/lib/recipe-i18n";

/**
 * name / ingredients / steps / yield.unit are written in `lang`, the language the recipe
 * was entered in. Its other language lives in `translations`, kept up to date by
 * lib/translate.ts.
 */
export interface Recipe {
  id: string;
  lang: Lang;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  yield?: RecipeYield;
  images?: RecipeImages;
  video?: RecipeVideo;
  audio?: RecipeAudio;
  translations?: Partial<Record<Lang, RecipeTranslation>>;
  createdAt: string;
}

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "recipes.json");

async function ensureDataFile() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]", "utf-8");
  }
}

// Every read-modify-write of the file goes through this queue: the translator writes from the
// background while pages and the phone write too, and two interleaved writes would lose one.
// On globalThis because Next can load this module more than once in the same process.
const store = globalThis as typeof globalThis & { __recipesQueue?: Promise<unknown> };
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = (store.__recipesQueue ?? Promise.resolve()).then(fn, fn);
  store.__recipesQueue = run.catch(() => {});
  return run;
}

async function writeRecipes(recipes: Recipe[]) {
  await writeFile(DATA_FILE, JSON.stringify(recipes, null, 2), "utf-8");
}

function languageOf(text: Pick<Recipe, "name" | "steps">): Lang {
  return detectLanguage([text.name, ...text.steps].join("\n"));
}

/**
 * Recipes stored before the language toggle carry no `lang` (and their narration none
 * either). Their language is read off the text once and written back, so every environment's
 * data/recipes.json upgrades itself on first read.
 */
function upgrade(recipes: Recipe[]): boolean {
  let changed = false;
  for (const r of recipes) {
    if (!r.lang) {
      r.lang = languageOf(r);
      changed = true;
    }
    if (r.audio && !r.audio.lang) {
      r.audio = { ...r.audio, lang: r.lang };
      changed = true;
    }
  }
  return changed;
}

export async function getRecipes(): Promise<Recipe[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const recipes: Recipe[] = JSON.parse(raw);
  if (upgrade(recipes)) await writeRecipes(recipes);
  return recipes;
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const recipes = await getRecipes();
  return recipes.find((r) => r.id === id);
}

export async function addRecipe(
  data: Omit<Recipe, "id" | "createdAt" | "lang" | "translations">
): Promise<Recipe> {
  return locked(async () => {
    const recipes = await getRecipes();
    const recipe: Recipe = {
      ...data,
      id: crypto.randomUUID(),
      lang: languageOf(data),
      createdAt: new Date().toISOString(),
    };
    recipes.push(recipe);
    await writeRecipes(recipes);
    return recipe;
  });
}

export async function deleteRecipe(id: string): Promise<boolean> {
  return locked(async () => {
    const recipes = await getRecipes();
    const remaining = recipes.filter((r) => r.id !== id);
    if (remaining.length === recipes.length) return false;
    await writeRecipes(remaining);
    return true;
  });
}

export class TranslationPendingError extends Error {
  constructor() {
    super("The translation is still being updated; try again in a few seconds.");
  }
}

/**
 * Editing in the recipe's other language makes that language the original: the translation
 * becomes the recipe and the old text becomes its translation, made from the translation as
 * it stood before the edit. Only the edited items then differ from their source, so only they
 * are re-translated, and every untouched line keeps the wording it was written with.
 */
function swapLanguage(r: Recipe, to: Lang): Recipe {
  const t = r.translations?.[to];
  if (!t || viewOf(r, to).pending) throw new TranslationPendingError();
  const from = r.lang;
  return {
    ...r,
    lang: to,
    name: t.text.name,
    ingredients: t.text.ingredients,
    steps: t.text.steps,
    ...(r.yield ? { yield: { ...r.yield, unit: t.text.yieldUnit! } } : {}),
    translations: { [from]: { text: baseText(r), source: t.text } },
  };
}

/** Drop one ingredient/step from a translation and its source, so the rest stay aligned. */
function dropFromTranslation(t: RecipeTranslation, removed: Removed): RecipeTranslation {
  const drop = (text: RecipeText): RecipeText => ({
    ...text,
    ingredients: removed.ingredient === undefined
      ? text.ingredients
      : text.ingredients.filter((_, i) => i !== removed.ingredient),
    steps: removed.step === undefined ? text.steps : text.steps.filter((_, i) => i !== removed.step),
  });
  return { text: drop(t.text), source: drop(t.source) };
}

export interface Removed {
  ingredient?: number;
  step?: number;
}

export async function updateRecipe(
  id: string,
  data: {
    /** The language the edit was made in (what the editor was showing). */
    lang: Lang;
    name?: string;
    ingredients: Ingredient[];
    steps: string[];
    /** The one ingredient/step this edit deleted, so the translation drops the same one. */
    removed?: Removed;
    // Sent by the editor whenever the recipe has media, so that adding or
    // removing a step keeps images/video/audio .steps aligned with steps.
    images?: RecipeImages;
    video?: RecipeVideo;
    audio?: RecipeAudio;
  }
): Promise<Recipe | undefined> {
  return locked(async () => {
    const recipes = await getRecipes();
    const index = recipes.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    const { lang, name, ingredients, steps, removed, images, video, audio } = data;
    let r = recipes[index];
    if (lang !== r.lang) r = swapLanguage(r, lang);
    const other = otherLang(r.lang);
    const t = r.translations?.[other];
    if (t && removed) r = { ...r, translations: { [other]: dropFromTranslation(t, removed) } };
    recipes[index] = {
      ...r,
      ...(name === undefined ? {} : { name }),
      ingredients,
      steps,
      ...(images === undefined ? {} : { images }),
      ...(video === undefined ? {} : { video }),
      ...(audio === undefined ? {} : { audio }),
    };
    await writeRecipes(recipes);
    return recipes[index];
  });
}

/** The phone's editor can change the yield; the web pages never do, so it is its own write. */
export async function setRecipeYield(id: string, y: RecipeYield): Promise<void> {
  return locked(async () => {
    const recipes = await getRecipes();
    const index = recipes.findIndex((r) => r.id === id);
    if (index === -1) return;
    recipes[index] = { ...recipes[index], yield: y };
    await writeRecipes(recipes);
  });
}

/**
 * Store a translation made from `snapshot` (the recipe's text when the translator started).
 * `done` holds the translated parts; a part is only accepted if the recipe still reads the
 * same there, otherwise the old (stale) entry stays and the next pass picks it up.
 */
export async function storeTranslation(
  id: string,
  from: Lang,
  snapshot: RecipeText,
  done: {
    name?: string;
    yieldUnit?: string;
    ingredients: Map<number, Ingredient>;
    steps: Map<number, string>;
  }
): Promise<void> {
  return locked(async () => {
    const recipes = await getRecipes();
    const index = recipes.findIndex((r) => r.id === id);
    if (index === -1) return;
    const r = recipes[index];
    if (r.lang !== from) return; // edited in the other language meanwhile: the next pass redoes it
    const to = otherLang(from);
    const now = baseText(r);
    const old = r.translations?.[to];
    const sameIng = (a?: Ingredient, b?: Ingredient) => !!a && !!b && a.name === b.name && a.quantity === b.quantity;

    const ingredients = now.ingredients.map((ing, i) => {
      const t = done.ingredients.get(i);
      if (t && sameIng(ing, snapshot.ingredients[i])) return { text: t, source: ing };
      return {
        text: old?.text.ingredients[i] ?? { name: "", quantity: "" },
        source: old?.source.ingredients[i] ?? { name: "", quantity: "" },
      };
    });
    const steps = now.steps.map((step, i) => {
      const t = done.steps.get(i);
      if (t !== undefined && step === snapshot.steps[i]) return { text: t, source: step };
      return { text: old?.text.steps[i] ?? "", source: old?.source.steps[i] ?? "" };
    });
    const name =
      done.name !== undefined && now.name === snapshot.name
        ? { text: done.name, source: now.name }
        : { text: old?.text.name ?? "", source: old?.source.name ?? "" };
    const yieldUnit =
      done.yieldUnit !== undefined && now.yieldUnit === snapshot.yieldUnit
        ? { text: done.yieldUnit, source: now.yieldUnit }
        : { text: old?.text.yieldUnit, source: old?.source.yieldUnit };

    const pick = <K extends "text" | "source">(k: K): RecipeText => ({
      name: name[k],
      ingredients: ingredients.map((x) => x[k]),
      steps: steps.map((x) => x[k]),
      ...(yieldUnit[k] !== undefined ? { yieldUnit: yieldUnit[k] } : {}),
    });
    recipes[index] = { ...r, translations: { [to]: { text: pick("text"), source: pick("source") } } };
    await writeRecipes(recipes);
  });
}
