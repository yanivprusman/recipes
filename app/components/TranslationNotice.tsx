"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Shown while a recipe's translation is still being made: says so, and re-reads the page every
 * couple of seconds so the translated text replaces the original as soon as it is stored.
 */
export default function TranslationNotice({ text }: { text: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [router]);
  return (
    <p data-id="translation-pending" role="status" className="translation-notice">
      <span className="translation-notice-dot" aria-hidden="true" />
      {text}
    </p>
  );
}
