import Link from "next/link";
import { getRecipes } from "@/lib/recipes";
import AddRecipeForm from "@/app/components/AddRecipeForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recipes = await getRecipes();

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Recipes</h1>

      <div className="mb-8">
        <AddRecipeForm />
      </div>

      {recipes.length === 0 ? (
        <p className="text-stone-500">No recipes yet. Add your first one above!</p>
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipe/${recipe.id}`}
                className="block bg-white border border-stone-200 rounded-xl px-5 py-4 hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <span className="text-lg font-medium text-stone-800">
                  {recipe.name}
                </span>
                <span className="block text-sm text-stone-400 mt-1">
                  {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 && "s"}
                  {" / "}
                  {recipe.steps.length} step{recipe.steps.length !== 1 && "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
