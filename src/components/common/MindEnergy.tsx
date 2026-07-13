import { useId } from 'react';
import type { CSSProperties } from 'react';

/**
 * MindEnergy — an abstract neural constellation for the auth hero.
 *
 * A mind mid-thought: ~13 warm neurons scattered like a loose brain (not a
 * grid), wired by faint synapse lines. Bright signal-comets race along a few of
 * those wires and flare each node the instant they arrive, while every neuron
 * breathes a slow ember glow between firings. Firelight only — gold/amber, never
 * tech-blue.
 *
 * How the firing works (all in index.css):
 *   • Each signal is a dash riding one <path> via `stroke-dashoffset` for the
 *     first ~28% of its cycle, then parked off-path (invisible) for the rest.
 *     That built-in pause is what keeps only ~3–4 comets in flight at once even
 *     though there's now one signal per neuron (every node fires over a cycle).
 *   • Every signal carries its own `dur`/`delay` (inline) so no two ever sync —
 *     signals are always racing *somewhere*, never in lockstep.
 *   • The destination node's flare ring shares that exact dur+delay and peaks at
 *     ~26% — right as the comet lands — so the node "lights up" on arrival.
 *
 * Motion is stroke-dashoffset / opacity / transform only (no animated filters),
 * so it holds 60fps on low-end Android. Under prefers-reduced-motion it collapses
 * to a static lit constellation (see the reduced-motion block in index.css).
 */

// ── Neuron layout — hand-scattered inside a 300×160 viewBox, varied sizes.
//    Loosely two lobes so it reads as a mind, never a literal brain or a grid.
const NODES: ReadonlyArray<{ x: number; y: number; r: number; breatheDur: number; breatheDelay: number }> = [
  { x: 38, y: 82, r: 3.5, breatheDur: 4.4, breatheDelay: 0.0 }, // 0
  { x: 66, y: 44, r: 3.0, breatheDur: 5.2, breatheDelay: 1.3 }, // 1
  { x: 92, y: 104, r: 3.0, breatheDur: 4.8, breatheDelay: 2.1 }, // 2
  { x: 120, y: 62, r: 5.0, breatheDur: 5.6, breatheDelay: 0.6 }, // 3 hub
  { x: 150, y: 96, r: 3.5, breatheDur: 4.2, breatheDelay: 2.7 }, // 4
  { x: 150, y: 30, r: 2.5, breatheDur: 5.0, breatheDelay: 3.4 }, // 5
  { x: 186, y: 68, r: 4.5, breatheDur: 4.6, breatheDelay: 1.0 }, // 6 hub
  { x: 200, y: 112, r: 3.0, breatheDur: 5.4, breatheDelay: 3.0 }, // 7
  { x: 224, y: 40, r: 3.0, breatheDur: 4.9, breatheDelay: 1.7 }, // 8
  { x: 250, y: 92, r: 3.5, breatheDur: 4.3, breatheDelay: 2.4 }, // 9
  { x: 278, y: 58, r: 4.0, breatheDur: 5.1, breatheDelay: 0.3 }, // 10
  { x: 108, y: 132, r: 2.5, breatheDur: 5.3, breatheDelay: 3.6 }, // 11
  { x: 232, y: 126, r: 2.5, breatheDur: 4.7, breatheDelay: 1.9 }, // 12
];

// Faint synapse wires (node index pairs). A delicate web — structure, not noise.
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6],
  [5, 6], [6, 7], [6, 8], [7, 9], [8, 9], [9, 10], [2, 11], [7, 12],
];

// Firing signals: [source, dest, dur(s), delay(s)]. Each rides an existing wire
// (so the comet stays on a drawn line) and flares its dest node on arrival.
//
// Invariant: every one of the 13 neurons appears as a `dest` exactly once, so
// the whole constellation fires over a cycle — no dark nodes. Each signal rides
// a *different* wire (13 of the 15 edges), and the durations are mutually
// incommensurate (5.0–6.6, no shared factors), so the aggregate pattern drifts
// out of phase and never visibly repeats. A comet is only mid-flight for the
// first ~28% of its cycle (then parks off-path), and the delays are spread
// across ~6s, so on average just ~3–4 are travelling at once — a mind mid-
// thought roving the whole web, not a fixed handful of lit paths.
const SIGNALS: ReadonlyArray<readonly [number, number, number, number]> = [
  [1, 0, 5.8, 0.0], // → 0
  [0, 2, 5.2, 1.4], // → 2
  [7, 12, 5.7, 1.1], // → 12
  [4, 6, 5.0, 0.7], // → 6
  [6, 8, 5.4, 1.9], // → 8
  [3, 4, 5.5, 2.2], // → 4
  [9, 10, 5.1, 2.7], // → 10
  [3, 1, 6.4, 3.1], // → 1
  [6, 7, 6.2, 3.8], // → 7
  [7, 9, 5.9, 4.2], // → 9
  [1, 3, 6.0, 4.7], // → 3
  [3, 5, 6.6, 5.3], // → 5
  [2, 11, 6.3, 5.9], // → 11
];

