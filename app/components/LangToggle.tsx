"use client";

import { useTransition } from "react";
import { setViewLang } from "@/app/actions";
import type { Lang } from "@/lib/recipe-i18n";

const OPTIONS: { lang: Lang; label: string; title: string }[] = [
  { lang: "he", label: "עב", title: "עברית" },
  { lang: "en", label: "EN", title: "English" },
];

/** Hebrew / English switch. Every page re-renders in the chosen language, recipes included. */
export default function LangToggle({ lang, variant = "light" }: { lang: Lang; variant?: "light" | "dark" }) {
  const [busy, start] = useTransition();
  return (
    <span
      role="group"
      aria-label={lang === "he" ? "שפה" : "Language"}
      dir="ltr"
      className={`lang-toggle lang-toggle-${variant}${busy ? " busy" : ""}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          data-id={`lang-${o.lang}`}
          lang={o.lang}
          title={o.title}
          aria-pressed={o.lang === lang}
          disabled={busy}
          onClick={() => o.lang !== lang && start(() => setViewLang(o.lang))}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}
