// core.ts — the test interface, rough population norms, saved scores, DOM helpers.

export type Norm =
  | { kind: "normal"; mean: number; sd: number }
  | { kind: "lognormal"; median: number; sigma: number };

export interface RunCtx {
  /** The test's stage element (cleared for you). */
  stage: HTMLElement;
  /** Call once with the final score. */
  done: (score: number) => void;
  /** True once the user has left the test; stop scheduling work. */
  gone: () => boolean;
}

export interface Test {
  id: string;
  name: string;
  short: string;
  /** What the score measures, shown under the number. */
  unit: string;
  /** Format a score for display. */
  fmt: (v: number) => string;
  better: "low" | "high";
  norm: Norm;
  /** Where the norm comes from, in a few words. */
  normNote: string;
  tint: string;
  icon: string;
  intro: string;
  steps: string[];
  needsPiano?: boolean;
  /** Returns a cleanup function. */
  run: (ctx: RunCtx) => (() => void) | void;
}

// ---------- statistics ----------
function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

export function cdf(n: Norm, x: number): number {
  if (n.kind === "normal") return phi((x - n.mean) / n.sd);
  if (x <= 0) return 0;
  return phi(Math.log(x / n.median) / n.sigma);
}
export function pdf(n: Norm, x: number): number {
  if (n.kind === "normal") return Math.exp(-0.5 * ((x - n.mean) / n.sd) ** 2) / (n.sd * Math.sqrt(2 * Math.PI));
  if (x <= 0) return 0;
  return Math.exp(-0.5 * (Math.log(x / n.median) / n.sigma) ** 2) / (x * n.sigma * Math.sqrt(2 * Math.PI));
}
/** Share of people (0–100) estimated to score worse than this. */
export function percentile(t: Test, score: number): number {
  const c = cdf(t.norm, score);
  const p = t.better === "high" ? c : 1 - c;
  return Math.max(0.1, Math.min(99.9, p * 100));
}
/** A sensible x-range for drawing the curve. */
export function range(n: Norm): [number, number] {
  if (n.kind === "normal") return [Math.max(0, n.mean - 3.2 * n.sd), n.mean + 3.2 * n.sd];
  return [n.median * Math.exp(-2.6 * n.sigma), n.median * Math.exp(2.6 * n.sigma)];
}

// ---------- saved scores (this browser only) ----------
const KEY = "earbench:v1";
type Saved = Record<string, number[]>;
function readAll(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}
export function history(id: string): number[] {
  const v = readAll()[id];
  return Array.isArray(v) ? v.filter((x) => Number.isFinite(x)) : [];
}
export function record(id: string, score: number) {
  const all = readAll();
  all[id] = [...history(id), score].slice(-50);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked: the result still shows */
  }
}
export function best(t: Test): number | null {
  const h = history(t.id);
  if (!h.length) return null;
  return t.better === "low" ? Math.min(...h) : Math.max(...h);
}

// ---------- DOM ----------
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
export function button(label: string, cls = "btn", onClick?: () => void): HTMLButtonElement {
  const b = el("button", cls, label);
  b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
export const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** Listen for a key while the test is on screen. Returns the remover. */
export function onKeys(f: (e: KeyboardEvent) => boolean | void): () => void {
  const h = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (f(e) === true) e.preventDefault();
  };
  window.addEventListener("keydown", h);
  return () => window.removeEventListener("keydown", h);
}
