// Melody memory: a melody plays twice. Same, or did one note change?
// Each right answer makes the next melody one note longer. 3 lives.
// Score = the longest melody you judged correctly.

import { now, pianoNote, sleep } from "../audio";
import { el, button, pick, randInt, onKeys, svg, type Test } from "../core";

const SCALE = [0, 2, 4, 5, 7, 9, 11];
const LIVES = 3;

function midiOf(degree: number, root: number) {
  const oct = Math.floor(degree / 7);
  return root + oct * 12 + SCALE[((degree % 7) + 7) % 7];
}

function makeMelody(len: number): number[] {
  let d = randInt(2, 6);
  const out = [d];
  for (let i = 1; i < len; i++) {
    let step = pick([-2, -1, -1, 1, 1, 2, -3, 3]);
    if (d + step < 0 || d + step > 11) step = -step;
    d += step;
    out.push(d);
  }
  return out;
}

export const melody: Test = {
  id: "melody",
  name: "Melody Memory",
  short: "Spot a changed note in a growing tune",
  unit: "notes in the longest melody",
  fmt: (v) => `${Math.round(v)} notes`,
  better: "high",
  // Same/different melody tasks: most listeners hold 6–9 notes reliably
  // (Dowling 1978 and later melody-recognition work).
  norm: { kind: "normal", mean: 8, sd: 2.5 },
  normNote: "melody-recognition studies",
  tint: "#8fc4a0",
  icon: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  intro: "A melody plays twice. Was it the same, or did one note change?",
  steps: ["Starts with 4 notes.", "Right answer: one note longer.", "Three mistakes ends it."],
  needsPiano: true,
  run({ stage, done, gone }) {
    const status = el("div", "status-row");
    const lenEl = el("span", "", "");
    const livesEl = el("span", "lives", "");
    status.append(lenEl, livesEl);
    const prompt = el("div", "prompt", "Listen…");
    const row = el("div", "choice-row");
    const same = button("Same", "btn choice", () => answer(true));
    const diff = button("Different", "btn choice", () => answer(false));
    row.append(same, diff);
    stage.append(status, prompt, row);

    let len = 4;
    let lives = LIVES;
    let bestLen = 0;
    let isSame = true;
    let busy = true;

    function draw() {
      lenEl.textContent = `${len} notes`;
      livesEl.textContent = "♥".repeat(lives) + "♡".repeat(LIVES - lives);
    }
    function enable(on: boolean) {
      same.disabled = diff.disabled = !on;
      busy = !on;
    }
    async function round() {
      draw();
      enable(false);
      prompt.className = "prompt";
      prompt.textContent = "First…";
      const root = randInt(55, 62);
      const a = makeMelody(len);
      const b = [...a];
      isSame = Math.random() < 0.5;
      if (!isSame) {
        const i = randInt(1, len - 1);
        const options = [-2, -1, 1, 2].filter((s) => b[i] + s >= 0 && b[i] + s <= 12 && b[i] + s !== b[i - 1] && b[i] + s !== b[i + 1]);
        b[i] += pick(options.length ? options : [1]);
      }
      const gap = 0.42;
      let t = now() + 0.15;
      a.forEach((d) => (pianoNote(midiOf(d, root), t, gap * 1.1), (t += gap)));
      await sleep(len * gap * 1000 + 300);
      if (gone()) return;
      prompt.textContent = "…again";
      await sleep(500);
      t = now() + 0.05;
      b.forEach((d) => (pianoNote(midiOf(d, root), t, gap * 1.1), (t += gap)));
      await sleep(len * gap * 1000 + 100);
      if (gone()) return;
      prompt.textContent = "Same or different?";
      enable(true);
    }
    async function answer(saidSame: boolean) {
      if (busy) return;
      enable(false);
      const right = saidSame === isSame;
      prompt.className = `prompt ${right ? "ok" : "no"}`;
      prompt.textContent = right ? "Correct" : isSame ? "It was the same" : "One note changed";
      if (right) {
        bestLen = Math.max(bestLen, len);
        len++;
      } else lives--;
      draw();
      await sleep(1000);
      if (gone()) return;
      if (lives <= 0) return done(bestLen);
      round();
    }
    const off = onKeys((e) => {
      if (e.key === "s" || e.key === "ArrowLeft") return answer(true), true;
      if (e.key === "d" || e.key === "ArrowRight") return answer(false), true;
    });
    round();
    return off;
  },
};
