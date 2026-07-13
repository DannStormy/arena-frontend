/**
 * quips — the app's little voice lines.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  THIS IS YOURS TO FILL.                                                   │
 * │  Every line below is a PLACEHOLDER. Swap them for your voice — the        │
 * │  breezy, plain, half-a-breath lines you'd actually say. Rules that hold:  │
 * │    · no emoji, anywhere                                                   │
 * │    · plain over clever — never try-hard, never corny                     │
 * │    · short. one glance. a line, not a sentence.                          │
 * │  Add as many per slot as you like; the picker rotates through them.      │
 * │  Freestyle scratch (your words, parked — move up into a slot when ready):│
 * │    "go gentle into the night" · "fight, survive" · "boom"                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * A slot with an empty array renders nothing (safe to leave blank while you
 * think). Wiring lives in the result/game screens — see `pickQuip` callers.
 */

export type QuipContext =
  | 'win' // you beat someone / topped the board
  | 'loss' // you came up short
  | 'tie' // dead even
  | 'correct' // right answer, mid-game
  | 'wrong' // wrong answer, mid-game
  | 'loading'; // waiting on a match / results

export const QUIPS: Record<QuipContext, readonly string[]> = {
  win: [
    'That was clean.',
    'You had it start to finish.',
    'Back for more.',
  ],
  loss: [
    'So close.',
    'Run it back.',
    "Next one's yours.",
  ],
  tie: [
    'Dead even.',
    'Nobody blinked.',
    'Run it back to settle it.',
  ],
  correct: [
    'Sharp.',
    'Locked in.',
    'Got it.',
  ],
  wrong: [
    'Not that one.',
    'Shake it off.',
    'Keep moving.',
  ],
  loading: [
    'Setting up.',
    'Warming up.',
    'One sec.',
  ],
};

// Tiny stable string/number hash → index. Passing a seed (a duel id, a score)
// keeps the same line across re-renders instead of reshuffling on every paint.
function seededIndex(len: number, seed: string | number): number {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

/**
 * Pick one line for a context. Pass a stable `seed` (e.g. the duel id or the
 * final score) so it doesn't flicker between renders; omit it for a fresh
 * random line each call. Returns `null` when the slot is empty — callers should
 * render nothing in that case.
 */
export function pickQuip(context: QuipContext, seed?: string | number): string | null {
  const lines = QUIPS[context];
  if (!lines.length) return null;
  const i = seed === undefined ? Math.floor(Math.random() * lines.length) : seededIndex(lines.length, seed);
  return lines[i];
}
