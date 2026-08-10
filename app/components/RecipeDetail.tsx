"use client";

import { useState } from "react";
import { updateRecipeAction, deleteRecipeAction } from "@/app/actions";
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
    reset: string;
    addIngredient: string;
    addStep: string;
    deleteRecipe: string;
    confirmDelete: string;
    confirmYes: string;
    confirmNo: string;
  };
}

function parseLeadingNumber(s: string): { value: number; raw: string } | null {
  const mixedMatch = s.match(/^(\d+(?:[.,]\d+)?)\s+(\d+)\/(\d+)/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1].replace(",", "."));
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den > 0) return { value: whole + num / den, raw: mixedMatch[0] };
  }
  const fracMatch = s.match(/^(\d+)\/(\d+)/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den > 0) return { value: num / den, raw: fracMatch[0] };
  }
  const decMatch = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (decMatch) {
    return { value: parseFloat(decMatch[1].replace(",", ".")), raw: decMatch[1] };
  }
  return null;
}

function scaleQuantity(quantity: string, factor: number): string {
  if (factor === 1) return quantity;
  const parsed = parseLeadingNumber(quantity);
  if (!parsed) return quantity;
  const scaled = parsed.value * factor;
  return quantity.replace(parsed.raw, formatScaled(scaled));
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

function shiftSetAfterRemoval(set: Set<number>, removed: number): Set<number> {
  const next = new Set<number>();
  for (const idx of set) {
    if (idx === removed) continue;
    next.add(idx > removed ? idx - 1 : idx);
  }
  return next;
}

function toggledSet(set: Set<number>, i: number): Set<number> {
  const next = new Set(set);
  if (next.has(i)) {
    next.delete(i);
  } else {
    next.add(i);
  }
  return next;
}

export default function RecipeDetail({ recipe, labels }: Props) {
  const [name, setName] = useState(recipe.name);
  const [ingredients, setIngredients] = useState(recipe.ingredients);
  const [steps, setSteps] = useState(recipe.steps);
  const [editingName, setEditingName] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ephemeral cook-mode state: never persisted, resets on reload.
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

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
    newName: string,
    newIngredients: typeof ingredients,
    newSteps: typeof steps
  ) {
    setSaving(true);
    try {
      await updateRecipeAction(recipe.id, {
        name: newName,
        ingredients: newIngredients,
        steps: newSteps,
      });
    } finally {
      setSaving(false);
    }
  }

  function commitName() {
    setEditingName(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setName(recipe.name);
      return;
    }
    if (trimmed !== recipe.name) {
      setName(trimmed);
      save(trimmed, ingredients, steps);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitName();
    } else if (e.key === "Escape") {
      setName(recipe.name);
      setEditingName(false);
    }
  }

  function handleIngredientKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitIngredient(i);
    } else if (e.key === "Escape") {
      setIngredients(recipe.ingredients);
      setCheckedIngredients(new Set());
      setEditingIngredient(null);
    }
  }

  function commitIngredient(i: number) {
    setEditingIngredient(null);

    const current = ingredients[i];
    if (!current) return;

    // An ingredient cleared to nothing is a deletion.
    if (!current.name.trim() && !current.quantity.trim()) {
      removeIngredient(i);
      return;
    }

    const oldQty = recipe.ingredients[i]?.quantity;
    const newQty = current.quantity;
    const nameChanged = current.name !== recipe.ingredients[i]?.name;
    const qtyChanged = newQty !== oldQty;

    if (!nameChanged && !qtyChanged) return;

    let updatedIngredients = ingredients;

    if (qtyChanged && oldQty) {
      const oldParsed = parseLeadingNumber(oldQty);
      const newParsed = parseLeadingNumber(newQty);

      if (oldParsed && newParsed) {
        const oldVal = oldParsed.value;
        const newVal = newParsed.value;

        if (oldVal > 0 && newVal > 0 && oldVal !== newVal) {
          const ratio = newVal / oldVal;
          updatedIngredients = ingredients.map((ing, idx) => {
            if (idx === i) return ing;
            return { ...ing, quantity: scaleQuantity(ing.quantity, ratio) };
          });
          setIngredients(updatedIngredients);
        }
      }
    }

    save(name, updatedIngredients, steps);
  }

  function removeIngredient(i: number) {
    const updated = ingredients.filter((_, idx) => idx !== i);
    setIngredients(updated);
    setCheckedIngredients(shiftSetAfterRemoval(checkedIngredients, i));
    setEditingIngredient(null);
    save(name, updated, steps);
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: "", quantity: "" }]);
    setEditingIngredient(ingredients.length);
  }

  function handleStepKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitStep(i);
    } else if (e.key === "Escape") {
      setSteps(recipe.steps);
      setDoneSteps(new Set());
      setEditingStep(null);
    }
  }

  function commitStep(i: number) {
    setEditingStep(null);
    if (!steps[i]?.trim()) {
      removeStep(i);
      return;
    }
    if (steps[i] !== recipe.steps[i]) {
      save(name, ingredients, steps);
    }
  }

  function removeStep(i: number) {
    const updated = steps.filter((_, idx) => idx !== i);
    setSteps(updated);
    setDoneSteps(shiftSetAfterRemoval(doneSteps, i));
    setEditingStep(null);
    save(name, ingredients, updated);
  }

  function addStep() {
    setSteps([...steps, ""]);
    setEditingStep(steps.length);
  }

  return (
    <>
      {editingName ? (
        <input
          data-id="recipe-name-input"
          autoFocus
          dir="auto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={handleNameKeyDown}
          className="w-full text-3xl font-bold text-stone-800 mt-4 mb-8 rounded border border-amber-400 px-2 py-1 outline-none focus:ring-1 focus:ring-amber-500"
        />
      ) : (
        <h1
          data-id="recipe-name"
          onClick={() => setEditingName(true)}
          title="Click to edit"
          className="text-3xl font-bold text-stone-800 mt-4 mb-8 cursor-pointer hover:bg-amber-50 rounded px-2 py-1 -mx-2 transition-colors"
        >
          {name}
        </h1>
      )}

      {recipe.yield && (
        <section className="mb-6">
          <p className="text-sm text-stone-500 mb-3">
            <span className="font-medium">{labels.yield}:</span>{" "}
            {recipe.yield.amount} {recipe.yield.unit}
          </p>

          <div className="flex gap-2 items-center flex-wrap text-sm text-stone-500">
            <span>{labels.scaling}:</span>
            <select
              data-id="scale-mode"
              value={scaleMode}
              onChange={(e) => {
                const mode = e.target.value as "portions" | "percentage";
                setScaleMode(mode);
                setScaleInput(
                  mode === "portions" ? String(recipe.yield!.amount) : "100"
                );
              }}
              className="rounded border border-stone-200 px-1.5 py-1 text-sm text-stone-600 bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none cursor-pointer"
            >
              <option value="portions">{labels.portions}</option>
              <option value="percentage">{labels.percentage}</option>
            </select>
            <input
              data-id="scale-input"
              type="number"
              min="0"
              step="any"
              value={scaleInput}
              onChange={(e) => setScaleInput(e.target.value)}
              className="w-20 rounded border border-stone-200 px-1.5 py-1 text-sm text-stone-600 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none"
            />
            {scaleMode === "percentage" && (
              <span>%</span>
            )}
            {scaleMode === "portions" && (
              <span>{recipe.yield.unit}</span>
            )}
            {scaleFactor !== 1 && (
              <>
                <span className="text-stone-400">
                  ×{scaleFactor.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}
                </span>
                <button
                  data-id="scale-reset"
                  type="button"
                  onClick={() =>
                    setScaleInput(
                      scaleMode === "portions"
                        ? String(recipe.yield!.amount)
                        : "100"
                    )
                  }
                  className="text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {labels.reset}
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-700 mb-3">
          {labels.ingredients}
        </h2>
        <ul className="space-y-1.5">
          {ingredients.map((ing, i) => {
            const checked = checkedIngredients.has(i);
            return (
              <li key={i} className="flex gap-2 items-start text-stone-700">
                <button
                  data-id={`ingredient-check-${i}`}
                  type="button"
                  aria-pressed={checked}
                  onClick={() =>
                    setCheckedIngredients(toggledSet(checkedIngredients, i))
                  }
                  className={`mt-1.5 h-4 w-4 shrink-0 rounded-full border cursor-pointer transition-colors ${
                    checked
                      ? "bg-amber-500 border-amber-500"
                      : "bg-white border-stone-300 hover:border-amber-500"
                  }`}
                />
                {editingIngredient === i ? (
                  <span
                    className="flex gap-2 flex-1"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        commitIngredient(i);
                      }
                    }}
                  >
                    <input
                      data-id={`ingredient-qty-input-${i}`}
                      autoFocus
                      dir="auto"
                      value={ing.quantity}
                      onChange={(e) => {
                        const updated = [...ingredients];
                        updated[i] = { ...updated[i], quantity: e.target.value };
                        setIngredients(updated);
                      }}
                      onKeyDown={(e) => handleIngredientKeyDown(e, i)}
                      className="w-24 font-medium rounded border border-amber-400 px-1.5 py-0.5 text-stone-800 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      data-id={`ingredient-name-input-${i}`}
                      dir="auto"
                      value={ing.name}
                      onChange={(e) => {
                        const updated = [...ingredients];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setIngredients(updated);
                      }}
                      onKeyDown={(e) => handleIngredientKeyDown(e, i)}
                      className="flex-1 rounded border border-amber-400 px-1.5 py-0.5 text-stone-800 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      data-id={`remove-ingredient-${i}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => removeIngredient(i)}
                      title="Remove ingredient"
                      className="text-stone-400 hover:text-red-500 text-lg px-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span
                    data-id={`ingredient-${i}`}
                    onClick={() => setEditingIngredient(i)}
                    className={`cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 py-0.5 transition-colors ${
                      checked ? "line-through text-stone-400" : ""
                    }`}
                    title="Click to edit"
                  >
                    <span className="font-medium">
                      {scaleQuantity(ing.quantity, scaleFactor)}
                    </span>{" "}
                    {ing.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <button
          data-id="add-ingredient"
          type="button"
          onClick={addIngredient}
          className="mt-2 text-sm text-amber-700 hover:text-amber-800 font-medium cursor-pointer"
        >
          + {labels.addIngredient}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-700 mb-3">
          {labels.preparation}
        </h2>
        <ol className="space-y-3">
          {steps.map((step, i) => {
            const done = doneSteps.has(i);
            return (
              <li key={i} className="flex gap-3 text-stone-700">
                <button
                  data-id={`step-check-${i}`}
                  type="button"
                  aria-pressed={done}
                  onClick={() => setDoneSteps(toggledSet(doneSteps, i))}
                  title="Mark step as done"
                  className={`font-bold shrink-0 self-start cursor-pointer transition-colors ${
                    done
                      ? "text-stone-300 line-through"
                      : "text-amber-600 hover:text-amber-700"
                  }`}
                >
                  {i + 1}.
                </button>
                {editingStep === i ? (
                  <span
                    className="flex gap-2 flex-1"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        commitStep(i);
                      }
                    }}
                  >
                    <textarea
                      data-id={`step-input-${i}`}
                      autoFocus
                      dir="auto"
                      rows={Math.max(2, Math.ceil(step.length / 60))}
                      value={step}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[i] = e.target.value;
                        setSteps(updated);
                      }}
                      onKeyDown={(e) => handleStepKeyDown(e, i)}
                      className="flex-1 resize-y rounded border border-amber-400 px-1.5 py-0.5 text-stone-800 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      data-id={`remove-step-${i}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => removeStep(i)}
                      title="Remove step"
                      className="self-start text-stone-400 hover:text-red-500 text-lg px-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span
                    data-id={`step-${i}`}
                    onClick={() => setEditingStep(i)}
                    className={`cursor-pointer whitespace-pre-wrap hover:bg-amber-50 rounded px-1 -mx-1 py-0.5 transition-colors ${
                      done ? "text-stone-400" : ""
                    }`}
                    title="Click to edit"
                  >
                    {recipe.yield
                      ? scaleStepText(step, scaleFactor, recipe.yield.amount, recipe.yield.unit)
                      : step}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <button
          data-id="add-step"
          type="button"
          onClick={addStep}
          className="mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium cursor-pointer"
        >
          + {labels.addStep}
        </button>
      </section>

      {saving && (
        <p className="text-sm text-amber-600 mt-4">Saving...</p>
      )}

      <section className="mt-12 pt-6 border-t border-stone-200">
        {confirmingDelete ? (
          <div className="flex gap-3 items-center flex-wrap">
            <span className="text-sm text-stone-600">{labels.confirmDelete}</span>
            <button
              data-id="confirm-delete"
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteRecipeAction(recipe.id);
                } catch {
                  setDeleting(false);
                  setConfirmingDelete(false);
                }
              }}
              className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              {labels.confirmYes}
            </button>
            <button
              data-id="cancel-delete"
              type="button"
              disabled={deleting}
              onClick={() => setConfirmingDelete(false)}
              className="text-sm text-stone-500 hover:text-stone-700 px-2 py-1.5 font-medium cursor-pointer"
            >
              {labels.confirmNo}
            </button>
          </div>
        ) : (
          <button
            data-id="delete-recipe"
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-stone-400 hover:text-red-600 font-medium transition-colors cursor-pointer"
          >
            {labels.deleteRecipe}
          </button>
        )}
      </section>
    </>
  );
}
