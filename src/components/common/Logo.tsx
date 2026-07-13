import { useId } from 'react';

// BRAND_NAME is the single source of truth — change here to rename everywhere.
export const BRAND_NAME = 'Arena';

// ── Warm ember palette (mirrors --ember-* / ember.ts) ──────────────────────
const EMBER_DEEP = '#C2541E';
const EMBER = '#E8893B';
const AMBER = '#F0B05A';
const GOLD = '#FFD23F';
const WHITEHOT = '#FFF3D8';

// ── "Arena" wordmark, outlined from Fraunces 500 (upright optical serif) ────
// Baked to vector paths so the wordmark is fully self-contained: no font
// loading, pixel-perfect at any size, and — importantly — it serializes
// correctly in the html-to-image share-card export with zero font-timing risk.
// viewBox is 0 0 401.76 100, where height 100 == cap height.
const WORDMARK_VB_W = 401.76;
const WORDMARK_VB_H = 100;
const WORDMARK_RATIO = WORDMARK_VB_W / WORDMARK_VB_H;
const ARENA_PATH =
  'M29.71 95.44Q29.71 96.70 28.76 97.51Q27.81 98.31 25.77 98.31H3.93Q1.90 98.31 0.95 97.54Q0.00 96.77 0.00 95.44Q0.00 94.52 0.56 93.86Q1.12 93.19 2.67 92.49L5.13 91.57Q7.23 90.59 8.32 89.01Q9.41 87.43 10.67 83.36L34.27 12.08Q35.18 9.27 34.73 8.04Q34.27 6.81 31.74 6.11Q29.85 5.48 29.07 4.71Q28.30 3.93 28.30 2.81Q28.30 1.47 29.28 0.74Q30.27 0.00 32.23 0.00H63.90Q65.94 0.00 66.85 0.74Q67.77 1.47 67.77 2.81Q67.77 4.00 67.03 4.78Q66.29 5.55 64.47 6.04Q62.50 6.53 62.15 7.48Q61.80 8.43 62.50 10.60L87.50 85.18Q88.48 88.34 89.78 89.89Q91.08 91.43 93.47 92.06Q95.44 92.77 96.14 93.50Q96.84 94.24 96.84 95.44Q96.84 96.70 95.86 97.51Q94.87 98.31 92.84 98.31H63.41Q61.45 98.31 60.46 97.51Q59.48 96.70 59.48 95.44Q59.48 94.31 60.18 93.61Q60.88 92.91 62.36 92.49L66.85 91.71Q68.68 91.22 68.68 89.99Q68.68 88.76 67.77 86.10L60.96 65.45H24.65L19.03 82.44Q18.19 85.18 18.19 86.90Q18.19 88.62 19.28 89.71Q20.37 90.80 22.68 91.64L26.83 92.56Q28.30 93.05 29.00 93.68Q29.71 94.31 29.71 95.44ZM58.78 58.78 42.84 10.18 26.83 58.78ZM129.99 35.04 130.69 46.28Q131.04 45.37 131.39 44.45Q134.34 37.57 139.04 34.06Q143.75 30.55 149.09 30.55Q155.62 30.55 159.20 34.20Q162.78 37.85 162.78 44.52Q162.78 50.07 160.43 52.84Q158.08 55.62 154.35 55.62Q150.63 55.62 148.63 53.58Q146.63 51.54 146.63 47.89V45.44Q146.56 43.12 145.54 41.99Q144.52 40.87 142.13 40.87Q139.33 40.87 136.76 43.08Q134.20 45.29 132.58 49.79Q130.97 54.28 130.97 61.24V87.85Q130.97 89.75 131.74 90.66Q132.51 91.57 134.55 91.92L140.73 92.84Q142.28 93.05 143.05 93.75Q143.82 94.45 143.82 95.65Q143.82 96.91 142.91 97.61Q141.99 98.31 140.24 98.31H108.99Q107.16 98.31 106.32 97.61Q105.48 96.91 105.48 95.72Q105.48 94.73 106.07 94.07Q106.67 93.40 108.01 92.98L111.03 92.28Q112.36 91.85 113.03 90.91Q113.69 89.96 113.69 87.92V46.07Q113.69 44.38 113.13 43.64Q112.57 42.91 111.38 42.70L107.16 42.49Q105.90 42.21 105.37 41.64Q104.85 41.08 104.85 40.17Q104.85 39.19 105.51 38.52Q106.18 37.85 107.87 37.22L120.01 32.87Q123.10 31.74 124.58 31.36Q126.05 30.97 126.90 30.97Q128.30 30.97 129.04 31.92Q129.78 32.87 129.99 35.04ZM233.64 57.02Q233.64 60.53 231.60 62.39Q229.56 64.26 225.77 64.26H186.17Q187.01 75.14 192.56 81.04Q199.09 88.06 209.76 88.06Q216.36 88.06 221.24 85.25Q226.12 82.44 228.51 77.60Q229.56 76.33 230.23 75.88Q230.90 75.42 231.67 75.42Q232.65 75.42 233.15 76.33Q233.64 77.25 233.57 78.51Q233.22 84.34 229.39 89.26Q225.56 94.17 219.07 97.09Q212.57 100.00 204.28 100.00Q194.24 100.00 186.55 95.86Q178.86 91.71 174.54 84.20Q170.22 76.69 170.22 66.57Q170.22 56.11 174.40 48.00Q178.58 39.89 186.31 35.22Q194.03 30.55 204.78 30.55Q213.76 30.55 220.22 33.92Q226.69 37.29 230.16 43.26Q233.64 49.23 233.64 57.02ZM212.64 59.27Q216.15 59.27 216.15 56.18Q216.15 46.84 212.43 41.78Q208.71 36.73 202.46 36.73Q197.61 36.73 193.89 39.57Q190.17 42.42 188.13 47.68Q186.17 52.67 186.03 59.27ZM270.29 35.04V42.84Q277.46 36.66 282.87 33.78Q288.97 30.55 294.59 30.55Q303.16 30.55 307.87 36.24Q312.57 41.92 313.62 51.47L317.70 87.64Q317.98 89.82 318.57 90.84Q319.17 91.85 320.58 92.28L323.31 92.98Q324.58 93.40 325.18 94.07Q325.77 94.73 325.77 95.72Q325.77 96.91 324.96 97.61Q324.16 98.31 322.33 98.31H296.00Q292.42 98.31 292.42 95.58Q292.42 93.82 294.59 92.98L297.54 92.28Q299.02 91.85 299.75 90.80Q300.49 89.75 300.28 87.64L296.42 54.07Q295.65 47.54 293.01 44.24Q290.38 40.94 285.39 40.94Q282.23 40.94 278.69 42.66Q275.14 44.38 271.14 47.82L270.29 48.53V87.85Q270.29 89.89 270.93 90.87Q271.56 91.85 272.89 92.28L275.77 92.98Q277.95 93.82 277.95 95.58Q277.95 98.31 274.37 98.31H248.31Q246.49 98.31 245.65 97.61Q244.80 96.91 244.80 95.72Q244.80 94.73 245.40 94.07Q246.00 93.40 247.26 92.98L250.35 92.28Q251.69 91.85 252.35 90.91Q253.02 89.96 253.02 87.92V45.93Q253.02 44.24 252.46 43.50Q251.90 42.77 250.70 42.56L246.49 42.35Q245.22 42.13 244.70 41.54Q244.17 40.94 244.17 40.10Q244.17 39.04 244.80 38.38Q245.44 37.71 247.19 37.15L259.55 32.65Q261.94 31.81 263.45 31.39Q264.96 30.97 266.22 30.97Q268.26 30.97 269.28 32.09Q270.29 33.22 270.29 35.04ZM333.64 83.64Q333.64 75.14 341.26 69.77Q348.88 64.40 362.50 64.40Q367.21 64.40 371.07 65.24Q372.82 65.66 374.44 66.15V46.77Q374.44 41.22 371.66 38.24Q368.89 35.25 363.83 35.25Q359.06 35.25 356.60 37.25Q354.14 39.26 354.14 42.06V47.96Q354.14 51.76 351.65 53.79Q349.16 55.83 344.66 55.83Q340.73 55.83 338.69 53.93Q336.66 52.04 336.66 48.74Q336.66 44.31 340.17 40.17Q343.68 36.03 350.46 33.32Q357.23 30.62 366.99 30.62Q379.42 30.62 385.50 35.81Q391.57 41.01 391.57 49.72V87.01Q391.57 89.12 392.42 90.13Q393.26 91.15 394.73 91.15Q396.42 91.15 397.16 90.38Q397.89 89.61 398.46 88.83Q398.88 88.41 399.26 88.10Q399.65 87.78 400.21 87.78Q400.98 87.78 401.37 88.34Q401.76 88.90 401.76 89.89Q401.76 92.06 400.25 94.42Q398.74 96.77 395.75 98.38Q392.77 100.00 388.34 100.00Q382.44 100.00 379.00 97.26Q376.26 95.08 375.70 91.43Q372.33 94.80 367.84 96.91Q361.31 100.00 354.00 100.00Q344.94 100.00 339.29 95.54Q333.64 91.08 333.64 83.64ZM374.44 70.79Q372.75 70.15 371.00 69.66Q368.19 68.96 364.89 68.96Q358.57 68.96 354.95 72.12Q351.33 75.28 351.33 80.83Q351.33 86.24 354.35 89.15Q357.37 92.06 362.08 92.06Q366.29 92.06 370.22 90.10Q372.54 88.97 374.44 87.29Z';

