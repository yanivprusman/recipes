"use server";

import { addRecipe, updateRecipe } from "@/lib/recipes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRecipe(formData: FormData) {
  const name = formData.get("name") as string;
  const ingredientNames = formData.getAll("ingredient-name") as string[];
  const ingredientQtys = formData.getAll("ingredient-qty") as string[];
  const steps = formData.getAll("step") as string[];

  const ingredients = ingredientNames
    .map((n, i) => ({ name: n.trim(), quantity: (ingredientQtys[i] || "").trim() }))
    .filter((ing) => ing.name);

  const filteredSteps = steps.map((s) => s.trim()).filter(Boolean);

  if (!name?.trim() || ingredients.length === 0 || filteredSteps.length === 0) {
    throw new Error("Name, at least one ingredient, and at least one step are required.");
  }

  await addRecipe({ name: name.trim(), ingredients, steps: filteredSteps });
  redirect("/");
}

export async function updateRecipeAction(
  id: string,
  data: { ingredients: { name: string; quantity: string }[]; steps: string[] }
) {
  const result = await updateRecipe(id, data);
  if (!result) {
    throw new Error("Recipe not found");
  }
  revalidatePath(`/recipe/${id}`);
  revalidatePath("/");
  return result;
}
