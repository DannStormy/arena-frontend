import type { CSSProperties, ReactNode } from 'react';
import { TorchLockup } from '@/components/common/Logo';
import { MindEnergy } from '@/components/common/MindEnergy';

// Hand-tuned ember motes — every field is varied (start-x spread across the
// width, size 2–5px, SLOW 8–13s rise, staggered delay, alternating sway
// direction, and a low peak opacity) so the field reads as sparse, calm
// embers, never a synced fountain. Kept to 12 for a barely-there density.
const EMBER_MOTES: ReadonlyArray<{
  x: string;
  size: number;
  dur: number;
  delay: number;
  sway: string;
  peak: number;
}> = [
  { x: '8%', size: 3, dur: 11, delay: 0, sway: '10px', peak: 0.5 },
  { x: '17%', size: 2, dur: 13, delay: 4.5, sway: '-8px', peak: 0.36 },
  { x: '26%', size: 4, dur: 9, delay: 1.8, sway: '12px', peak: 0.55 },
  { x: '35%', size: 2.5, dur: 12, delay: 6.4, sway: '-11px', peak: 0.42 },
  { x: '45%', size: 3.5, dur: 10, delay: 2.9, sway: '9px', peak: 0.5 },
  { x: '53%', size: 2, dur: 13, delay: 8, sway: '-7px', peak: 0.34 },
  { x: '62%', size: 5, dur: 8, delay: 2.3, sway: '13px', peak: 0.46 },
  { x: '69%', size: 3, dur: 11.5, delay: 5.6, sway: '-10px', peak: 0.48 },
  { x: '77%', size: 2.5, dur: 12.5, delay: 1, sway: '10px', peak: 0.4 },
  { x: '85%', size: 4, dur: 9.5, delay: 7.1, sway: '-12px', peak: 0.52 },
  { x: '91%', size: 2, dur: 13, delay: 3.6, sway: '8px', peak: 0.32 },
  { x: '13%', size: 3.5, dur: 10.5, delay: 9, sway: '-9px', peak: 0.44 },
];

// Atmospheric ember layer behind the auth content — soft embers slowly lifting
// off an unseen calm fire (the CALM end of Arena's fire). z-0, pointer-events
// none, overflow-hidden so motes never cause scroll or block taps.
function EmberField() {
  return (
    <div className="ember-field" aria-hidden>
      <div className="ember-coal-glow" />
      {EMBER_MOTES.map((m, i) => (
        <span
          key={i}
          className="ember-mote"
          style={
            {
              '--x': m.x,
              '--size': `${m.size}px`,
              '--dur': `${m.dur}s`,
              '--delay': `${m.delay}s`,
              '--sway': m.sway,
              '--peak': m.peak,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

// A subtle, static ember sunburst behind the mark — echoes the ShareCard
// ray-burst motif (§10) without any animation cost. Masked to a soft radial fade.
function HeroSunburst() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2"
      style={{
        background:
          'repeating-conic-gradient(from 0deg at 50% 50%, rgba(232,137,59,0.11) 0deg 5deg, transparent 5deg 15deg)',
        maskImage: 'radial-gradient(circle at 50% 50%, #000 0%, transparent 62%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0%, transparent 62%)',
      }}
    />
  );
}

// The shared branded splash: big curl mark + wordmark + hype value-line + a faint
// "live" signal. Identical on both auth pages so the entry reads as one arcade.
// The hero shrinks to fit a short viewport: the tall MindEnergy constellation is
// hidden below 720px tall, and the brand-lockup margins tighten — so the login
// AND the taller register form always fit one screen without page scroll.
function AuthHero() {
  return (
    <div className="relative mb-7 flex shrink-0 flex-col items-center text-center [@media(max-height:720px)]:mb-4">
      {/* Brand lockup */}
      <div className="relative mb-4 flex flex-col items-center [@media(max-height:720px)]:mb-2">
        <HeroSunburst />
        <TorchLockup
          capHeight={52}
          className="relative drop-shadow-[0_6px_20px_rgba(232,137,59,0.42)] [@media(max-height:720px)]:scale-[0.8]"
        />
        <span className="relative mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-arena-text-tertiary [@media(max-height:720px)]:mt-1.5">
          Train your mind
        </span>
      </div>

      {/* MindEnergy — an animated neural constellation (a sharp mind firing)
         in place of the old headline/sub/chip. Warm ember firelight only.
         Hidden on short viewports to guarantee the form fits one screen. */}
      <MindEnergy className="mt-1 w-full max-w-[300px] [@media(max-height:720px)]:hidden" />
      <span className="sr-only">
        Arena — the mind-sport arena. The sharpest mind wins.
      </span>
    </div>
  );
}

/**
 * Branded, high-energy shell for the logged-out entry (§8).
 * Renders the ambient ember glow, the shared hype hero, and a machined panel
 * around the auth form passed as children. Presentation only — no auth logic.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    // Fixed to exactly one viewport — the page itself never scrolls, so the
    // primary action (Sign in / Create account) can never drop off-screen.
    <div className="relative h-[100dvh] overflow-hidden bg-arena-bg">
      {/* Ambient ember room-light (reused from index.css), clipped to the frame */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-room-light" />
        <div className="hero-room-drift" />
      </div>

      {/* Atmospheric ember-mote field — soft embers drifting up off a calm fire */}
      <EmberField />

      {/* Inner column centers the content and is the ONLY region allowed to
          shrink/scroll, and only if a very short viewport truly overflows. */}
      <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-sm flex-col justify-center overflow-y-auto px-5 py-6 [@media(max-height:720px)]:py-4">
        <AuthHero />
        <div className="animate-slide-up relative w-full shrink-0">
          <div className="hero-card-surface clip-card relative border border-arena-border bg-arena-surface/80 p-6 backdrop-blur-sm [@media(max-height:720px)]:p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
