"use client";

import { useState } from "react";
import { updateRecipeAction } from "@/app/actions";
import type { Recipe } from "@/lib/recipes";

interface Props {
  recipe: Recipe;
  labels: { ingredients: string; preparation: string };
  dir: "ltr" | "rtl";
}

export default function RecipeDetail({ recipe, labels, dir }: Props) {
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [steps, setSteps] = useState(recipe.steps);
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(
    newIngredients: typeof ingredients,
    newSteps: typeof steps
  ) {
    setSaving(true);
    try {
      await updateRecipeAction(recipe.id, {
        ingredients: newIngredients,
        steps: newSteps,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleIngredientKeyDown(
    e: React.KeyboardEvent,
    i: number,
    field: "name" | "quantity"
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitIngredient(i);
    } else if (e.key === "Escape") {
      setIngredients(recipe.ingredients);
      setEditingIngredient(null);
    }
  }

  function commitIngredient(i: number) {
    setEditingIngredient(null);
    if (
      ingredients[i].name !== recipe.ingredients[i]?.name ||
      ingredients[i].quantity !== recipe.ingredients[i]?.quantity
    ) {
      save(ingredients, steps);
    }
  }

  function handleStepKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitStep(i);
    } else if (e.key === "Escape") {
      setSteps(recipe.steps);
      setEditingStep(null);
    }
  }

  function commitStep(i: number) {
    setEditingStep(null);
    if (steps[i] !== recipe.steps[i]) {
      save(ingredients, steps);
    }
  }

  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-700 mb-3">
          {labels.ingredients}
        </h2>
        <ul className="space-y-1.5">
          {ingredients.map((ing, i) => (
            <li key={i} className="flex gap-2 text-stone-700">
              {editingIngredient === i ? (
                <>
                  <input
                    autoFocus
                    value={ing.quantity}
                    onChange={(e) => {
                      const updated = [...ingredients];
                      updated[i] = { ...updated[i], quantity: e.target.value };
                      setIngredients(updated);
                    }}
                    onBlur={() => commitIngredient(i)}
                    onKeyDown={(e) => handleIngredientKeyDown(e, i, "quantity")}
                    className="w-24 font-medium rounded border border-amber-400 px-1.5 py-0.5 text-stone-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...ingredients];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setIngredients(updated);
                    }}
                    onBlur={() => commitIngredient(i)}
                    onKeyDown={(e) => handleIngredientKeyDown(e, i, "name")}
                    className="flex-1 rounded border border-amber-400 px-1.5 py-0.5 text-stone-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </>
              ) : (
                <span
                  onClick={() => setEditingIngredient(i)}
                  className="cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  title="Click to edit"
                >
                  <span className="font-medium">{ing.quantity}</span>{" "}
                  {ing.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-700 mb-3">
          {labels.preparation}
        </h2>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-stone-700">
              <span className="text-amber-600 font-bold shrink-0">
                {i + 1}.
              </span>
              {editingStep === i ? (
                <input
                  autoFocus
                  value={step}
                  onChange={(e) => {
                    const updated = [...steps];
                    updated[i] = e.target.value;
                    setSteps(updated);
                  }}
                  onBlur={() => commitStep(i)}
                  onKeyDown={(e) => handleStepKeyDown(e, i)}
                  className="flex-1 rounded border border-amber-400 px-1.5 py-0.5 text-stone-800 outline-none focus:ring-1 focus:ring-amber-500"
                />
              ) : (
                <span
                  onClick={() => setEditingStep(i)}
                  className="cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  title="Click to edit"
                >
                  {step}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {saving && (
        <p className="text-sm text-amber-600 mt-4">Saving...</p>
      )}
    </>
  );
}
