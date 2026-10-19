"use client";

import { useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/recipes";

export interface RecipeListItem {
  /** The recipe with its words in the language being read. */
  recipe: Recipe;
  /** Lower-cased names and ingredients in every language the recipe has. */
  searchText: string;
}

export interface RecipeListLabels {
  search: string;
  /** "{q}" is replaced by the query. */
  noMatch: string;
  /** "6 ingredients / 7 steps", per recipe id. */
  counts: Record<string, string>;
}

export default function RecipeList({ items, labels }: { items: RecipeListItem[]; labels: RecipeListLabels }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((it) => it.searchText.includes(q)) : items;

  return (
    <>
      <input
        data-id="search-recipes"
        type="search"
        dir="auto"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={labels.search}
        className="w-full mb-5 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
      />

      {filtered.length === 0 ? (
        <p className="text-stone-500">{labels.noMatch.replace("{q}", query.trim())}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map(({ recipe }) => (
            <li key={recipe.id}>
              <Link
                data-id={`recipe-card-${recipe.id}`}
                href={`/recipe/${recipe.id}`}
                className="flex items-center gap-4 bg-white border border-stone-200 rounded-xl px-5 py-4 hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block text-lg font-medium text-stone-800">
                    {recipe.name}
                  </span>
                  <span className="block text-sm text-stone-400 mt-1">
                    {labels.counts[recipe.id]}
                  </span>
                </span>
                {recipe.images?.cover && (
                  <img
                    src={recipe.images.cover}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
