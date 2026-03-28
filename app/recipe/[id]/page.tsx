import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";

export const dynamic = "force-dynamic";

const labels = {
  en: { back: "Back to recipes", ingredients: "Ingredients", preparation: "Preparation" },
  he: { back: "חזרה למתכונים", ingredients: "מצרכים", preparation: "הכנה" },
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

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-700 mb-3">
          {l.ingredients}
        </h2>
        <ul className="space-y-1.5">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex gap-2 text-stone-700">
              <span className="font-medium">{ing.quantity}</span>
              <span>{ing.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-700 mb-3">
          {l.preparation}
        </h2>
        <ol className="space-y-3">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-stone-700">
              <span className="text-amber-600 font-bold shrink-0">
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
