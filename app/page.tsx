import { getRecipes } from "@/lib/recipes";
import { viewOf, withText } from "@/lib/recipe-i18n";
import { scheduleTranslation } from "@/lib/translate";
import { searchTextOf } from "@/lib/recipe-view";
import { getViewLang } from "@/lib/view-lang";
import AddRecipeForm, { type AddRecipeLabels } from "@/app/components/AddRecipeForm";
import RecipeList, { type RecipeListItem, type RecipeListLabels } from "@/app/components/RecipeList";
import LangToggle from "@/app/components/LangToggle";

export const dynamic = "force-dynamic";

const labels = {
  en: {
    title: "Recipes",
    empty: "No recipes yet. Add your first one above!",
    list: {
      search: "Search by name or ingredient...",
      noMatch: (q: string) => `No recipes match “${q}”.`,
      ingredients: (n: number) => `${n} ingredient${n !== 1 ? "s" : ""}`,
      steps: (n: number) => `${n} step${n !== 1 ? "s" : ""}`,
    },
    form: {
      open: "+ Add Recipe",
      heading: "New Recipe",
      name: "Recipe Name",
      namePlaceholder: "e.g. Spaghetti Bolognese",
      yield: "Yield",
      amount: "Amount",
      unit: "Unit (e.g. balls, loaves)",
      ingredients: "Ingredients",
      ingredient: "Ingredient",
      quantity: "Quantity",
      addIngredient: "+ Add ingredient",
      steps: "Steps",
      step: "Step",
      addStep: "+ Add step",
      save: "Save Recipe",
      cancel: "Cancel",
    },
  },
  he: {
    title: "מתכונים",
    empty: "עדיין אין מתכונים. הוסיפו את הראשון למעלה!",
    list: {
      search: "חיפוש לפי שם או מצרך...",
      noMatch: (q: string) => `אין מתכונים שמתאימים ל„${q}”.`,
      ingredients: (n: number) => (n === 1 ? "מצרך אחד" : `${n} מצרכים`),
      steps: (n: number) => (n === 1 ? "שלב אחד" : `${n} שלבים`),
    },
    form: {
      open: "+ מתכון חדש",
      heading: "מתכון חדש",
      name: "שם המתכון",
      namePlaceholder: "למשל: שקשוקה",
      yield: "כמות",
      amount: "כמה",
      unit: "יחידה (למשל: כדורים, כיכרות)",
      ingredients: "מצרכים",
      ingredient: "מצרך",
      quantity: "כמות",
      addIngredient: "+ הוספת מצרך",
      steps: "שלבים",
      step: "שלב",
      addStep: "+ הוספת שלב",
      save: "שמירת המתכון",
      cancel: "ביטול",
    },
  },
};

export default async function Home() {
  const lang = await getViewLang();
  const l = labels[lang];
  const recipes = await getRecipes();
  const sorted = [...recipes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const items: RecipeListItem[] = sorted.map((r) => {
    const view = viewOf(r, lang);
    if (view.pending) scheduleTranslation(r.id);
    // Search finds a recipe by its words in either language.
    return { recipe: withText(r, view.text), searchText: searchTextOf(r) };
  });

  // The list's counts are functions, which cannot cross into a client component: render them here.
  const listLabels: RecipeListLabels = {
    search: l.list.search,
    noMatch: l.list.noMatch("{q}"),
    counts: Object.fromEntries(
      items.map(({ recipe: r }) => [r.id, `${l.list.ingredients(r.ingredients.length)} / ${l.list.steps(r.steps.length)}`])
    ),
  };
  const formLabels: AddRecipeLabels = l.form;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-stone-800">{l.title}</h1>
        <LangToggle lang={lang} />
      </div>

      <div className="mb-8">
        <AddRecipeForm labels={formLabels} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-stone-500">{l.empty}</p>
      ) : (
        <RecipeList items={items} labels={listLabels} />
      )}
    </main>
  );
}
