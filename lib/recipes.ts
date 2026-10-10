import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { RecipeAudio, RecipeImages, RecipeVideo, RecipeYield, Ingredient } from "@/lib/recipe-media";

export { realignStepMedia } from "@/lib/recipe-media";
export type { Ingredient, RecipeYield, RecipeImages, RecipeVideo, RecipeAudio, Segment, StepMedia } from "@/lib/recipe-media";

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  yield?: RecipeYield;
  images?: RecipeImages;
  video?: RecipeVideo;
  audio?: RecipeAudio;
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

export async function getRecipes(): Promise<Recipe[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const recipes = await getRecipes();
  return recipes.find((r) => r.id === id);
}

export async function addRecipe(
  data: Omit<Recipe, "id" | "createdAt">
): Promise<Recipe> {
  const recipes = await getRecipes();
  const recipe: Recipe = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  recipes.push(recipe);
  await writeFile(DATA_FILE, JSON.stringify(recipes, null, 2), "utf-8");
  return recipe;
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const recipes = await getRecipes();
  const remaining = recipes.filter((r) => r.id !== id);
  if (remaining.length === recipes.length) return false;
  await writeFile(DATA_FILE, JSON.stringify(remaining, null, 2), "utf-8");
  return true;
}

export async function updateRecipe(
  id: string,
  data: {
    name?: string;
    ingredients: Ingredient[];
    steps: string[];
    // Sent by the editor whenever the recipe has media, so that adding or
    // removing a step keeps images/video/audio .steps aligned with steps.
    images?: RecipeImages;
    video?: RecipeVideo;
    audio?: RecipeAudio;
  }
): Promise<Recipe | undefined> {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  const { name, ingredients, steps, images, video, audio } = data;
  recipes[index] = {
    ...recipes[index],
    ...(name === undefined ? {} : { name }),
    ingredients,
    steps,
    ...(images === undefined ? {} : { images }),
    ...(video === undefined ? {} : { video }),
    ...(audio === undefined ? {} : { audio }),
  };
  await writeFile(DATA_FILE, JSON.stringify(recipes, null, 2), "utf-8");
  return recipes[index];
}

/** The phone's editor can change the yield; the web pages never do, so it is its own write. */
export async function setRecipeYield(id: string, y: RecipeYield): Promise<void> {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return;
  recipes[index] = { ...recipes[index], yield: y };
  await writeFile(DATA_FILE, JSON.stringify(recipes, null, 2), "utf-8");
}
