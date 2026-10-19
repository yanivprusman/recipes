import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteRecipe, getRecipe, realignStepMedia, setRecipeYield, updateRecipe } from "@/lib/recipes";
import { parseRecipeBody } from "@/lib/recipe-body";
import { scheduleTranslation } from "@/lib/translate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/recipes/:id → Recipe */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

/**
 * PUT /api/recipes/:id → { name?, ingredients[], steps[], yield? } → Recipe.
 * Media (images/video/audio) is not editable from the phone yet; when the step count
 * changes, per-step media is realigned by position (padded/truncated).
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await parseRecipeBody(req);
  if ("error" in body) return NextResponse.json({ error: body.error }, { status: 400 });
  if (body.hasName && !body.name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  if (body.ingredients.length === 0 || body.steps.length === 0) {
    return NextResponse.json({ error: "At least one ingredient and one step are required." }, { status: 400 });
  }
  const existing = await getRecipe(id);
  if (!existing) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  // The phone edits the recipe in the language it was written in.
  const updated = await updateRecipe(id, {
    lang: existing.lang,
    ...(body.hasName ? { name: body.name } : {}),
    ingredients: body.ingredients,
    steps: body.steps,
    ...(existing.steps.length !== body.steps.length ? realignStepMedia(existing, body.steps.length) : {}),
  });
  if (!updated) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  // yield is not part of updateRecipe's contract (the web editor never changes it);
  // it stays a separate, explicit write so the pages' code path is untouched.
  if (body.yield !== undefined) await setRecipeYield(id, body.yield);
  scheduleTranslation(id);
  revalidatePath(`/recipe/${id}`);
  revalidatePath(`/recipe/${id}/steps`);
  revalidatePath("/");
  return NextResponse.json(await getRecipe(id));
}

/** DELETE /api/recipes/:id → { ok: true } */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const deleted = await deleteRecipe(id);
  if (!deleted) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
