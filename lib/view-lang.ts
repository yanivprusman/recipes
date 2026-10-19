import { cookies, headers } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/recipe-i18n";

/**
 * The language this browser reads the site in: what the toggle last chose, or, before it was
 * ever touched, the browser's first preferred language (Hebrew if that is Hebrew, else English).
 */
export async function getViewLang(): Promise<Lang> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (chosen === "he" || chosen === "en") return chosen;
  const first = ((await headers()).get("accept-language") ?? "").split(",")[0].trim().toLowerCase();
  return first.startsWith("he") || first.startsWith("iw") ? "he" : "en";
}
