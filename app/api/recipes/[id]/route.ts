import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  TranslationPendingError,
  deleteRecipe,
  getRecipe,
  realignStepMedia,
  setRecipeYield,
  updateRecipe,
} from "@/lib/recipes";
import { parseRecipeBody } from "@/lib/recipe-body";
import { scheduleTranslation } from "@/lib/translate";
import { langParam, recipeInLang } from "@/lib/recipe-view";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/recipes/:id[?lang=he|en] → Recipe (in that language, see lib/recipe-view.ts) */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const lang = langParam(req);
  if (lang && typeof lang === "object") return NextResponse.json(lang, { status: 400 });
  const recipe = await getRecipe(id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  return NextResponse.json(lang ? recipeInLang(recipe, lang) : recipe);
}

/**
 * PUT /api/recipes/:id[?lang=he|en] → { name?, ingredients[], steps[], yield? } → Recipe.
 * ?lang is the language the phone was showing, so the edit is made in it (and the reply is
 * in it); without it the edit is in the recipe's own language. 409 while that language's
 * translation is still being made.
 * Media (images/video/audio) is not editable from the phone yet; when the step count
 * changes, per-step media is realigned by position (padded/truncated).
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const lang = langParam(req);
  if (lang && typeof lang === "object") return NextResponse.json(lang, { status: 400 });
  const body = await parseRecipeBody(req);
  if ("error" in body) return NextResponse.json({ error: body.error }, { status: 400 });
  if (body.hasName && !body.name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  if (body.ingredients.length === 0 || body.steps.length === 0) {
    return NextResponse.json({ error: "At least one ingredient and one step are required." }, { status: 400 });
  }
  const existing = await getRecipe(id);
  if (!existing) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  let updated;
  try {
    updated = await updateRecipe(id, {
      lang: lang ?? existing.lang,
      ...(body.hasName ? { name: body.name } : {}),
      ingredients: body.ingredients,
      steps: body.steps,
      ...(existing.steps.length !== body.steps.length ? realignStepMedia(existing, body.steps.length) : {}),
    });
  } catch (err) {
    if (err instanceof TranslationPendingError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
  if (!updated) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  // yield is not part of updateRecipe's contract (the web editor never changes it);
  // it stays a separate, explicit write so the pages' code path is untouched.
  if (body.yield !== undefined) await setRecipeYield(id, body.yield);
  scheduleTranslation(id);
  revalidatePath(`/recipe/${id}`);
  revalidatePath(`/recipe/${id}/steps`);
  revalidatePath("/");
  const saved = (await getRecipe(id))!;
  return NextResponse.json(lang ? recipeInLang(saved, lang) : saved);
}

/** DELETE /api/recipes/:id → { ok: true } */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const deleted = await deleteRecipe(id);
  if (!deleted) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
