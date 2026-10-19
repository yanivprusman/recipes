// Client-safe recipe media types and helpers: no Node imports here, so client
// components (the editor) can use them without dragging fs into the bundle.

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface RecipeYield {
  amount: number;
  unit: string;
}

/**
 * Photos for step mode (/recipe/<id>/steps). Paths are site-relative
 * (e.g. "/recipes/pizza-dough/knead.jpg", served from public/).
 * `steps` is index-aligned with `Recipe.steps`; null = that step has no photo.
 */
export interface RecipeImages {
  cover?: string;
  ingredients?: string;
  steps?: (string | null)[];
}

/** A footage time range in seconds: [from, to]. */
export type Segment = [number, number];

/**
 * Text-free footage for step mode, scrubbed by the scroll position: dragging through a
 * slide moves the footage through that slide's segment. Segments are index-aligned like
 * images.steps (null = this step has no footage; the last frame stays).
 */
export interface RecipeVideo {
  src: string;
  cover?: Segment;
  ingredients?: Segment;
  steps?: (Segment | null)[];
  end?: Segment;
}

/** Spoken narration per slide (site-relative audio paths), played on demand in step mode. */
export interface RecipeAudio {
  /** The language it is spoken in: step mode only plays it to someone reading in that language. */
  lang: "he" | "en";
  cover?: string;
  ingredients?: string;
  steps?: (string | null)[];
}

/**
 * Per-step media (images.steps, video.steps, audio.steps) is index-aligned with steps.
 * Every path that changes the step list goes through here so the three never drift:
 * `removed` drops that index, otherwise the arrays are padded/truncated to `count`.
 */
/** The per-step media a recipe may carry; a subset of Recipe that client code can hold on its own. */
export interface StepMedia {
  images?: RecipeImages;
  video?: RecipeVideo;
  audio?: RecipeAudio;
}

export function realignStepMedia(recipe: StepMedia, count: number, removed?: number): StepMedia {
  function fix<T>(arr: (T | null)[] | undefined): (T | null)[] | undefined {
    if (!arr) return arr;
    const next = removed === undefined ? [...arr] : arr.filter((_, i) => i !== removed);
    while (next.length < count) next.push(null);
    return next.slice(0, count);
  }
  return {
    ...(recipe.images ? { images: { ...recipe.images, steps: fix(recipe.images.steps) } } : {}),
    ...(recipe.video ? { video: { ...recipe.video, steps: fix(recipe.video.steps) } } : {}),
    ...(recipe.audio ? { audio: { ...recipe.audio, steps: fix(recipe.audio.steps) } } : {}),
  };
}

