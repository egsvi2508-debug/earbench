// audio.ts — everything the tests play: pure sine tones (exact pitch),
// a sampled piano (Salamander Grand, CC-BY Alexander Holm, from the Tone.js
// CDN), a metronome click and a noise burst.

import * as Tone from "tone";

let out: Tone.Volume | null = null;
let sine: Tone.PolySynth | null = null;
let click: Tone.Synth | null = null;
let noise: Tone.Noise | null = null;
let noiseEnv: Tone.AmplitudeEnvelope | null = null;
let piano: Tone.Sampler | null = null;
let pianoReady: Promise<void> | null = null;

function bus(): Tone.Volume {
  if (!out) out = new Tone.Volume(-4).connect(new Tone.Limiter(-1).toDestination());
  return out;
}

const SAMPLES: Record<string, string> = {};
for (let o = 1; o <= 7; o++) {
  SAMPLES[`A${o}`] = `A${o}.mp3`;
  SAMPLES[`C${o}`] = `C${o}.mp3`;
  SAMPLES[`D#${o}`] = `Ds${o}.mp3`;
  SAMPLES[`F#${o}`] = `Fs${o}.mp3`;
}

/** Start fetching the piano early (no user gesture needed to download). */
export function loadPiano(): Promise<void> {
  if (!pianoReady) {
    pianoReady = new Promise((resolve) => {
      piano = new Tone.Sampler({
        urls: SAMPLES,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        release: 1,
        onload: () => resolve(),
        onerror: () => resolve(),
      }).connect(bus());
    });
  }
  return pianoReady;
}

/** Must be called from a click/tap the first time (browser autoplay rules). */
export async function unlock(needPiano = false): Promise<void> {
  await Tone.start();
  bus();
  if (needPiano) await Promise.race([loadPiano(), new Promise((r) => setTimeout(r, 10000))]);
}

export const now = () => Tone.now();

/** A pure tone at an exact frequency. */
export function sineTone(freq: number, at: number, dur: number, db = -8) {
  if (!sine) {
    sine = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0, sustain: 1, release: 0.04 },
    }).connect(bus());
  }
  sine.triggerAttackRelease(freq, dur, at, Tone.dbToGain(db));
}

export function pianoNote(midi: number, at: number, dur = 0.9, vel = 0.85) {
  if (!piano) loadPiano();
  piano!.triggerAttackRelease(Tone.Frequency(midi, "midi").toFrequency(), dur, at, vel);
}

export function tick(at: number, accent = false) {
  if (!click) {
    click = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      volume: -12,
    }).connect(bus());
  }
  click.triggerAttackRelease(accent ? 2000 : 1500, 0.03, at);
}

/** A short wash of noise to wipe the last pitch from short-term memory. */
export function noiseBurst(at: number, dur = 1.2) {
  if (!noise) {
    noiseEnv = new Tone.AmplitudeEnvelope({ attack: 0.05, decay: 0, sustain: 1, release: 0.2 }).connect(bus());
    noise = new Tone.Noise({ type: "pink", volume: -14 }).connect(noiseEnv).start();
  }
  noiseEnv!.triggerAttackRelease(dur, at);
}

export function stopAll() {
  sine?.releaseAll();
  piano?.releaseAll();
}

/** Map an audio-clock time to performance.now() time, including output latency. */
export function audioToPerf(t: number): number {
  const ctx = Tone.getContext().rawContext as AudioContext;
  if (typeof ctx.getOutputTimestamp === "function") {
    const ts = ctx.getOutputTimestamp();
    if (ts.performanceTime && ts.contextTime != null) return ts.performanceTime + (t - ts.contextTime) * 1000;
  }
  const lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
  return performance.now() + (t - ctx.currentTime + lat) * 1000;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
