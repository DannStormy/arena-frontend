import type { ReactNode } from 'react';
import { BRAND_NAME, Logo } from '@/components/common/Logo';

// A subtle, static ember sunburst behind the shield — echoes the ShareCard
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

// The shared branded splash: big shield + wordmark + hype value-line + a faint
// "live" signal. Identical on both auth pages so the entry reads as one arcade.
function AuthHero() {
  return (
    <div className="relative mb-7 flex flex-col items-center text-center">
      {/* Brand lockup */}
      <div className="relative mb-4 flex flex-col items-center">
        <HeroSunburst />
        <Logo
          variant="mark"
          size={72}
          className="relative drop-shadow-[0_6px_20px_rgba(232,137,59,0.45)]"
        />
        <span
          className="relative mt-3 font-display text-4xl font-bold uppercase leading-none tracking-tight"
          style={{ color: '#E8893B' }}
        >
          {BRAND_NAME}
        </span>
        <span className="relative mt-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-arena-text-tertiary">
          The mind-sport arena
        </span>
      </div>

      {/* Hype value-line */}
      <h1 className="font-display text-[26px] font-bold leading-tight text-arena-text-primary">
        Sharpest mind wins.
      </h1>
      <p className="mt-1.5 text-sm font-medium text-arena-text-secondary">
        Outsmart. Outspeed. Bank the points. ⚡
      </p>

      {/* Value-prop chip — an honest positioning line, NOT a fabricated user
         count (no invented "N players online" — the product's whole trust
         model is no-deception). The pulsing dot is pure ember energy. */}
      <div className="clip-chip mt-4 inline-flex items-center gap-2 bg-arena-elev/70 px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-arena-accent" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-arena-accent" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-arena-text-secondary">
          Free to play · skill, not luck
        </span>
      </div>
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
    <div className="relative min-h-svh bg-arena-bg">
      {/* Ambient ember room-light (reused from index.css), clipped to the frame */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-room-light" />
        <div className="hero-room-drift" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-svh max-w-sm flex-col justify-center px-5 py-10">
        <AuthHero />
        <div className="animate-slide-up relative w-full">
          <div className="hero-card-surface clip-card relative border border-arena-border bg-arena-surface/80 p-6 backdrop-blur-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
