import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
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

export async function updateRecipe(
  id: string,
  data: { ingredients: Ingredient[]; steps: string[] }
): Promise<Recipe | undefined> {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  recipes[index] = { ...recipes[index], ...data };
  await writeFile(DATA_FILE, JSON.stringify(recipes, null, 2), "utf-8");
  return recipes[index];
}
