import { execFile } from "child_process";
import { tmpdir } from "os";
import { getRecipe, storeTranslation, type Ingredient } from "@/lib/recipes";
import { LANG_NAMES, baseText, diffText, isEmptyDiff, otherLang, type Lang } from "@/lib/recipe-i18n";

// Keeps every recipe readable in both languages. A pass translates only what changed since the
// last one (lib/recipe-i18n.ts: RecipeTranslation.source), through the local Claude Code CLI.
// Passes run in this server process, one at a time per recipe; anything that asks while one is
// running gets exactly one more pass afterwards, which picks up whatever changed meanwhile.

const CLAUDE = process.env.CLAUDE_CODE_PATH ?? "/root/.local/bin/claude";

// On globalThis because Next can load this module more than once in the same process.
const g = globalThis as typeof globalThis & { __recipesTranslate?: { running: Set<string>; again: Set<string> } };
g.__recipesTranslate ??= { running: new Set(), again: new Set() };
const { running, again } = g.__recipesTranslate;

/** Bring a recipe's translation up to date in the background. Safe to call as often as you like. */
export function scheduleTranslation(id: string): void {
  if (running.has(id)) {
    again.add(id);
    return;
  }
  running.add(id);
  translateOnce(id)
    .catch((err) => console.error(`[translate] recipe ${id}:`, err instanceof Error ? err.message : err))
    .finally(() => {
      running.delete(id);
      if (again.delete(id)) scheduleTranslation(id);
    });
}

interface Request {
  name?: string;
  yieldUnit?: string;
  ingredients?: Record<string, Ingredient>;
  steps?: Record<string, string>;
}

async function translateOnce(id: string): Promise<void> {
  const r = await getRecipe(id);
  if (!r) return;
  const from = r.lang;
  const to = otherLang(from);
  const snapshot = baseText(r);
  const t = r.translations?.[to];
  const d = t
    ? diffText(snapshot, t.source)
    : {
        name: true,
        yieldUnit: snapshot.yieldUnit !== undefined,
        ingredients: snapshot.ingredients.map((_, i) => i),
        steps: snapshot.steps.map((_, i) => i),
      };
  if (isEmptyDiff(d)) return;

  const req: Request = {};
  if (d.name) req.name = snapshot.name;
  if (d.yieldUnit) req.yieldUnit = snapshot.yieldUnit;
  if (d.ingredients.length) req.ingredients = Object.fromEntries(d.ingredients.map((i) => [i, snapshot.ingredients[i]]));
  if (d.steps.length) req.steps = Object.fromEntries(d.steps.map((i) => [i, snapshot.steps[i]]));

  const started = Date.now();
  const res = checkShape(req, await askClaude(systemPrompt(from, to, r.yield?.amount), JSON.stringify(req, null, 1)));
  await storeTranslation(id, from, snapshot, {
    ...(res.name !== undefined ? { name: res.name } : {}),
    ...(res.yieldUnit !== undefined ? { yieldUnit: res.yieldUnit } : {}),
    ingredients: new Map(d.ingredients.map((i) => [i, res.ingredients![String(i)]])),
    steps: new Map(d.steps.map((i) => [i, res.steps![String(i)]])),
  });
  const parts = (d.name ? 1 : 0) + (d.yieldUnit ? 1 : 0) + d.ingredients.length + d.steps.length;
  console.log(`[translate] ${r.name}: ${parts} part(s) ${from}→${to} in ${Date.now() - started} ms`);
}

function systemPrompt(from: Lang, to: Lang, yieldAmount?: number): string {
  const src = LANG_NAMES[from].en;
  const dst = LANG_NAMES[to].en;
  return [
    `You translate parts of a home-cooking recipe from ${src} to ${dst}.`,
    `The input is a JSON object. Reply with a JSON object of exactly the same shape and keys, with every string value translated into natural, idiomatic ${dst} as a cookbook would write it. No code fences, no commentary.`,
    `- "name" is the recipe title.`,
    ...(yieldAmount !== undefined
      ? [`- "yieldUnit" is what the recipe makes; it follows the number ${yieldAmount} ("${yieldAmount} <yieldUnit>"), so make its grammatical number agree with ${yieldAmount}.`]
      : []),
    `- An ingredient's "quantity" must still START with its number exactly as given (e.g. "2 כוסות" -> "2 cups", "1/2 tsp" -> "1/2 כפית"). Translate units, never convert them.`,
    `- If a step starts with a short title followed by a colon ("Knead: ..."), keep that "Title: ..." shape.`,
    `- Keep numbers, temperatures, times and line breaks as they are. Keep people's names transliterated.`,
    `- Use only the target language's script, except for brand names.`,
  ].join("\n");
}

function askClaude(system: string, prompt: string): Promise<string> {
  // No BASH_ENV: this repo's shell init defines a `claude` wrapper that must not run here.
  const env = { ...process.env };
  delete env.BASH_ENV;
  const args = [
    "-p", "--model", "opus", "--output-format", "json",
    "--tools", "", "--no-session-persistence", "--setting-sources", "", "--strict-mcp-config",
    "--system-prompt", system, prompt,
  ];
  return new Promise((resolve, reject) => {
    execFile(CLAUDE, args, { env, cwd: tmpdir(), timeout: 180_000, maxBuffer: 16 << 20 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`claude failed: ${err.message} ${stderr}`.trim()));
      let out: { is_error?: boolean; result?: string };
      try {
        out = JSON.parse(stdout);
      } catch {
        return reject(new Error(`claude printed non-JSON: ${stdout.slice(0, 300)}`));
      }
      if (out.is_error || typeof out.result !== "string") {
        return reject(new Error(`claude returned an error: ${stdout.slice(0, 300)}`));
      }
      resolve(out.result);
    });
  });
}

/** The reply must answer exactly what was asked, with strings where strings were sent. */
function checkShape(req: Request, reply: string): Request {
  const body = reply.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const res = JSON.parse(body) as Request;
  const bad = (what: string) => new Error(`translation reply is missing or malformed: ${what}`);
  if (req.name !== undefined && typeof res.name !== "string") throw bad("name");
  if (req.yieldUnit !== undefined && typeof res.yieldUnit !== "string") throw bad("yieldUnit");
  for (const k of Object.keys(req.ingredients ?? {})) {
    const ing = res.ingredients?.[k];
    if (!ing || typeof ing.name !== "string" || typeof ing.quantity !== "string") throw bad(`ingredient ${k}`);
  }
  for (const k of Object.keys(req.steps ?? {})) {
    if (typeof res.steps?.[k] !== "string") throw bad(`step ${k}`);
  }
  return res;
}
