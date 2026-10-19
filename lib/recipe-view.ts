import type { Recipe } from "@/lib/recipes";
import { viewOf, withText, type Lang } from "@/lib/recipe-i18n";
import { scheduleTranslation } from "@/lib/translate";

/** Everything a recipe is searchable by: its name and ingredient names in both languages. */
export function searchTextOf(r: Recipe): string {
  const other = r.translations ? Object.values(r.translations).map((t) => t!.text) : [];
  return [r, ...other]
    .flatMap((t) => [t.name, ...t.ingredients.map((i) => i.name)])
    .join("\n")
    .toLowerCase();
}

/**
 * A recipe as the phone reads it in `lang`: its words in that language, narration only if it
 * is spoken in that language, and `view` saying whether this is the original or a translation
 * still catching up. A pending translation is (re)started here, as the pages do.
 */
export function recipeInLang(r: Recipe, lang: Lang) {
  const view = viewOf(r, lang);
  if (view.pending) scheduleTranslation(r.id);
  const { audio, ...rest } = withText(r, view.text);
  return {
    ...rest,
    translations: undefined,
    ...(audio?.lang === lang ? { audio } : {}),
    view: { lang, original: view.original, pending: view.pending, search: searchTextOf(r) },
  };
}

/** The `?lang=` of a phone request: absent means the raw stored recipe (older app builds). */
export function langParam(req: Request): Lang | null | { error: string } {
  const v = new URL(req.url).searchParams.get("lang");
  if (v === null) return null;
  if (v === "he" || v === "en") return v;
  return { error: `lang must be "he" or "en", not "${v}".` };
}
