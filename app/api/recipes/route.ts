import { NextResponse } from "next/server";
import { addRecipe, getRecipes } from "@/lib/recipes";
import { parseRecipeBody } from "@/lib/recipe-body";
import { scheduleTranslation } from "@/lib/translate";
import { langParam, recipeInLang } from "@/lib/recipe-view";

export const dynamic = "force-dynamic";

/**
 * JSON API for the phone app (mobile/). Same store as the pages: data/recipes.json.
 * GET  /api/recipes        → Recipe[] (newest first)
 * POST /api/recipes        → { name, ingredients[], steps[], yield? } → Recipe (201)
 * With ?lang=he|en every Recipe comes back in that language (lib/recipe-view.ts).
 */
export async function GET(req: Request) {
  const lang = langParam(req);
  if (lang && typeof lang === "object") return NextResponse.json(lang, { status: 400 });
  const recipes = await getRecipes();
  recipes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(lang ? recipes.map((r) => recipeInLang(r, lang)) : recipes);
}

export async function POST(req: Request) {
  const lang = langParam(req);
  if (lang && typeof lang === "object") return NextResponse.json(lang, { status: 400 });
  const body = await parseRecipeBody(req);
  if ("error" in body) return NextResponse.json({ error: body.error }, { status: 400 });
  if (!body.name || body.ingredients.length === 0 || body.steps.length === 0) {
    return NextResponse.json(
      { error: "Name, at least one ingredient, and at least one step are required." },
      { status: 400 }
    );
  }
  const recipe = await addRecipe({
    name: body.name,
    ingredients: body.ingredients,
    steps: body.steps,
    ...(body.yield ? { yield: body.yield } : {}),
  });
  scheduleTranslation(recipe.id);
  return NextResponse.json(lang ? recipeInLang(recipe, lang) : recipe, { status: 201 });
}
