import { useId } from 'react';

/**
 * EmberFlame — a premium, subtle glowing ember (a warm coal, not a flame emoji).
 *
 * Anatomy:
 *   • core   — a small warm coal, white-hot centre → gold → burnt-orange edge.
 *   • halo   — a soft radial bloom around the core (drop-shadow does the real glow).
 *   • sparks — 1–3 tiny motes that drift up and fade, staggered.
 *
 * The flicker is intentionally organic: the core rides `ember-flicker-a` (1.7s) and
 * the halo rides `ember-flicker-b` (2.3s) so the two cycles never re-sync — no
 * mechanical strobe. All motion is transform + opacity + brightness; glow is a
 * cheap CSS drop-shadow. Pure inline SVG, no deps, no images, 60fps on low-end
 * Android. Under prefers-reduced-motion it collapses to a static glow.
 *
 * `intensity` (0–1, clamped) drives the whole feel: bigger/hotter/brighter core,
 * more and faster sparks, stronger bloom as it climbs (amber → gold → near-white).
 */

interface EmberFlameProps {
  /** 0–1, clamped. Higher = bigger, hotter, more sparks, stronger glow. */
  intensity?: number;
  /** Rendered box size in px (glow blooms slightly beyond it). */
  size?: number;
  className?: string;
}

// Linear interpolate between two #rrggbb hex colours → an rgb() string.
function lerpColor(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function EmberFlame({ intensity = 0.5, size = 24, className }: EmberFlameProps) {
  const t = Math.max(0, Math.min(1, intensity));
  const uid = useId().replace(/:/g, '');

  // ── Geometry (viewBox is 0 0 40 40, core centred at 20,20) ─────────────────
  const coreR = 5.5 + t * 3.5;
  const haloR = 15 + t * 4;
  const haloOpacity = 0.32 + t * 0.42;
  const glowBlur = 3 + t * 5;

  // ── Palette — amber at rest, gold mid, near-white hot ──────────────────────
  const coreCenter = lerpColor('#FFE7B4', '#FFFBF2', t); // warm white → near white
  const coreMid = lerpColor('#F3B45E', '#FFD23F', t); // amber → gold
  const coreEdge = lerpColor('#C2541E', '#F0902A', t); // burnt → hot orange
  const glowColor = lerpColor('#E8893B', '#FFC24A', t);
  const sparkColor = lerpColor('#F0B05A', '#FFD98A', t);

  // ── Sparks — none when guttering, up to 3 when roaring ─────────────────────
  const sparkCount = t < 0.12 ? 0 : t < 0.55 ? 1 : t < 0.85 ? 2 : 3;
  const sparkDur = 2.4 - t * 0.9; // faster as it heats up
  const sparks = [
    { x: 20, y: 15, delay: 0, dur: sparkDur, r: 1.5 },
    { x: 16.5, y: 16, delay: sparkDur * 0.55, dur: sparkDur * 1.15, r: 1.2 },
    { x: 23.5, y: 16.5, delay: sparkDur * 0.3, dur: sparkDur * 0.9, r: 1.1 },
  ].slice(0, sparkCount);

  const centered = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

  return (
    <span
      className={className}
      style={{ display: 'inline-block', width: size, height: size, verticalAlign: 'middle', lineHeight: 0 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${glowBlur}px ${glowColor})` }}
      >
        <defs>
          <radialGradient id={`ember-halo-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.9" />
            <stop offset="45%" stopColor={glowColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`ember-core-${uid}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={coreCenter} />
            <stop offset="45%" stopColor={coreMid} />
            <stop offset="100%" stopColor={coreEdge} />
          </radialGradient>
        </defs>

        {/* Soft bloom — slower 2.3s cycle, offset from the core */}
        <circle
          className="animate-ember-flicker-b"
          cx="20"
          cy="20"
          r={haloR}
          fill={`url(#ember-halo-${uid})`}
          opacity={haloOpacity}
          style={centered}
        />

        {/* The coal itself — 1.7s flicker with brightness ride */}
        <circle
          className="animate-ember-flicker-a"
          cx="20"
          cy="20"
          r={coreR}
          fill={`url(#ember-core-${uid})`}
          style={centered}
        />

        {/* Drifting sparks */}
        {sparks.map((s, i) => (
          <circle
            key={i}
            className="animate-ember-spark"
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={sparkColor}
            style={{ ...centered, opacity: 0, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
          />
        ))}
      </svg>
    </span>
  );
}
