// Earbench — quick tests of musical hearing, each ending in one number and
// an estimate of how it compares. Home: #/  ·  a test: #/<test-id>

import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/work-sans";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./styles.css";

import { unlock, loadPiano, stopAll } from "./audio";
import { el, button, best, history, record, percentile, pdf, range, type Test } from "./core";
import { reaction } from "./tests/reaction";
import { pitch } from "./tests/pitch";
import { beat } from "./tests/beat";
import { sequence } from "./tests/sequence";
import { melody } from "./tests/melody";
import { absolute } from "./tests/absolute";

const TESTS: Test[] = [pitch, sequence, beat, melody, reaction, absolute];

const app = document.getElementById("app")!;
let cleanup: (() => void) | void;
let alive = 0;

function leave() {
  alive++;
  try {
    cleanup && cleanup();
  } catch {
    /* already gone */
  }
  cleanup = undefined;
  stopAll();
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ---------------------------------------------------------------- home
function showHome() {
  leave();
  app.innerHTML = "";
  document.title = "Earbench";
  const page = el("main", "page");

  const hero = el("header", "hero");
  hero.append(el("div", "brand", "Earbench"), el("h1", "hero-title", "How good are your ears?"));
  hero.append(el("p", "hero-sub", "Six quick tests of musical hearing. Each gives you one number and shows how it compares."));
  page.append(hero);

  const grid = el("div", "cards");
  TESTS.forEach((t) => {
    const a = el("a", "card");
    a.href = `#/${t.id}`;
    a.style.setProperty("--tint", t.tint);
    const icon = el("span", "card-icon");
    icon.innerHTML = t.icon;
    const b = best(t);
    const body = el("span", "card-body");
    body.append(el("span", "card-name", t.name), el("span", "card-short", t.short));
    a.append(icon, body);
    if (b != null) {
      const res = el("span", "card-best");
      res.append(el("b", "", t.fmt(b)), el("span", "", `${ordinal(Math.min(99, Math.max(1, Math.round(percentile(t, b)))))} percentile`));
      a.append(res);
    } else a.append(el("span", "card-go", "Start"));
    grid.append(a);
  });
  page.append(grid);

  // Profile: one bar per test you've done.
  const done = TESTS.filter((t) => best(t) != null);
  if (done.length) {
    const prof = el("section", "profile");
    prof.append(el("h2", "section-title", "Your ear profile"));
    const list = el("div", "bars");
    done.forEach((t) => {
      const p = percentile(t, best(t)!);
      const row = el("div", "bar-row");
      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill");
      fill.style.width = `${p}%`;
      fill.style.background = t.tint;
      track.append(fill);
      row.append(el("span", "bar-name", t.name), track, el("span", "bar-val", `${Math.round(p)}`));
      list.append(row);
    });
    prof.append(list, el("p", "fine", "Percentile of your best score: higher is better. Estimates, see each test."));
    page.append(prof);
  }

  page.append(el("p", "fine foot", "Use headphones if you can, with the volume up. Scores stay on this device."));
  app.append(page);
}

// ---------------------------------------------------------------- a test
function showTest(t: Test) {
  leave();
  app.innerHTML = "";
  document.title = `${t.name} · Earbench`;
  const page = el("main", "page test");
  page.style.setProperty("--tint", t.tint);
  const top = el("div", "topbar");
  const back = el("a", "back", "← All tests");
  back.href = "#/";
  top.append(back, el("span", "top-name", t.name));
  page.append(top);
  const body = el("section", "test-body");
  page.append(body);
  app.append(page);
  showIntro(t, body);
}

function showIntro(t: Test, body: HTMLElement) {
  body.innerHTML = "";
  const icon = el("div", "test-icon");
  icon.innerHTML = t.icon;
  body.append(icon, el("h1", "test-title", t.name), el("p", "test-intro", t.intro));
  const steps = el("ol", "steps");
  t.steps.forEach((s) => steps.append(el("li", "", s)));
  body.append(steps);
  const start = button("Start", "btn primary big", async () => {
    start.disabled = true;
    start.textContent = t.needsPiano ? "Loading sounds…" : "Starting…";
    await unlock(!!t.needsPiano);
    runTest(t, body);
  });
  body.append(start);
  const b = best(t);
  if (b != null) body.append(el("p", "muted center", `Your best: ${t.fmt(b)}`));
}

function runTest(t: Test, body: HTMLElement) {
  const my = ++alive;
  body.innerHTML = "";
  const stage = el("div", "stage");
  body.append(stage);
  cleanup = t.run({
    stage,
    gone: () => my !== alive,
    done: (score) => {
      if (my !== alive) return;
      try {
        cleanup && cleanup();
      } catch {
        /* fine */
      }
      cleanup = undefined;
      record(t.id, score);
      showResult(t, body, score);
    },
  });
}

function showResult(t: Test, body: HTMLElement, score: number) {
  body.innerHTML = "";
  const p = percentile(t, score);
  const hist = history(t.id);
  const isBest = best(t) === score && hist.length > 1;

  body.append(el("div", "result-label", isBest ? "New personal best" : "Your score"));
  body.append(el("div", "result-score", t.fmt(score)));
  body.append(el("div", "muted center", t.unit));
  const pct = el("p", "result-pct");
  pct.innerHTML = p < 1 ? "In the <b>bottom 1%</b>" : p > 99 ? "In the <b>top 1%</b>" : `Better than <b>about ${Math.round(p)}%</b> of people`;
  body.append(pct);
  body.append(curve(t, score));
  body.append(el("p", "fine center", `Rough estimate based on ${t.normNote}, not live player data.`));

  const actions = el("div", "actions");
  actions.append(
    button("All tests", "btn", () => (location.hash = "#/")),
    button("Try again", "btn primary", async () => {
      await unlock(!!t.needsPiano);
      runTest(t, body);
    }),
  );
  body.append(actions);

  if (hist.length > 1) {
    const past = el("div", "past");
    past.append(el("span", "muted small", "Recent:"));
    hist.slice(-6).reverse().forEach((v, i) => past.append(el("span", i === 0 ? "chip now" : "chip", t.fmt(v))));
    body.append(past);
  }
}

/** The norm's bell curve with your score marked; the "better" side is on the right. */
function curve(t: Test, score: number): HTMLElement {
  const W = 320;
  const H = 120;
  const [lo, hi] = range(t.norm);
  const log = t.norm.kind === "lognormal";
  const toU = (x: number) => (log ? (Math.log(x) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) : (x - lo) / (hi - lo));
  const fromU = (u: number) => (log ? Math.exp(Math.log(lo) + u * (Math.log(hi) - Math.log(lo))) : lo + u * (hi - lo));
  const flip = t.better === "low";
  const xOf = (u: number) => 8 + (flip ? 1 - u : u) * (W - 16);
  const N = 120;
  const pts: [number, number][] = [];
  let max = 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = fromU(u);
    // On a log axis, plot density per log-unit so the curve looks like a bell.
    const d = pdf(t.norm, x) * (log ? x : 1);
    max = Math.max(max, d);
    pts.push([u, d]);
  }
  const yOf = (d: number) => H - 22 - (d / max) * (H - 34);
  const line = pts.map(([u, d], i) => `${i ? "L" : "M"}${xOf(u).toFixed(1)},${yOf(d).toFixed(1)}`).join("");
  const area = `${line}L${xOf(flip ? 0 : 1)},${H - 22}L${xOf(flip ? 1 : 0)},${H - 22}Z`;
  const su = Math.max(0, Math.min(1, toU(score)));
  const sx = xOf(su);

  const wrap = el("div", "curve");
  wrap.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Where your score sits among other people">
    <path d="${area}" fill="var(--tint)" opacity="0.18"/>
    <path d="${line}" fill="none" stroke="var(--tint)" stroke-width="2"/>
    <line x1="8" x2="${W - 8}" y1="${H - 22}" y2="${H - 22}" stroke="var(--line)" />
    <line x1="${sx}" x2="${sx}" y1="10" y2="${H - 22}" stroke="var(--text)" stroke-width="2" stroke-dasharray="3 3"/>
    <circle cx="${sx}" cy="10" r="5" fill="var(--text)"/>
    <text x="8" y="${H - 6}" fill="var(--dim)" font-size="11">← worse</text>
    <text x="${W - 8}" y="${H - 6}" fill="var(--dim)" font-size="11" text-anchor="end">better →</text>
    <text x="${sx > W - 50 ? sx - 9 : sx + 9}" y="14" fill="var(--text)" font-size="12" text-anchor="${sx > W - 50 ? "end" : "start"}" font-weight="700">you</text>
  </svg>`;
  return wrap;
}

// ---------------------------------------------------------------- router
function route() {
  const id = location.hash.replace(/^#\/?/, "");
  const t = TESTS.find((x) => x.id === id);
  if (t) showTest(t);
  else showHome();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
loadPiano();
route();
