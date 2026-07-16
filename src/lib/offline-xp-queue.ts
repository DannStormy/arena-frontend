import { api } from '@/lib/api';
import type { ValidateAnswerRequest } from '@/types/challenge.types';

/**
 * Offline XP — "bank offline, sync on reconnect."
 *
 * Correct answers played offline are banked here (in localStorage, so they
 * survive the app closing / a tunnel) and replayed through /challenges/validate
 * when the connection returns. The server re-derives each challenge from the
 * seed and awards idempotently (keyed on matchSeed:index), so this can never
 * fake XP (the server re-checks every answer) and never double-counts (a
 * half-finished sync just resumes).
 */
const KEY = 'arena_xp_queue_v1';
const MAX = 100; // cap so a long offline stretch can't bloat localStorage

type QueuedAnswer = ValidateAnswerRequest;

function read(): QueuedAnswer[] {
  try {
    const raw = localStorage.getItem(KEY);
    const q = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(q) ? (q as QueuedAnswer[]) : [];
  } catch {
    return [];
  }
}

function write(q: QueuedAnswer[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* quota / disabled storage — best effort */
  }
}

/** Bank a correct offline answer for later sync. Drops the oldest past MAX. */
export function enqueueOfflineXp(item: QueuedAnswer): void {
  const q = read();
  q.push(item);
  write(q.length > MAX ? q.slice(q.length - MAX) : q);
}

export function pendingXpCount(): number {
  return read().length;
}

let draining = false;

/**
 * Replay banked answers through /challenges/validate (idempotent). Each item is
 * removed only after a confirmed success; the first network/server failure stops
 * the drain and keeps the remainder for next time. Returns the count synced.
 */
export async function drainOfflineXp(): Promise<number> {
  if (draining) return 0;
  draining = true;
  let synced = 0;
  try {
    for (;;) {
      const q = read();
      if (q.length === 0) break;
      try {
        await api.post('/challenges/validate', q[0]);
      } catch {
        break; // offline again / server error — retry later, queue intact
      }
      const after = read();
      after.shift(); // the item we just synced is still the oldest
      write(after);
      synced++;
    }
  } finally {
    draining = false;
  }
  return synced;
}