interface LogoProps {
  variant?: 'full' | 'mark';
  /** Mark size in px (width basis for 'mark'; mark height for 'full'). Defaults to 28 / 30. */
  size?: number;
  className?: string;
}

/**
 * The ember-CURL mark — a single graceful, tapering ember curl in a warm ember
 * gradient with one white-gold highlight streak (the "Elegant & flowing"
 * direction). Static (no animation) so it's crisp in the header, on auth, and
 * in the html-to-image share export. `size` is the width basis; the mark is
 * slightly taller than wide (viewBox 56×66).
 */
export function CurlMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={(size * 66) / 56}
      viewBox="0 0 56 66"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id={`mk-glow-${id}`} cx="50%" cy="58%" r="55%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.4" />
          <stop offset="60%" stopColor={EMBER} stopOpacity="0.12" />
          <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`mk-body-${id}`} x1="0.2" y1="0.05" x2="0.75" y2="1">
          <stop offset="0%" stopColor={GOLD} />
          <stop offset="42%" stopColor={AMBER} />
          <stop offset="78%" stopColor={EMBER} />
          <stop offset="100%" stopColor={EMBER_DEEP} />
        </linearGradient>
      </defs>

      {/* Soft ember glow ground */}
      <ellipse cx="28" cy="38" rx="24" ry="26" fill={`url(#mk-glow-${id})`} />

      {/* Graceful teardrop-flame with an inner curl — one continuous sweep */}
      <path
        d="M31 3
           C 39 15, 47 25, 44 40
           C 41.5 52.5, 30 60, 19.5 55.5
           C 11 51.8, 8.5 41.5, 14.5 35.5
           C 19.5 30.5, 27 32, 27.5 39.5
           C 30.5 37, 31 30.5, 26.5 26
           C 34.5 21, 33.5 12, 31 3 Z"
        fill={`url(#mk-body-${id})`}
      />
      {/* Single refined white-gold highlight along the outer curve */}
      <path
        d="M33 9 C 39 18, 43.5 26, 41.5 36"
        stroke={WHITEHOT}
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * The "Arena" wordmark — outlined Fraunces 500 filled with the warm ember
 * gradient. `height` is the rendered cap height in px; width follows the fixed
 * aspect ratio. Fully vector, so it's identical in the app and the PNG export.
 */
