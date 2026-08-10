import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import RecipeDetail from "@/app/components/RecipeDetail";

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
  },
};

function detectLanguage(text: string): "he" | "en" {
  return /[\u0590-\u05FF]/.test(text) ? "he" : "en";
}

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

  const lang = detectLanguage(recipe.name);
  const l = labels[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <main className="max-w-2xl mx-auto px-4 py-10" dir={dir} lang={lang}>
      <Link
        data-id="back-to-recipes"
        href="/"
        className="text-sm text-amber-700 hover:text-amber-800 font-medium"
      >
        {dir === "rtl" ? "\u2192" : "\u2190"} {l.back}
      </Link>

      <RecipeDetail
        recipe={recipe}
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
        }}
      />
    </main>
  );
}
