import type { Ingredient } from "@/lib/recipes";

export interface RecipeBody {
  name?: string;
  ingredients: Ingredient[];
  steps: string[];
  yield?: { amount: number; unit: string };
  hasName: boolean;
}

/** Validates the JSON body shared by POST and PUT. Trims, drops empty rows. */
export async function parseRecipeBody(req: Request): Promise<RecipeBody | { error: string }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: "Body must be JSON." };
  }
  if (!raw || typeof raw !== "object") return { error: "Body must be a JSON object." };
  const o = raw as Record<string, unknown>;
  const hasName = typeof o.name === "string";
  const name = hasName ? (o.name as string).trim() : undefined;
  if (!Array.isArray(o.ingredients) || !Array.isArray(o.steps)) {
    return { error: "ingredients and steps must be arrays." };
  }
  const ingredients: Ingredient[] = [];
  for (const ing of o.ingredients) {
    if (!ing || typeof ing !== "object") return { error: "Each ingredient must be { name, quantity }." };
    const { name: n, quantity: q } = ing as Record<string, unknown>;
    if (typeof n !== "string" || (q !== undefined && typeof q !== "string")) {
      return { error: "Each ingredient must be { name, quantity }." };
    }
    if (n.trim()) ingredients.push({ name: n.trim(), quantity: (q ?? "").trim() });
  }
  const steps: string[] = [];
  for (const s of o.steps) {
    if (typeof s !== "string") return { error: "Each step must be a string." };
    if (s.trim()) steps.push(s.trim());
  }
  let yld: RecipeBody["yield"];
  if (o.yield !== undefined && o.yield !== null) {
    const y = o.yield as Record<string, unknown>;
    const amount = typeof y.amount === "number" ? y.amount : parseFloat(String(y.amount));
    const unit = typeof y.unit === "string" ? y.unit.trim() : "";
    if (!(amount > 0) || !unit) return { error: "yield must be { amount > 0, unit }." };
    yld = { amount, unit };
  }
  return { name, ingredients, steps, yield: yld, hasName };
}