export function Wordmark({ height = 20, className }: { height?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={height * WORDMARK_RATIO}
      height={height}
      viewBox={`0 0 ${WORDMARK_VB_W} ${WORDMARK_VB_H}`}
      fill="none"
      role="img"
      aria-label={BRAND_NAME}
      className={className}
    >
      <defs>
        <linearGradient id={`wm-${id}`} x1="0" y1="0.12" x2="1" y2="0.9">
          <stop offset="0%" stopColor={EMBER_DEEP} />
          <stop offset="38%" stopColor={EMBER} />
          <stop offset="70%" stopColor={AMBER} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <path d={ARENA_PATH} fill={`url(#wm-${id})`} />
    </svg>
  );
}

export function Logo({ variant = 'full', size, className }: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={className} aria-label={BRAND_NAME}>
        <CurlMark size={size} />
      </span>
    );
  }

  // Full lockup — curl mark + Fraunces wordmark, warm ember. `size` sets the
  // mark height; the wordmark cap height and gap scale off it.
  const markH = size ?? 30;
  const markSize = (markH * 56) / 66;
  const wordH = markH * 0.5;
  return (
    <span
      className={`inline-flex items-center ${className ?? ''}`}
      style={{ gap: markH * 0.24 }}
      aria-label={BRAND_NAME}
    >
      <CurlMark size={markSize} />
      <Wordmark height={wordH} />
    </span>
  );
}
