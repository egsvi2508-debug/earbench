// Pitch discrimination: two tones, is the second higher or lower?
// Adaptive 2-down/1-up staircase (converges on ~71% correct); the score is
// the geometric mean of the step size at the last reversals, in cents.

import { now, sineTone, sleep } from "../audio";
import { el, button, rand, onKeys, svg, type Test } from "../core";

const MAX_TRIALS = 60;
const REVERSALS = 10;

export const pitch: Test = {
  id: "pitch",
  name: "Pitch Sense",
  short: "The smallest pitch change you can hear",
  unit: "cents (100 cents = one semitone)",
  fmt: (v) => (v < 10 ? `${v.toFixed(1)} cents` : `${Math.round(v)} cents`),
  better: "low",
  // Thresholds near 1 kHz: trained musicians often 2–5 cents, untrained
  // listeners 10–40+ (e.g. Micheyl et al. 2006; Kishon-Rabin et al. 2001).
  norm: { kind: "lognormal", median: 16, sigma: 0.85 },
  normNote: "published pitch-discrimination studies",
  tint: "#9fb8e6",
  icon: svg('<path d="M4 16h4V8h4v8h4V4h4"/>'),
  intro: "Two tones play. Is the second one higher or lower?",
  steps: ["Use headphones if you can.", "It gets harder as you get it right.", "Takes about 2 minutes."],
  run({ stage, done, gone }) {
    let delta = 60; // cents
    let streak = 0;
    let lastDir: "up" | "down" | null = null;
    const reversals: number[] = [];
    let trials = 0;
    let answerUp = true;
    let busy = false;

    const prompt = el("div", "prompt", "Listen…");
    const bar = el("div", "progress");
    const fill = el("div", "progress-fill");
    bar.append(fill);
    const row = el("div", "choice-row");
    const lower = button("↓  Lower", "btn choice", () => answer(false));
    const higher = button("↑  Higher", "btn choice", () => answer(true));
    row.append(lower, higher);
    const replay = button("Play again", "btn ghost small", () => play());
    const info = el("div", "muted small center", "");
    stage.append(prompt, row, replay, bar, info);

    function setEnabled(on: boolean) {
      [lower, higher, replay].forEach((b) => (b.disabled = !on));
    }
    let f1 = 500;
    let f2 = 500;
    async function play() {
      busy = true;
      setEnabled(false);
      prompt.textContent = "Listen…";
      const t = now() + 0.1;
      sineTone(f1, t, 0.4);
      sineTone(f2, t + 0.7, 0.4);
      await sleep(1250);
      if (gone()) return;
      prompt.textContent = "Second tone was…";
      busy = false;
      setEnabled(true);
    }
    function next() {
      trials++;
      answerUp = Math.random() < 0.5;
      const base = rand(440, 700);
      const ratio = Math.pow(2, delta / 1200);
      // Centre the pair on the base so the absolute pitch gives no clue.
      f1 = answerUp ? base / Math.sqrt(ratio) : base * Math.sqrt(ratio);
      f2 = answerUp ? base * Math.sqrt(ratio) : base / Math.sqrt(ratio);
      fill.style.width = `${Math.min(100, (reversals.length / REVERSALS) * 100)}%`;
      play();
    }
    function step(dir: "up" | "down") {
      if (lastDir && dir !== lastDir) reversals.push(delta);
      lastDir = dir;
      const f = reversals.length < 4 ? 1.5 : 1.2;
      delta = dir === "down" ? Math.max(0.5, delta / f) : Math.min(200, delta * f);
    }
    async function answer(up: boolean) {
      if (busy) return;
      busy = true;
      setEnabled(false);
      const right = up === answerUp;
      prompt.textContent = right ? "Correct" : "Not quite";
      prompt.className = `prompt ${right ? "ok" : "no"}`;
      if (right) {
        streak++;
        if (streak === 2) {
          streak = 0;
          step("down");
        }
      } else {
        streak = 0;
        step("up");
      }
      info.textContent = `Difference now: ${delta < 10 ? delta.toFixed(1) : Math.round(delta)} cents`;
      await sleep(650);
      if (gone()) return;
      prompt.className = "prompt";
      if (reversals.length >= REVERSALS || trials >= MAX_TRIALS) {
        const last = (reversals.length >= 4 ? reversals.slice(-6) : [delta]).filter((x) => x > 0);
        done(Math.exp(last.reduce((a, b) => a + Math.log(b), 0) / last.length));
        return;
      }
      next();
    }
    const off = onKeys((e) => {
      if (e.key === "ArrowUp") return answer(true), true;
      if (e.key === "ArrowDown") return answer(false), true;
      if (e.key === "r" || e.key === "R") return busy || play(), true;
    });
    next();
    return off;
  },
};
