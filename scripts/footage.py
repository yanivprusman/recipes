#!/usr/bin/env python3
"""Text-free, silent footage for step mode, cut from one photo per slide.

    footage.py <spec.json> <footage.mp4> <timeline.json>

spec.json:
  {"scenes": [{"id": "cover", "image": "/abs/cover.png", "narration": "/abs/cover.wav"},
              {"id": "ingredients", ...}, {"id": "step-1", ...}, ...],
   "end": {"image": "/abs/cover.png", "dur": 6.0}}

Each scene is its photo with a slow Ken Burns move, lasting LEAD + narration + TAIL seconds
(a scene without narration holds for FIXED seconds); scenes overlap by XF (a crossfade); the
end scene is the cover, blurred and darkened, held for `dur`. Same timeline rules and the
same encoder as /opt/appVideos/photo-tutorial-rig/build.py --footage, which cut the pizza
dough footage — a keyframe every 12 frames, so a seek to any time decodes at once: this cut
is dragged through, never played.

timeline.json carries each scene's start/duration and, ready for the recipe record, the
segments the page scrubs: slide i owns [its start + XF, the next start + XF] — the window in
which it is the only picture on screen — except that the cover starts at 0 and the end runs
to the last frame.
"""
import json, math, os, subprocess, sys, wave
import multiprocessing
from multiprocessing import Pool, cpu_count

import numpy as np
from PIL import Image, ImageFilter

W, H, FPS = 1280, 720, 30
SW, SH = 1536, 864            # source canvas = 1.2x output, so zoom<=1.2 never upsamples
XF, LEAD, TAIL = 0.8, 0.6, 0.9  # crossfade, silence before / after each narration line
FIXED = 5.0                     # a scene with no narration

KB = [(1.00, 1.12, 0.03, 0.01), (1.12, 1.00, -0.03, 0.01), (1.00, 1.10, 0.00, -0.03),
      (1.10, 1.00, 0.03, 0.00), (1.00, 1.12, -0.02, -0.02), (1.12, 1.02, 0.00, 0.03),
      (1.02, 1.12, 0.03, -0.01), (1.12, 1.00, -0.03, 0.00), (1.00, 1.10, 0.02, 0.02),
      (1.06, 1.12, 0.00, 0.00)]


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def kb_rect(idx, u):
    z0, z1, dx, dy = KB[idx % len(KB)]
    e = ease(u)
    z = z0 + (z1 - z0) * e
    cw, ch = SW / z, SH / z
    cx = (0.5 + dx * (e - 0.5)) * SW
    cy = (0.5 + dy * (e - 0.5)) * SH
    cx = min(max(cx, cw / 2), SW - cw / 2)
    cy = min(max(cy, ch / 2), SH - ch / 2)
    return (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)


def load(path, blur=False):
    im = Image.open(path).convert("RGB").resize((SW, SH), Image.LANCZOS)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(18))
        im = Image.blend(im, Image.new("RGB", (SW, SH), (18, 12, 8)), 0.55)
    return im


def main():
    spec_path, out_path, timeline_path = sys.argv[1:4]
    spec = json.load(open(spec_path))
    scenes = []
    for i, s in enumerate(spec["scenes"]):
        nar = wav_len(s["narration"]) if s.get("narration") else 0.0
        scenes.append(dict(id=s["id"], idx=i, img=s["image"], blur=False,
                           dur=(LEAD + nar + TAIL) if nar else FIXED))
    end = spec["end"]
    scenes.append(dict(id="end", idx=len(scenes), img=end["image"], blur=True, dur=float(end.get("dur", 6.0))))

    t = 0.0
    for sc in scenes:
        sc["start"] = t
        t += sc["dur"] - XF
    total = scenes[-1]["start"] + scenes[-1]["dur"]
    nframes = int(round(total * FPS))

    # Scrub windows, one per scene (see the module docstring).
    bounds = [0.0] + [sc["start"] + XF for sc in scenes[1:]] + [round(total, 3)]
    segments = {sc["id"]: [round(bounds[i], 3), round(bounds[i + 1], 3)] for i, sc in enumerate(scenes)}

    global SRC
    SRC = {sc["id"]: load(sc["img"], sc["blur"]) for sc in scenes}
    global SCENES, TOTAL
    SCENES, TOTAL = scenes, total

    for sc in scenes:
        print(f"{sc['id']:14s} start={sc['start']:7.2f} dur={sc['dur']:5.2f}", file=sys.stderr)
    print(f"total {total:.2f}s = {nframes} frames", file=sys.stderr)
    json.dump({"fps": FPS, "crossfade": XF, "lead": LEAD, "tail": TAIL, "total": round(total, 3),
               "scenes": [{"id": sc["id"], "start": round(sc["start"], 3), "dur": round(sc["dur"], 3)}
                          for sc in scenes],
               "segments": segments},
              open(timeline_path, "w"), indent=1)

    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error",
                           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-profile:v", "high",
                           "-g", "12", "-keyint_min", "12", "-sc_threshold", "0", "-pix_fmt", "yuv420p",
                           "-movflags", "+faststart", out_path], stdin=subprocess.PIPE)
    with Pool(min(24, cpu_count())) as pool:
        for i, fb in enumerate(pool.imap(frame_bytes, range(nframes), chunksize=6)):
            try:
                ff.stdin.write(fb)
            except BrokenPipeError:
                pool.terminate()
                sys.exit(f"ffmpeg exited early (rc={ff.wait()})")
            if i % 300 == 0:
                print(f"frame {i}/{nframes}", file=sys.stderr)
    ff.stdin.close()
    rc = ff.wait()
    if rc != 0:
        sys.exit(f"ffmpeg failed (rc={rc})")
    print(f"done {out_path} {total:.2f}s", file=sys.stderr)


def scene_frame(sc, lt):
    u = lt / sc["dur"]
    return SRC[sc["id"]].transform((W, H), Image.EXTENT, kb_rect(sc["idx"], u), Image.BICUBIC)


def frame_bytes(n):
    t = n / FPS
    act = [sc for sc in SCENES if sc["start"] <= t < sc["start"] + sc["dur"]]
    if not act:
        act = [SCENES[-1]]
    if len(act) == 1:
        out = scene_frame(act[0], t - act[0]["start"])
    else:
        a, b = act[0], act[1]
        k = ease((t - b["start"]) / XF)
        out = Image.blend(scene_frame(a, t - a["start"]), scene_frame(b, t - b["start"]), k)
    return out.tobytes()


if __name__ == "__main__":
    # Workers read SCENES/SRC set in main(); Python 3.14 defaults to forkserver, which
    # would start them from a fresh import that has neither.
    multiprocessing.set_start_method("fork")
    main()
