"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Recipe, Segment } from "@/lib/recipes";

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
  listen: string;
  stop: string;
  narrationOn: string;
  narrationOff: string;
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

interface SlideBase { id: string; image?: string; seg?: Segment; audio?: string }
// Whether narration starts on its own: a per-browser preference, read through an external
// store so the server-rendered page (always "on") hydrates without a mismatch.
const NARRATE_KEY = "recipes.narrate";
const NARRATE_EVENT = "recipes-narrate";
function readNarrate() {
  try {
    return localStorage.getItem(NARRATE_KEY) !== "off";
  } catch {
    return true;
  }
}
function subscribeNarrate(cb: () => void) {
  window.addEventListener(NARRATE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(NARRATE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function writeNarrate(on: boolean) {
  try {
    localStorage.setItem(NARRATE_KEY, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(NARRATE_EVENT));
}

type Slide =
  | (SlideBase & { kind: "cover" })
  | (SlideBase & { kind: "ingredients" })
  | (SlideBase & { kind: "step"; index: number; text: string })
  | (SlideBase & { kind: "end" });

export default function StepMode({ recipe, lang, labels }: Props) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  // Narration plays on its own when a slide settles; the speaker in the bar turns it off.
  const auto = useSyncExternalStore(subscribeNarrate, readNarrate, () => true);

  const stepImages = recipe.images?.steps ?? [];
  const stepSegs = recipe.video?.steps ?? [];
  const stepAudio = recipe.audio?.steps ?? [];
  const lastStepImage = [...stepImages].reverse().find((s) => s) ?? undefined;
  const slides: Slide[] = [
    { kind: "cover", id: "cover", image: recipe.images?.cover, seg: recipe.video?.cover, audio: recipe.audio?.cover },
    {
      kind: "ingredients",
      id: "ingredients",
      image: recipe.images?.ingredients,
      seg: recipe.video?.ingredients,
      audio: recipe.audio?.ingredients,
    },
    ...recipe.steps.map((text, index) => ({
      kind: "step" as const,
      id: `step-${index + 1}`,
      image: stepImages[index] ?? undefined,
      seg: stepSegs[index] ?? undefined,
      audio: stepAudio[index] ?? undefined,
      index,
      text,
    })),
    { kind: "end", id: "end", image: lastStepImage ?? recipe.images?.cover, seg: recipe.video?.end },
  ];
  const n = slides.length;
  const video = recipe.video;

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

  // Scrubbing: the scroll position IS the footage's playhead. Each slide is one
  // viewport tall, so scrollTop / height = slide index + fraction, and that fraction
  // walks through the slide's segment of the footage. Dragging up rewinds.
  const segs = slides.map((s) => s.seg ?? null);
  const segKey = JSON.stringify(segs);
  useEffect(() => {
    const root = scrollerRef.current;
    const v = videoRef.current;
    if (!root || !v || !video) return;
    let raf = 0;
    let lastT = -1;
    const scrub = () => {
      raf = 0;
      const h = root.clientHeight || 1;
      const pos = root.scrollTop / h;
      const i = Math.min(segs.length - 1, Math.max(0, Math.floor(pos)));
      const f = Math.min(1, Math.max(0, pos - i));
      const seg = segs[i];
      if (!seg) return; // a slide without footage keeps the last frame
      const t = seg[0] + f * (seg[1] - seg[0]);
      if (Math.abs(t - lastT) < 1 / 60) return;
      lastT = t;
      if (v.readyState >= 1) v.currentTime = t;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(scrub);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    v.addEventListener("loadedmetadata", scrub);
    if (v.readyState >= 1) scrub();
    return () => {
      root.removeEventListener("scroll", onScroll);
      v.removeEventListener("loadedmetadata", scrub);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [recipe.id, video, segKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Narration: one shared player; leaving the slide stops it.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => setPlaying(null);
    a.addEventListener("ended", onEnd);
    a.addEventListener("pause", onEnd);
    return () => {
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("pause", onEnd);
    };
  }, []);

  const playSlide = (slide: Slide) => {
    const a = audioRef.current;
    if (!a || !slide.audio) return;
    a.src = slide.audio;
    a.currentTime = 0;
    a.play().then(() => setPlaying(slide.id)).catch(() => {
      // The browser wants a gesture first (desktop wheel-scroll gives none): play on the next one.
      setPlaying(null);
      const retry = () => {
        document.removeEventListener("pointerdown", retry);
        document.removeEventListener("keydown", retry);
        if (slides[activeRef.current]?.id === slide.id && autoRef.current) {
          a.play().then(() => setPlaying(slide.id)).catch(() => setPlaying(null));
        }
      };
      document.addEventListener("pointerdown", retry, { once: true });
      document.addEventListener("keydown", retry, { once: true });
    });
  };
  const activeRef = useRef(active);
  const autoRef = useRef(auto);
  useEffect(() => {
    activeRef.current = active;
    autoRef.current = auto;
  }, [active, auto]);

  // A slide that has settled for a moment gets its narration; a drag straight through does not.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing && playing !== slides[active]?.id) a.pause();
    if (!auto) return;
    const slide = slides[active];
    if (!slide?.audio || playing === slide.id) return;
    const t = setTimeout(() => playSlide(slide), 450);
    return () => clearTimeout(t);
  }, [active, auto]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleNarration(slide: Slide) {
    const a = audioRef.current;
    if (!a || !slide.audio) return;
    if (playing === slide.id) {
      a.pause();
      return;
    }
    playSlide(slide);
  }

  function toggleAuto() {
    writeNarrate(!auto);
    if (auto) audioRef.current?.pause();
  }

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

  const listenButton = (s: Slide) =>
    s.audio ? (
      <button
        type="button"
        data-id={`step-mode-listen-${s.id}`}
        className={`sm-listen${playing === s.id ? " on" : ""}`}
        aria-pressed={playing === s.id}
        onClick={() => toggleNarration(s)}
      >
        <span className="sm-listen-icon" aria-hidden="true" />
        {playing === s.id ? labels.stop : labels.listen}
      </button>
    ) : null;

  return (
    <div className={`sm${video ? " sm-has-video" : ""}`} dir={dir} lang={lang}>
      {video && (
        <div className="sm-stage" aria-hidden="true">
          {recipe.images?.cover && <img className="sm-stage-blur" src={recipe.images.cover} alt="" />}
          <video
            ref={videoRef}
            className="sm-video"
            src={video.src}
            poster={recipe.images?.cover}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            data-id="step-mode-footage"
          />
        </div>
      )}
      <audio ref={audioRef} preload="none" data-id="step-mode-narration" />

      <header className="sm-bar">
        <Link data-id="step-mode-back" href={`/recipe/${recipe.id}`} className="sm-back">
          <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span> {labels.back}
        </Link>
        <span className="sm-bar-end">
          {recipe.audio && (
            <button
              type="button"
              data-id="step-mode-narration-toggle"
              className={`sm-speaker${auto ? " on" : ""}`}
              aria-pressed={auto}
              aria-label={auto ? labels.narrationOn : labels.narrationOff}
              title={auto ? labels.narrationOn : labels.narrationOff}
              onClick={toggleAuto}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                {auto ? (
                  <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                ) : (
                  <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                )}
              </svg>
            </button>
          )}
          <span data-id="step-mode-counter" className="sm-counter" dir="ltr" aria-live="polite">
            {active + 1} / {n}
          </span>
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
                {listenButton(s)}
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
                  {listenButton(s)}
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
