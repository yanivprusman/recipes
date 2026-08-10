"use client";

import { useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/recipes";

export default function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
      )
    : recipes;

  return (
    <>
      <input
        data-id="search-recipes"
        type="search"
        dir="auto"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or ingredient..."
        className="w-full mb-5 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
      />

      {filtered.length === 0 ? (
        <p className="text-stone-500">No recipes match “{query.trim()}”.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <Link
                data-id={`recipe-card-${recipe.id}`}
                href={`/recipe/${recipe.id}`}
                className="block bg-white border border-stone-200 rounded-xl px-5 py-4 hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <span dir="auto" className="block text-lg font-medium text-stone-800">
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
    </>
  );
}
