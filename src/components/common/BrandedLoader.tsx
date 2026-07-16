import { EMBER } from '@/lib/ember';

/**
 * Full-screen branded loader — a calmly breathing ember flame, centered. Used for
 * auth hydration / route boot. Mirrors the pre-React loader in index.html (same
 * mark + breathe), so there's no flash when React takes over.
 */
export function BrandedLoader() {
  return (
    <div
      className="flex h-[100dvh] w-full items-center justify-center"
      style={{ background: EMBER.base }}
    >
      <svg
        className="arena-boot-flame"
        width="72"
        height="85"
        viewBox="0 0 56 66"
        fill="none"
        role="status"
        aria-label="Loading"
      >
        <defs>
          <linearGradient id="brandedFlame" x1="0.2" y1="0.05" x2="0.75" y2="1">
            <stop offset="0%" stopColor="#FFD23F" />
            <stop offset="42%" stopColor="#F0B05A" />
            <stop offset="78%" stopColor="#E8893B" />
            <stop offset="100%" stopColor="#C2541E" />
          </linearGradient>
        </defs>
        <path
          d="M31 3 C 39 15, 47 25, 44 40 C 41.5 52.5, 30 60, 19.5 55.5 C 11 51.8, 8.5 41.5, 14.5 35.5 C 19.5 30.5, 27 32, 27.5 39.5 C 30.5 37, 31 30.5, 26.5 26 C 34.5 21, 33.5 12, 31 3 Z"
          fill="url(#brandedFlame)"
        />
        <path
          d="M33 9 C 39 18, 43.5 26, 41.5 36"
          stroke="#FFF3D8"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
