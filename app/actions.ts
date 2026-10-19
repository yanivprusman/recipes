"use server";

import { addRecipe, updateRecipe, deleteRecipe } from "@/lib/recipes";
import type { Lang, RecipeAudio, RecipeImages, RecipeVideo, Removed } from "@/lib/recipes";
import { scheduleTranslation } from "@/lib/translate";
import { LANG_COOKIE } from "@/lib/recipe-i18n";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** The toggle: which language every page is read in, remembered for a year in this browser. */
export async function setViewLang(lang: Lang) {
  if (lang !== "he" && lang !== "en") throw new Error(`Unknown language: ${lang}`);
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function createRecipe(formData: FormData) {
  const name = formData.get("name") as string;
  const ingredientNames = formData.getAll("ingredient-name") as string[];
  const ingredientQtys = formData.getAll("ingredient-qty") as string[];
  const steps = formData.getAll("step") as string[];
  const yieldAmount = formData.get("yield-amount") as string;
  const yieldUnit = formData.get("yield-unit") as string;

  const ingredients = ingredientNames
    .map((n, i) => ({ name: n.trim(), quantity: (ingredientQtys[i] || "").trim() }))
    .filter((ing) => ing.name);

  const filteredSteps = steps.map((s) => s.trim()).filter(Boolean);

  if (!name?.trim() || ingredients.length === 0 || filteredSteps.length === 0) {
    throw new Error("Name, at least one ingredient, and at least one step are required.");
  }

  const recipeData: Parameters<typeof addRecipe>[0] = {
    name: name.trim(),
    ingredients,
    steps: filteredSteps,
  };

  const parsedAmount = parseFloat(yieldAmount);
  if (parsedAmount > 0 && yieldUnit?.trim()) {
    recipeData.yield = { amount: parsedAmount, unit: yieldUnit.trim() };
  }

  const recipe = await addRecipe(recipeData);
  scheduleTranslation(recipe.id);
  redirect("/");
}

export async function deleteRecipeAction(id: string) {
  const deleted = await deleteRecipe(id);
  if (!deleted) {
    throw new Error("Recipe not found");
  }
  revalidatePath("/");
  redirect("/");
}

export async function updateRecipeAction(
  id: string,
  data: {
    lang: Lang;
    name?: string;
    ingredients: { name: string; quantity: string }[];
    steps: string[];
    removed?: Removed;
    images?: RecipeImages;
    video?: RecipeVideo;
    audio?: RecipeAudio;
  }
) {
  const result = await updateRecipe(id, data);
  if (!result) {
    throw new Error("Recipe not found");
  }
  scheduleTranslation(id);
  revalidatePath(`/recipe/${id}`);
  revalidatePath(`/recipe/${id}/steps`);
  revalidatePath("/");
  return result;
}
