import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import RecipeDetail from "@/app/components/RecipeDetail";
import LangToggle from "@/app/components/LangToggle";
import TranslationNotice from "@/app/components/TranslationNotice";
import { LANG_NAMES, dirOf, viewOf, withText } from "@/lib/recipe-i18n";
import { scheduleTranslation } from "@/lib/translate";
import { getViewLang } from "@/lib/view-lang";

export const dynamic = "force-dynamic";

const labels = {
  en: {
    back: "Back to recipes",
    ingredients: "Ingredients",
    preparation: "Preparation",
    yield: "Yield",
    scaling: "Scale recipe",
    portions: "Portions",
    percentage: "Percentage",
    reset: "Reset",
    addIngredient: "Add ingredient",
    addStep: "Add step",
    deleteRecipe: "Delete recipe",
    confirmDelete: "Delete this recipe permanently?",
    confirmYes: "Delete",
    confirmNo: "Cancel",
    stepMode: "Step by step",
    clickToEdit: "Click to edit",
    removeIngredient: "Remove ingredient",
    removeStep: "Remove step",
    markDone: "Mark step as done",
    saving: "Saving...",
    translating: "Translating into English… parts not yet translated are shown in Hebrew.",
    editAfterTranslation: "Editing opens once the translation is ready.",
    originalIn: (l: string) => `Written in ${l}; translated automatically.`,
  },
  he: {
    back: "חזרה למתכונים",
    ingredients: "מצרכים",
    preparation: "הכנה",
    yield: "תפוקה",
    scaling: "שינוי כמות",
    portions: "מנות",
    percentage: "אחוזים",
    reset: "איפוס",
    addIngredient: "הוספת מצרך",
    addStep: "הוספת שלב",
    deleteRecipe: "מחיקת מתכון",
    confirmDelete: "למחוק את המתכון לצמיתות?",
    confirmYes: "מחק",
    confirmNo: "ביטול",
    stepMode: "שלב אחר שלב",
    clickToEdit: "לחצו לעריכה",
    removeIngredient: "הסרת מצרך",
    removeStep: "הסרת שלב",
    markDone: "סימון השלב כבוצע",
    saving: "שומר...",
    translating: "מתרגם לעברית… מה שעוד לא תורגם מוצג באנגלית.",
    editAfterTranslation: "העריכה תיפתח כשהתרגום יהיה מוכן.",
    originalIn: (l: string) => `נכתב ב${l}; תורגם אוטומטית.`,
  },
};

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    notFound();
  }

  const lang = await getViewLang();
  const l = labels[lang];
  const dir = dirOf(lang);
  const view = viewOf(recipe, lang);
  if (view.pending) scheduleTranslation(recipe.id);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10" dir={dir} lang={lang}>
      <div className="flex items-center justify-between gap-4">
        <Link
          data-id="back-to-recipes"
          href="/"
          className="text-sm text-amber-700 hover:text-amber-800 font-medium"
        >
          {dir === "rtl" ? "\u2192" : "\u2190"} {l.back}
        </Link>
        <span className="flex items-center gap-2">
        <LangToggle lang={lang} />
        <Link
          data-id="step-mode"
          href={`/recipe/${recipe.id}/steps`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 px-3.5 py-1.5 rounded-full transition-colors"
        >
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-amber-200" />
          {l.stepMode}
        </Link>
        </span>
      </div>

      {view.pending ? (
        <TranslationNotice text={`${l.translating} ${l.editAfterTranslation}`} />
      ) : (
        !view.original && (
          <p data-id="translated-note" className="mt-4 text-xs text-stone-400">
            {l.originalIn(LANG_NAMES[recipe.lang][lang])}
          </p>
        )
      )}

      <RecipeDetail
        // A new language (or the translation arriving) starts the editor over from that text.
        key={`${lang}:${view.pending}`}
        // The editor only needs the words on screen; translations stay on the server.
        recipe={{ ...withText(recipe, view.text), translations: undefined }}
        lang={lang}
        editable={!view.pending}
        labels={{
          ingredients: l.ingredients,
          preparation: l.preparation,
          yield: l.yield,
          scaling: l.scaling,
          portions: l.portions,
          percentage: l.percentage,
          reset: l.reset,
          addIngredient: l.addIngredient,
          addStep: l.addStep,
          deleteRecipe: l.deleteRecipe,
          confirmDelete: l.confirmDelete,
          confirmYes: l.confirmYes,
          confirmNo: l.confirmNo,
          clickToEdit: l.clickToEdit,
          removeIngredient: l.removeIngredient,
          removeStep: l.removeStep,
          markDone: l.markDone,
          saving: l.saving,
        }}
      />
    </main>
  );
}
