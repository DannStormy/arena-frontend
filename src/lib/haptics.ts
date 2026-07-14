/**
 * Tiny haptic helper for tactile button/tile feedback on mobile.
 *
 * Rules (mirrors src/lib/sfx.ts discipline):
 *  • Feature-detected — `navigator.vibrate` is absent on desktop and iOS Safari,
 *    so every call is guarded and wrapped in try/catch. It must never throw.
 *  • Respects prefers-reduced-motion — a user who opted out of motion should not
 *    get buzzed either.
 *  • Keep patterns SHORT. A control tap is a single ~10ms blip; feedback bursts
 *    are a few tens of ms. Long patterns feel broken on cheap Android motors.
 */

function reducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

function buzz(pattern: number | number[]): void {
  try {
    if (reducedMotion()) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore — haptics are a nicety, never a hard dependency */
  }
}

/** A crisp control tap — keypad digit, tile, option press. */
export function tap(): void {
  buzz(10);
}

/** A firmer confirm — submit / enter. */
export function confirm(): void {
  buzz(18);
}

/** Positive feedback — correct answer / matched sequence. */
export function success(): void {
  buzz(18);
}

/** Negative feedback — wrong answer / broken sequence. */
export function error(): void {
  buzz([28, 34, 28]);
}
