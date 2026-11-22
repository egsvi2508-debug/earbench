// Tone sequence: nine pads, each a note of the pentatonic scale. Each round
// the sequence plays back with one more note; repeat it. One slip ends it.
// Score = the longest sequence you repeated.

import { now, pianoNote, sleep } from "../audio";
import { el, randInt, svg, type Test } from "../core";

const NOTES = [60, 62, 64, 67, 69, 72, 74, 76, 79];
const HUES = ["#ffb547", "#f39a6b", "#e88a8a", "#e3a9c9", "#c7b4f0", "#9fb8e6", "#8fd0d0", "#8fc4a0", "#d5d27a"];

export const sequence: Test = {
  id: "sequence",
  name: "Tone Sequence",
  short: "How long a tune you can repeat",
  unit: "notes in a row",
  fmt: (v) => `${Math.round(v)} notes`,
  better: "high",
  // Memory span for sequences is usually 5–9 items (Miller 1956); with
  // sound and light together most people land around 7–9.
  norm: { kind: "normal", mean: 8, sd: 2.6 },
  normNote: "memory-span research (about 7 ± 2)",
  tint: "#c7b4f0",
  icon: svg('<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="17" y="3" width="4" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1"/><rect x="3" y="17" width="5" height="4" rx="1"/>'),
  intro: "Pads light up and play a note. Repeat the sequence. It grows by one each round.",
  steps: ["Watch and listen.", "Tap the pads in the same order.", "One mistake ends the test."],
  needsPiano: true,
  run({ stage, done, gone }) {
    const label = el("div", "prompt", "Watch…");
    const grid = el("div", "pads");
    const pads = NOTES.map((m, i) => {
      const b = el("button", "pad-key");
      b.type = "button";
      b.style.setProperty("--hue", HUES[i]);
      b.setAttribute("aria-label", `Pad ${i + 1}`);
      b.addEventListener("pointerdown", () => press(i));
      grid.append(b);
      return b;
    });
    const level = el("div", "muted center", "Level 1");
    stage.append(label, grid, level);

    const seq: number[] = [];
    let pos = 0;
    let listening = false;

    function flash(i: number, ms = 380) {
      pads[i].classList.add("lit");
      setTimeout(() => pads[i].classList.remove("lit"), ms);
    }
    async function round() {
      seq.push(randInt(0, NOTES.length - 1));
      pos = 0;
      listening = false;
      grid.classList.add("locked");
      level.textContent = `Level ${seq.length}`;
      label.textContent = "Watch…";
      await sleep(700);
      const gap = Math.max(0.32, 0.55 - seq.length * 0.012);
      for (const i of seq) {
        if (gone()) return;
        pianoNote(NOTES[i], now() + 0.02, 0.5);
        flash(i, gap * 750);
        await sleep(gap * 1000);
      }
      if (gone()) return;
      grid.classList.remove("locked");
      listening = true;
      label.textContent = "Your turn";
    }
    async function press(i: number) {
      if (!listening) return;
      pianoNote(NOTES[i], now() + 0.01, 0.4);
      flash(i, 220);
      if (i !== seq[pos]) {
        listening = false;
        grid.classList.add("locked");
        label.textContent = "Wrong pad";
        label.className = "prompt no";
        flash(seq[pos], 900);
        await sleep(1100);
        if (!gone()) done(seq.length - 1);
        return;
      }
      pos++;
      if (pos === seq.length) {
        listening = false;
        label.textContent = "Nice";
        label.className = "prompt ok";
        await sleep(600);
        if (gone()) return;
        label.className = "prompt";
        round();
      }
    }
    round();
  },
};
