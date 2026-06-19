/**
 * Ember theme palette — warm firelight on near-black.
 *
 * Single source of truth. Two consumers:
 *   • index.css  — .duels-ember CSS custom properties (for future Tailwind-class usage)
 *   • DuelsPage.tsx — inline style values (for hex-suffix opacity operations)
 *
 * Keep ember.ts and .duels-ember in sync when values change.
 */

export const EMBER = {
  // ── Surfaces ────────────────────────────────────────────────────────────────
  base:          '#08080D',   // near-black page bg (approved mock)
  surface:       '#120F0C',   // warm-tinted card surface
  surfaceRaised: '#1C1610',   // slightly elevated element

  // ── Accents ─────────────────────────────────────────────────────────────────
  accent:       '#E8893B',    // primary firelight orange
  accentDeep:   '#C2541E',    // burnt orange — winner ring start, primary button
  accentBright: '#F0B05A',    // amber — WON badge, W streak chips

  // ── Win — amber family (no cold green) ──────────────────────────────────────
  win:       '#F0B05A',
  winBg:     'rgba(240,176,90,0.13)',
  winBorder: 'rgba(240,176,90,0.44)',

  // ── Loss — warm crimson, melancholy not alarm ────────────────────────────────
  loss:       '#9D3D2A',
  lossInk:    '#d98a6f',               // LOST pill text — warmer mid-tone
  lossBg:     'rgba(138,51,36,0.18)',  // exact mock value
  lossBorder: 'rgba(138,51,36,0.50)', // exact mock value (inset shadow)

  // ── Text ─────────────────────────────────────────────────────────────────────
  textWinner:    '#F8FAFC',   // near-white — winner score
  textPrimary:   '#F0E8DC',   // warm white
  textSecondary: '#A89A87',   // warm mid-grey
  textTertiary:  '#7A6E60',   // warm muted
  muted:         '#8f8478',   // subtle warm muted

  // ── Structural ───────────────────────────────────────────────────────────────
  vsInk:   '#5a5048',   // VS divider text
  hairline: 'rgba(232,137,59,0.10)', // inset card border
  border:  '#221810',  // warm dark border

  // ── Per-mode accents ─ harmonised into firelight, each still distinct ────────
  mode: {
    trivia:       '#E8893B',  // primary ember   — trivia is the base case
    blitz:        '#F0B05A',  // bright amber     — blitz burns hotter / faster
    sudden_death: '#B84230',  // deep crimson     — death is dark fire
    streak:       '#D4664C',  // warm coral       — streak is building heat
    steal:        '#C08050',  // warm copper      — steal has metallic warmth
  } as Record<string, string>,
} as const;

/** Ember-world mode accent — use on the duels page instead of getModeAccent. */
export function getEmberModeAccent(mode: string): string {
  return EMBER.mode[mode] ?? EMBER.accent;
}