// Order-independent quadratic control point, so a wire and the comet riding it
// share the identical curve regardless of travel direction. Gentle bend keeps
// the web organic without wobble; sign alternates off the sorted pair.
function control(a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const p = NODES[lo];
  const q = NODES[hi];
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = ((lo + hi) % 2 === 0 ? 1 : -1) * 7;
  return { cx: mx + (-dy / len) * bend, cy: my + (dx / len) * bend };
}

function edgePath([a, b]: readonly [number, number]) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const { cx, cy } = control(a, b);
  return `M ${NODES[lo].x} ${NODES[lo].y} Q ${cx} ${cy} ${NODES[hi].x} ${NODES[hi].y}`;
}

// Path oriented source→dest (comet travels from M toward the end point).
function signalPath(src: number, dst: number) {
  const { cx, cy } = control(src, dst);
  return `M ${NODES[src].x} ${NODES[src].y} Q ${cx} ${cy} ${NODES[dst].x} ${NODES[dst].y}`;
}

const CENTERED = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

export function MindEnergy({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const coreGrad = `mind-core-${uid}`;
  const haloGrad = `mind-halo-${uid}`;
  const signalGrad = `mind-signal-${uid}`;

  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 300 160"
        width="100%"
        style={{ overflow: 'visible', display: 'block' }}
        role="presentation"
      >
        <defs>
          <radialGradient id={coreGrad} cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#FFF3D8" />
            <stop offset="45%" stopColor="#FFD23F" />
            <stop offset="100%" stopColor="#E8893B" />
          </radialGradient>
          <radialGradient id={haloGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F0B05A" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#F0B05A" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#F0B05A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={signalGrad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD23F" />
            <stop offset="100%" stopColor="#FFF3D8" />
          </linearGradient>
        </defs>

        {/* Faint synapse wires — the resting web behind everything. */}
        <g stroke="#F0B05A" fill="none" strokeLinecap="round">
          {EDGES.map((e, i) => (
            <path key={i} d={edgePath(e)} strokeWidth={1} opacity={0.12} />
          ))}
        </g>

        {/* Signal comets — a soft wide glow + a bright core, sharing one dash
            animation per signal. `pathLength=100` normalises the dash math; the
            base stroke-dashoffset (12) is off-path, so under reduced motion the
            comets simply stay invisible. */}
        {SIGNALS.map(([src, dst, dur, delay], i) => {
          const d = signalPath(src, dst);
          const timing = { animationDuration: `${dur}s`, animationDelay: `${delay}s` } as CSSProperties;
          return (
            <g key={`sig-${i}`} fill="none" strokeLinecap="round">
              <path
                className="mind-signal"
                d={d}
                pathLength={100}
                stroke="#F0B05A"
                strokeWidth={5}
                strokeDasharray="12 320"
                strokeDashoffset={12}
                opacity={0.4}
                style={timing}
              />
              <path
                className="mind-signal"
                d={d}
                pathLength={100}
                stroke={`url(#${signalGrad})`}
                strokeWidth={2}
                strokeDasharray="12 320"
                strokeDashoffset={12}
                style={timing}
              />
            </g>
          );
        })}

        {/* Neurons — breathing halo behind, solid warm core on top. */}
        {NODES.map((n, i) => (
          <g key={`node-${i}`}>
            <circle
              className="mind-breathe"
              cx={n.x}
              cy={n.y}
              r={n.r * 3.4}
              fill={`url(#${haloGrad})`}
              style={{ ...CENTERED, animationDuration: `${n.breatheDur}s`, animationDelay: `${n.breatheDelay}s` }}
            />
            <circle cx={n.x} cy={n.y} r={n.r} fill={`url(#${coreGrad})`} />
          </g>
        ))}

        {/* Flare rings — one per signal, on the dest node, timed to the comet's
            arrival (same dur+delay). Base opacity 0 so they're dark at rest and
            under reduced motion. */}
        {SIGNALS.map(([, dst, dur, delay], i) => {
          const n = NODES[dst];
          return (
            <circle
              key={`flare-${i}`}
              className="mind-flare"
              cx={n.x}
              cy={n.y}
              r={n.r + 2.5}
              fill="none"
              stroke="#FFE8A8"
              strokeWidth={1.6}
              opacity={0}
              style={{ ...CENTERED, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
            />
          );
        })}
      </svg>
    </div>
  );
}
