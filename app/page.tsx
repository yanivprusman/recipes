import { getRecipes } from "@/lib/recipes";
import AddRecipeForm from "@/app/components/AddRecipeForm";
import RecipeList from "@/app/components/RecipeList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recipes = await getRecipes();
  const sorted = [...recipes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Recipes</h1>

      <div className="mb-8">
        <AddRecipeForm />
      </div>

      {sorted.length === 0 ? (
        <p className="text-stone-500">No recipes yet. Add your first one above!</p>
      ) : (
        <RecipeList recipes={sorted} />
      )}
    </main>
  );
}
