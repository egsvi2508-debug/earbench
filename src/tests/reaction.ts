// Sound reaction: wait in silence, react the moment a beep sounds. 5 tries, average.

import { now, sineTone, audioToPerf } from "../audio";
import { el, rand, onKeys, svg, type Test } from "../core";

const TRIES = 5;

export const reaction: Test = {
  id: "reaction",
  name: "Sound Reaction",
  short: "How fast you react to a beep",
  unit: "milliseconds, average of 5",
  fmt: (v) => `${Math.round(v)} ms`,
  better: "low",
  // Simple auditory reaction time is ~160 ms in a lab; a browser adds
  // input and audio delay, so typical web results sit higher.
  norm: { kind: "normal", mean: 265, sd: 50 },
  normNote: "lab studies (about 160 ms) plus typical browser delay",
  tint: "#ffb547",
  icon: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  intro: "When you hear the beep, tap as fast as you can.",
  steps: ["Tap the big area to start a try.", "Wait in silence. Don't guess.", "Beep → tap. Five tries."],
  run({ stage, done, gone }) {
    const pad = el("button", "pad");
    pad.type = "button";
    const big = el("div", "pad-big");
    const small = el("div", "pad-small");
    pad.append(big, small);
    const dots = el("div", "dots");
    stage.append(pad, dots);

    const times: number[] = [];
    let state: "idle" | "waiting" | "live" | "shown" = "idle";
    let beepAt = 0;
    let timer = 0;

    function drawDots() {
      dots.innerHTML = "";
      for (let i = 0; i < TRIES; i++) dots.append(el("span", i < times.length ? "dot on" : "dot"));
    }
    function show(cls: string, a: string, b: string) {
      pad.className = `pad ${cls}`;
      big.textContent = a;
      small.textContent = b;
    }
    function arm() {
      state = "waiting";
      show("wait", "Wait for it…", "Tap the moment you hear the beep");
      timer = window.setTimeout(() => {
        if (gone() || state !== "waiting") return;
        const t = now() + 0.03;
        sineTone(880, t, 0.25, -4);
        beepAt = audioToPerf(t);
        state = "live";
      }, rand(1600, 4200));
    }
    function hit(ts: number) {
      if (state === "idle" || state === "shown") {
        if (times.length >= TRIES) return;
        arm();
        return;
      }
      const ms = ts - beepAt;
      if (state === "waiting" || ms < 60) {
        // Before the beep (or impossibly fast): this try doesn't count.
        clearTimeout(timer);
        state = "shown";
        show("bad", "Too soon!", "Tap to try again");
        return;
      }
      times.push(ms);
      drawDots();
      state = "shown";
      if (times.length >= TRIES) {
        show("good", `${Math.round(ms)} ms`, "Done");
        setTimeout(() => !gone() && done(times.reduce((a, b) => a + b, 0) / times.length), 900);
      } else show("good", `${Math.round(ms)} ms`, "Tap to keep going");
    }

    pad.addEventListener("pointerdown", (e) => hit(e.timeStamp));
    const off = onKeys((e) => {
      if (e.key === " " || e.key === "Enter") return hit(e.timeStamp), true;
    });
    show("idle", "Tap to start", "Have your sound on");
    drawDots();
    return () => {
      clearTimeout(timer);
      off();
    };
  },
};
