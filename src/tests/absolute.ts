// Perfect pitch: name single piano notes with no reference. A burst of
// noise between notes wipes the last pitch so you can't just compare.
// 20 notes; guessing gets about 2 right.

import { now, pianoNote, noiseBurst, sleep } from "../audio";
import { el, button, randInt, svg, type Test } from "../core";

const ROUNDS = 20;
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export const absolute: Test = {
  id: "absolute",
  name: "Perfect Pitch",
  short: "Name notes with no reference",
  unit: "notes named right, out of 20",
  fmt: (v) => `${Math.round(v)} / 20`,
  better: "high",
  // Absolute pitch is rare (well under 1 in 100 people); without it you
  // score near chance (20 / 12 ≈ 1.7) give or take.
  norm: { kind: "normal", mean: 2.3, sd: 1.6 },
  normNote: "chance level plus absolute-pitch prevalence studies",
  tint: "#e3a9c9",
  icon: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  intro: "A single note plays. Which note is it? No reference, no hints.",
  steps: ["A noise clears your ear before each note.", "Pick the note name.", "20 notes. Guessing gets about 2."],
  needsPiano: true,
  run({ stage, done, gone }) {
    const status = el("div", "status-row");
    const count = el("span", "", "");
    const scoreEl = el("span", "", "");
    status.append(count, scoreEl);
    const prompt = el("div", "prompt", "Listen…");
    const keys = el("div", "note-grid");
    const btns = NAMES.map((n, pc) => {
      const b = button(n, "btn note", () => answer(pc));
      keys.append(b);
      return b;
    });
    const replay = button("Hear it again", "btn ghost small", () => play());
    stage.append(status, prompt, keys, replay);

    let round = 0;
    let right = 0;
    let midi = 60;
    let busy = true;

    function enable(on: boolean) {
      busy = !on;
      [...btns, replay].forEach((b) => (b.disabled = !on));
    }
    async function play() {
      enable(false);
      prompt.textContent = "Listen…";
      pianoNote(midi, now() + 0.05, 1.4);
      await sleep(900);
      if (gone()) return;
      prompt.textContent = "Which note?";
      enable(true);
    }
    async function next() {
      round++;
      count.textContent = `Note ${round} of ${ROUNDS}`;
      scoreEl.textContent = `${right} right`;
      btns.forEach((b) => (b.className = "btn note"));
      enable(false);
      prompt.className = "prompt";
      prompt.textContent = "Clearing your ear…";
      noiseBurst(now() + 0.05, 1.1);
      await sleep(1500);
      if (gone()) return;
      midi = randInt(48, 83);
      play();
    }
    async function answer(pc: number) {
      if (busy) return;
      enable(false);
      const truth = midi % 12;
      const ok = pc === truth;
      if (ok) right++;
      btns[truth].classList.add("is-right");
      if (!ok) btns[pc].classList.add("is-wrong");
      prompt.className = `prompt ${ok ? "ok" : "no"}`;
      prompt.textContent = ok ? "Yes!" : `It was ${NAMES[truth]}`;
      scoreEl.textContent = `${right} right`;
      await sleep(1100);
      if (gone()) return;
      if (round >= ROUNDS) return done(right);
      next();
    }
    next();
  },
};
