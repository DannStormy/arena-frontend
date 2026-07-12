/**
 * Tiny WebAudio SFX for the core play loop. No audio files — every sound is
 * synthesised from oscillators, so it costs nothing to ship (fun-per-megabyte).
 *
 * Design rules:
 *  • The AudioContext is created lazily and resumed from a user gesture
 *    (`unlock()`), because mobile/Safari block audio until the first tap.
 *  • Mute state persists to localStorage and is honoured by every emitter.
 *  • Everything is wrapped in try/catch — audio must never throw or block the
 *    game, even on browsers without WebAudio.
 */

let ctx: AudioContext | null = null;
let muted = false;

const STORAGE_KEY = 'arena.sfx.muted';

try {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  /* localStorage unavailable — default unmuted */
}

function getCtx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a real user gesture (button/keypress) to unlock audio on mobile. */
export function unlock(): void {
  getCtx();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  /** Seconds. */
  dur?: number;
  gain?: number;
  /** Glide the pitch to this frequency over `dur` (must be > 0). */
  slideTo?: number;
  /** Seconds to offset the start (for quick arpeggios). */
  delay?: number;
}

function tone({ freq, type = 'sine', dur = 0.12, gain = 0.14, slideTo, delay = 0 }: ToneOpts): void {
  const c = getCtx();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    // Attack/decay envelope — exponential ramps can't hit 0, so floor at tiny value.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  } catch {
    /* ignore */
  }
}

/** Correct answer — short bright blip whose pitch rises with the combo. */
export function correct(combo = 0): void {
  if (muted) return;
  const base = 520 + Math.min(combo, 8) * 42;
  tone({ freq: base, type: 'triangle', dur: 0.09, gain: 0.16, slideTo: base * 1.5 });
  tone({ freq: base * 1.5, type: 'triangle', dur: 0.1, gain: 0.11, delay: 0.06 });
}

/** Wrong answer — low descending saw "thunk". */
export function wrong(): void {
  if (muted) return;
  tone({ freq: 210, type: 'sawtooth', dur: 0.22, gain: 0.16, slideTo: 90 });
}

/** Danger-zone countdown tick — tiny square blip. */
export function tick(): void {
  if (muted) return;
  tone({ freq: 900, type: 'square', dur: 0.03, gain: 0.05 });
}

/** Ran out of time — heavier descending thunk. */
export function timeout(): void {
  if (muted) return;
  tone({ freq: 170, type: 'sawtooth', dur: 0.3, gain: 0.18, slideTo: 65 });
}

/** Victory flourish — quick rising triad. */
export function win(): void {
  if (muted) return;
  [0, 0.1, 0.2].forEach((d, i) =>
    tone({ freq: 523 * (1 + i * 0.26), type: 'triangle', dur: 0.15, gain: 0.14, delay: d }),
  );
}
