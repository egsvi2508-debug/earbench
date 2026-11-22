// Steady beat: a click plays 8 times at 100 bpm, tap along, then it stops
// and you keep the beat going alone for 12 taps. Score = the average
// distance of your tap-to-tap gaps from the true beat (ms).

import { now, tick, audioToPerf } from "../audio";
import { el, onKeys, svg, type Test } from "../core";

const BPM = 100;
const BEAT = 60000 / BPM; // 600 ms
const CLICKS = 8;
const SOLO_TAPS = 13; // 12 gaps

export const beat: Test = {
  id: "beat",
  name: "Steady Beat",
  short: "How evenly you keep a beat alone",
  unit: "milliseconds off the beat, on average",
  fmt: (v) => `${Math.round(v)} ms`,
  better: "low",
  // Tapping-continuation studies: gap variability is typically 3–6% of the
  // interval (about 20–35 ms at 600 ms); drummers do better.
  norm: { kind: "lognormal", median: 32, sigma: 0.5 },
  normNote: "finger-tapping continuation studies",
  tint: "#f39a6b",
  icon: svg('<path d="M6 21 12 3l6 18"/><path d="M8.5 13h7"/><path d="m12 13 5-6"/>'),
  intro: "Tap along with the click. When it stops, keep tapping at the same speed.",
  steps: ["Tap the big pad (or press Space).", "8 clicks, then you're on your own.", "Keep going for 12 more taps."],
  run({ stage, done, gone }) {
    const pad = el("button", "pad");
    pad.type = "button";
    const big = el("div", "pad-big", "Tap to start");
    const small = el("div", "pad-small", "The click starts one beat later");
    pad.append(big, small);
    const dots = el("div", "dots");
    stage.append(pad, dots);

    let phase: "idle" | "clicks" | "solo" | "end" = "idle";
    let lastClick = 0;
    const solo: number[] = [];
    const timers: number[] = [];

    function drawDots() {
      dots.innerHTML = "";
      for (let i = 0; i < SOLO_TAPS; i++) dots.append(el("span", i < solo.length ? "dot on" : "dot"));
    }
    function startClicks() {
      phase = "clicks";
      pad.className = "pad wait";
      big.textContent = "Tap along";
      small.textContent = "Listen and join in";
      const t0 = now() + BEAT / 1000;
      for (let i = 0; i < CLICKS; i++) {
        const t = t0 + (i * BEAT) / 1000;
        tick(t, i % 4 === 0);
        // Flash the pad with each click, as a visual metronome.
        const at = audioToPerf(t) - performance.now();
        timers.push(window.setTimeout(() => pulse(), at));
      }
      lastClick = audioToPerf(t0 + ((CLICKS - 1) * BEAT) / 1000);
      timers.push(
        window.setTimeout(() => {
          if (gone()) return;
          phase = "solo";
          pad.className = "pad live";
          big.textContent = "Keep going!";
          small.textContent = "Same speed, on your own";
        }, lastClick - performance.now() + BEAT / 2),
      );
    }
    function pulse() {
      pad.classList.remove("pulse");
      void pad.offsetWidth;
      pad.classList.add("pulse");
    }
    function tap(ts: number) {
      if (phase === "idle") return startClicks();
      if (phase !== "solo") return;
      if (ts < lastClick + BEAT / 2) return;
      solo.push(ts);
      drawDots();
      if (solo.length >= SOLO_TAPS) {
        phase = "end";
        const gaps = solo.slice(1).map((t, i) => t - solo[i]);
        const err = gaps.reduce((a, g) => a + Math.abs(g - BEAT), 0) / gaps.length;
        pad.className = "pad good";
        big.textContent = "Done";
        small.textContent = "";
        setTimeout(() => !gone() && done(err), 700);
      }
    }
    pad.addEventListener("pointerdown", (e) => tap(e.timeStamp));
    const off = onKeys((e) => {
      if (e.key === " " || e.key === "Enter") return tap(e.timeStamp), true;
    });
    drawDots();
    return () => {
      timers.forEach(clearTimeout);
      off();
    };
  },
};
