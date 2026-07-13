/**
 * quips — the app's little voice lines.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  THIS IS YOUR VOICE. Edit freely — add, cut, reorder.                     │
 * │  The picker rotates through each slot; an empty slot renders nothing.     │
 * │  Only hard rule: no emoji, anywhere.                                      │
 * │  Freestyle scratch (parked — move up into a slot when ready):            │
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
  | 'loading' // waiting on a match / results
  | 'rematch'; // queuing again after a loss — defined, not yet wired (needs comeback detection)

export const QUIPS: Record<QuipContext, readonly string[]> = {
  win: [
    'ba sing se',
    'hahaha',
  ],
  loss: [
    'You sef eh',
    'Omo...',
    '...',
    "you'll get there lol.",
  ],
  tie: [
    // your voice here — no tie lines yet
    'Dead even.',
    'Nobody blinked.',
  ],
  correct: [
    'sonic boom',
  ],
  wrong: [
    'bruh...',
    'Fawwwwwwwwk!',
  ],
  loading: [
    "bzzzz bzzzz...don't mind me, just beeing around",
    'goodluck in there.',
    'sudo docker...complete it',
  ],
  rematch: [
    // not wired to a surface yet — say the word and I'll fire it when you re-queue after a loss
    "He he he...look who's not giving up",
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
