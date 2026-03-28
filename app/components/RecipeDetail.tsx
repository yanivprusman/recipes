"use client";

import { useState } from "react";
import { updateRecipeAction } from "@/app/actions";
import type { Recipe } from "@/lib/recipes";

interface Props {
  recipe: Recipe;
  labels: {
    ingredients: string;
    preparation: string;
    yield: string;
    scaling: string;
    portions: string;
    percentage: string;
  };
  dir: "ltr" | "rtl";
}

function scaleQuantity(quantity: string, factor: number): string {
  if (factor === 1) return quantity;
  const match = quantity.match(/^(\d+(?:[.,]\d+)?)/);
  if (!match) return quantity;
  const original = parseFloat(match[1].replace(",", "."));
  const scaled = original * factor;
  const display =
    scaled === Math.floor(scaled)
      ? String(scaled)
      : scaled.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return quantity.replace(match[1], display);
}

function formatScaled(n: number): string {
  return n === Math.floor(n)
    ? String(n)
    : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function scaleStepText(
  text: string,
  factor: number,
  yieldAmount: number,
  yieldUnit: string
): string {
  if (factor === 1) return text;
  const pattern = new RegExp(`(${yieldAmount})(\\s*${yieldUnit})`, "g");
  return text.replace(pattern, (_, _num, suffix) => {
    return formatScaled(yieldAmount * factor) + suffix;
  });
}

export default function RecipeDetail({ recipe, labels, dir }: Props) {
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [steps, setSteps] = useState(recipe.steps);
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [scaleMode, setScaleMode] = useState<"portions" | "percentage">("portions");
  const [scaleInput, setScaleInput] = useState(
    recipe.yield ? String(recipe.yield.amount) : "100"
  );

  const scaleFactor = (() => {
    const val = parseFloat(scaleInput);
    if (isNaN(val) || val <= 0) return 1;
    if (scaleMode === "percentage") return val / 100;
    if (recipe.yield) return val / recipe.yield.amount;
    return 1;
  })();

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
      {recipe.yield && (
        <section className="mb-6">
          <p className="text-sm text-stone-500 mb-3">
            <span className="font-medium">{labels.yield}:</span>{" "}
            {recipe.yield.amount} {recipe.yield.unit}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-stone-700 mb-2">
              {labels.scaling}
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={scaleMode}
                onChange={(e) => {
                  const mode = e.target.value as "portions" | "percentage";
                  setScaleMode(mode);
                  setScaleInput(
                    mode === "portions" ? String(recipe.yield!.amount) : "100"
                  );
                }}
                className="rounded-lg border border-amber-300 px-2 py-1.5 text-sm text-stone-700 bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              >
                <option value="portions">{labels.portions}</option>
                <option value="percentage">{labels.percentage}</option>
              </select>
              <input
                type="number"
                min="0"
                step="any"
                value={scaleInput}
                onChange={(e) => setScaleInput(e.target.value)}
                className="w-24 rounded-lg border border-amber-300 px-2 py-1.5 text-sm text-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              {scaleMode === "percentage" && (
                <span className="text-sm text-stone-500">%</span>
              )}
              {scaleMode === "portions" && (
                <span className="text-sm text-stone-500">
                  {recipe.yield.unit}
                </span>
              )}
              {scaleFactor !== 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setScaleInput(
                      scaleMode === "portions"
                        ? String(recipe.yield!.amount)
                        : "100"
                    )
                  }
                  className="text-sm text-amber-700 hover:text-amber-800 font-medium"
                >
                  Reset
                </button>
              )}
            </div>
            {scaleFactor !== 1 && (
              <p className="text-xs text-stone-400 mt-1.5">
                ×{scaleFactor.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}
              </p>
            )}
          </div>
        </section>
      )}

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
                  <span className="font-medium">
                    {scaleQuantity(ing.quantity, scaleFactor)}
                  </span>{" "}
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
                  {recipe.yield
                    ? scaleStepText(step, scaleFactor, recipe.yield.amount, recipe.yield.unit)
                    : step}
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
