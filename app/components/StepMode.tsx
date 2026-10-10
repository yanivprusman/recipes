"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/recipes";

export interface StepModeLabels {
  back: string;
  ingredients: string;
  step: string;
  steps: string;
  of: string;
  scroll: string;
  done: string;
  startOver: string;
  backToRecipe: string;
}

interface Props {
  recipe: Recipe;
  lang: "he" | "en";
  labels: StepModeLabels;
}

/**
 * "Knead: push, fold, turn" -> { lead: "Knead", body: "push, fold, turn" }.
 * Presentation only — the step text itself is stored as one string.
 */
function splitLead(text: string): { lead: string | null; body: string } {
  const m = text.match(/^([^:\n]{2,40}):\s+([\s\S]+)$/);
  if (!m) return { lead: null, body: text };
  return { lead: m[1].trim(), body: m[2].trim() };
}

type Slide =
  | { kind: "cover"; id: string; image?: string }
  | { kind: "ingredients"; id: string; image?: string }
  | { kind: "step"; id: string; image?: string; index: number; text: string }
  | { kind: "end"; id: string; image?: string };

export default function StepMode({ recipe, lang, labels }: Props) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const stepImages = recipe.images?.steps ?? [];
  const lastStepImage = [...stepImages].reverse().find((s) => s) ?? undefined;
  const slides: Slide[] = [
    { kind: "cover", id: "cover", image: recipe.images?.cover },
    { kind: "ingredients", id: "ingredients", image: recipe.images?.ingredients },
    ...recipe.steps.map((text, index) => ({
      kind: "step" as const,
      id: `step-${index + 1}`,
      image: stepImages[index] ?? undefined,
      index,
      text,
    })),
    { kind: "end", id: "end", image: lastStepImage ?? recipe.images?.cover },
  ];
  const n = slides.length;

  // Which slide is on screen: lights its text up (and replays the entrance
  // every time it comes back into view), drives the counter and the URL hash.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("section[data-slide]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          const on = e.isIntersecting && e.intersectionRatio >= 0.55;
          el.classList.toggle("in", on);
          if (on) {
            const i = sections.indexOf(el);
            setActive(i);
            const hash = `#${el.dataset.slide}`;
            if (window.location.hash !== hash) history.replaceState(null, "", hash);
          }
        }
      },
      { root, threshold: [0.55] }
    );
    sections.forEach((s) => io.observe(s));
    // Deep link: /steps#step-3 opens on that step.
    const target = window.location.hash && root.querySelector<HTMLElement>(
      `section[data-slide="${CSS.escape(window.location.hash.slice(1))}"]`
    );
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
    return () => io.disconnect();
  }, [recipe.id]);

  // Keep the screen on while cooking (phones dim within a minute otherwise).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Denied (low battery, not user-visible, etc.): nothing to do.
      }
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      lock?.release();
    };
  }, []);

  function goTo(i: number) {
    const root = scrollerRef.current;
    const el = root?.querySelectorAll<HTMLElement>("section[data-slide]")[i];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const stepCount = recipe.steps.length;
  const progress = n > 1 ? active / (n - 1) : 1;

  return (
    <div className="sm" dir={dir} lang={lang}>
      <header className="sm-bar">
        <Link data-id="step-mode-back" href={`/recipe/${recipe.id}`} className="sm-back">
          <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span> {labels.back}
        </Link>
        <span data-id="step-mode-counter" className="sm-counter" dir="ltr" aria-live="polite">
          {active + 1} / {n}
        </span>
        <div className="sm-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      <div ref={scrollerRef} className="sm-scroller" data-id="step-mode-scroller">
        {slides.map((s, i) => (
          <section
            key={s.id}
            data-slide={s.id}
            data-id={`slide-${s.id}`}
            className={`sm-slide sm-${s.kind}${s.image ? "" : " sm-nophoto"}`}
          >
            {s.image && (
              <>
                <img className="sm-blur" src={s.image} alt="" aria-hidden="true" />
                <img
                  className="sm-photo"
                  src={s.image}
                  alt=""
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                />
              </>
            )}
            <div className="sm-scrim" aria-hidden="true" />

            {s.kind === "cover" && (
              <div className="sm-text sm-text-center">
                {recipe.yield && (
                  <p className="sm-kicker">
                    {recipe.yield.amount} {recipe.yield.unit}
                  </p>
                )}
                <h1 className="sm-title">{recipe.name}</h1>
                <p className="sm-sub">
                  {recipe.ingredients.length} {labels.ingredients.toLowerCase()} · {stepCount}{" "}
                  {labels.steps}
                </p>
                <button
                  type="button"
                  data-id="step-mode-scroll-hint"
                  className="sm-hint"
                  onClick={() => goTo(1)}
                >
                  {labels.scroll}
                  <span className="sm-chevron" aria-hidden="true" />
                </button>
              </div>
            )}

            {s.kind === "ingredients" && (
              <div className="sm-text">
                <p className="sm-kicker">{labels.ingredients}</p>
                <ul className="sm-ingredients" data-id="step-mode-ingredients">
                  {recipe.ingredients.map((ing, j) => (
                    <li key={j}>
                      <b>{ing.quantity}</b> {ing.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {s.kind === "step" && (() => {
              const { lead, body } = splitLead(s.text);
              return (
                <div className="sm-text">
                  <p className="sm-kicker">
                    {labels.step} {s.index + 1} {labels.of} {stepCount}
                  </p>
                  {lead && <h2 className="sm-lead">{lead}</h2>}
                  <p className="sm-body">{body}</p>
                </div>
              );
            })()}

            {s.kind === "end" && (
              <div className="sm-text sm-text-center">
                <h2 className="sm-title">{labels.done}</h2>
                <div className="sm-actions">
                  <button
                    type="button"
                    data-id="step-mode-start-over"
                    className="sm-btn sm-btn-ghost"
                    onClick={() => goTo(0)}
                  >
                    {labels.startOver}
                  </button>
                  <Link
                    data-id="step-mode-back-to-recipe"
                    href={`/recipe/${recipe.id}`}
                    className="sm-btn"
                  >
                    {labels.backToRecipe}
                  </Link>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
