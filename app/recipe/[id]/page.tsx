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
  },
  he: {
    back: "חזרה למתכונים",
    ingredients: "מצרכים",
    preparation: "הכנה",
    yield: "תפוקה",
    scaling: "שינוי כמות",
    portions: "מנות",
    percentage: "אחוזים",
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
        href="/"
        className="text-sm text-amber-700 hover:text-amber-800 font-medium"
      >
        {dir === "rtl" ? "\u2192" : "\u2190"} {l.back}
      </Link>

      <h1 className="text-3xl font-bold text-stone-800 mt-4 mb-8">
        {recipe.name}
      </h1>

      <RecipeDetail
        recipe={recipe}
        labels={{
          ingredients: l.ingredients,
          preparation: l.preparation,
          yield: l.yield,
          scaling: l.scaling,
          portions: l.portions,
          percentage: l.percentage,
        }}
        dir={dir}
      />
    </main>
  );
}
