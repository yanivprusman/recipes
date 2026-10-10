import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import StepMode from "@/app/components/StepMode";

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

function detectLanguage(text: string): "he" | "en" {
  return /[֐-׿]/.test(text) ? "he" : "en";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return { title: recipe ? recipe.name : "recipes" };
}

export default async function StepsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const lang = detectLanguage(recipe.name);
  return <StepMode recipe={recipe} lang={lang} labels={labels[lang]} />;
}
