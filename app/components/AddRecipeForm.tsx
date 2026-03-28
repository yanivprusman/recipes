"use client";

import { useState } from "react";
import { createRecipe } from "@/app/actions";

export default function AddRecipeForm() {
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "" }]);
  const [steps, setSteps] = useState([""]);
  const [open, setOpen] = useState(false);

  function addIngredient() {
    setIngredients([...ingredients, { name: "", quantity: "" }]);
  }

  function removeIngredient(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i));
  }

  function addStep() {
    setSteps([...steps, ""]);
  }

  function removeStep(i: number) {
    setSteps(steps.filter((_, idx) => idx !== i));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
      >
        + Add Recipe
      </button>
    );
  }

  return (
    <form
      action={createRecipe}
      className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-stone-800 mb-4">New Recipe</h2>

      <label className="block mb-4">
        <span className="text-sm font-medium text-stone-600">Recipe Name</span>
        <input
          name="name"
          required
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          placeholder="e.g. Spaghetti Bolognese"
        />
      </label>

      <fieldset className="mb-4">
        <legend className="text-sm font-medium text-stone-600 mb-2">
          Yield
        </legend>
        <div className="flex gap-2 items-center">
          <input
            name="yield-amount"
            type="number"
            min="0"
            step="any"
            placeholder="Amount"
            className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
          <input
            name="yield-unit"
            placeholder="Unit (e.g. balls, loaves)"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="text-sm font-medium text-stone-600 mb-2">
          Ingredients
        </legend>
        <div className="space-y-2">
          {ingredients.map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                name="ingredient-name"
                required
                placeholder="Ingredient"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <input
                name="ingredient-qty"
                required
                placeholder="Quantity"
                className="w-32 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="text-stone-400 hover:text-red-500 text-lg px-1"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
        >
          + Add ingredient
        </button>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="text-sm font-medium text-stone-600 mb-2">
          Steps
        </legend>
        <div className="space-y-2">
          {steps.map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-stone-400 text-sm w-6 text-right shrink-0">
                {i + 1}.
              </span>
              <input
                name="step"
                required
                placeholder={`Step ${i + 1}`}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-stone-400 hover:text-red-500 text-lg px-1"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="mt-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
        >
          + Add step
        </button>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          Save Recipe
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setIngredients([{ name: "", quantity: "" }]);
            setSteps([""]);
          }}
          className="text-stone-500 hover:text-stone-700 px-4 py-2.5 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
