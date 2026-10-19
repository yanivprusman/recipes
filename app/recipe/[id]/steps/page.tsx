import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import StepMode from "@/app/components/StepMode";
import { viewOf, withText } from "@/lib/recipe-i18n";
import { scheduleTranslation } from "@/lib/translate";
import { getViewLang } from "@/lib/view-lang";

export const dynamic = "force-dynamic";

const labels = {
  en: {
    back: "Recipe",
    ingredients: "Ingredients",
    step: "Step",
    steps: "steps",
    of: "of",
    scroll: "Scroll",
    done: "Enjoy!",
    startOver: "Start over",
    backToRecipe: "Back to the recipe",
    listen: "Listen",
    stop: "Stop",
    narrationOn: "Narration on",
    narrationOff: "Narration off",
  },
  he: {
    back: "למתכון",
    ingredients: "מצרכים",
    step: "שלב",
    steps: "שלבים",
    of: "מתוך",
    scroll: "גללו",
    done: "בתיאבון!",
    startOver: "מההתחלה",
    backToRecipe: "חזרה למתכון",
    listen: "השמעה",
    stop: "עצירה",
    narrationOn: "קריינות פועלת",
    narrationOff: "קריינות כבויה",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return { title: recipe ? viewOf(recipe, await getViewLang()).text.name : "recipes" };
}

export default async function StepsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const lang = await getViewLang();
  const view = viewOf(recipe, lang);
  if (view.pending) scheduleTranslation(recipe.id);
  // Narration is recorded in one language; someone reading the other one gets none.
  const { audio, ...rest } = withText(recipe, view.text);
  const shown = audio?.lang === lang ? { ...rest, audio } : rest;
  return <StepMode recipe={shown} lang={lang} labels={labels[lang]} />;
}
