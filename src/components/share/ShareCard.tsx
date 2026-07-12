import { forwardRef } from 'react';
import { EMBER } from '@/lib/ember';
import { BRAND_NAME } from '@/components/common/Logo';

// ── Card geometry ────────────────────────────────────────────────────────────
// Fixed 1080×1350 (4:5) — the standard portrait share ratio for TikTok /
// WhatsApp status / IG. Rendered at full pixel size off-screen for crisp export,
// then visually scaled down for the on-screen preview by the caller.
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

export type ShareCardVariant = 'speed_math' | 'duel';

export interface ShareCardStat {
  label: string;
  value: string;
}

interface ShareCardProps {
  variant: ShareCardVariant;
  /** Small uppercase eyebrow — e.g. "Speed Math" or "Duel". */
  eyebrow: string;
  /** The hero line — big score or "You win". */
  headline: string;
  /** Optional secondary line under the headline. */
  subhead?: string;
  /** Up to three stat tiles along the bottom. */
  stats?: ShareCardStat[];
  /** Ember accent for the headline + glow (defaults to accentBright). */
  accent?: string;
  /** Optional call-to-action shown near the wordmark (e.g. a challenge code). */
  cta?: string;
}

// A branded, screenshot-friendly result card. Uses only inline styles + solid
// colors so html-to-image serialization stays deterministic (no CSS vars, no
// external fonts beyond the app's already-loaded display face).
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { eyebrow, headline, subhead, stats = [], accent = EMBER.accentBright, cta },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(120% 80% at 50% 0%, #1C1610 0%, ${EMBER.base} 62%)`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Chakra Petch', system-ui, sans-serif",
        color: EMBER.textPrimary,
      }}
    >
      {/* Ember glow bloom behind the headline */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}22 0%, transparent 62%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Top rail — brand wordmark so every repost advertises the app */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '64px 72px 0',
          zIndex: 1,
        }}
      >
        <svg width={52} height={52} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2L3 6v6c0 5.25 3.75 9.65 9 11.15C17.25 21.65 21 17.25 21 12V6L12 2z"
            fill={EMBER.accent}
          />
          <path
            d="M9 12l2 2 4-4"
            stroke={EMBER.base}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.01em', color: EMBER.accent }}
        >
          {BRAND_NAME}
        </span>
      </div>

      {/* Center block — eyebrow + headline + subhead */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 72px',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: EMBER.textTertiary,
            margin: 0,
          }}
        >
          {eyebrow}
        </p>
        <p
          style={{
            fontSize: 168,
            lineHeight: 1,
            fontWeight: 700,
            color: accent,
            margin: '28px 0 0',
            textShadow: `0 0 48px ${accent}55`,
          }}
        >
          {headline}
        </p>
        {subhead && (
          <p
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: EMBER.textSecondary,
              margin: '28px 0 0',
            }}
          >
            {subhead}
          </p>
        )}
      </div>

      {/* Stat tiles */}
      {stats.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 24,
            padding: '0 72px',
            zIndex: 1,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: EMBER.surface,
                boxShadow: `inset 0 0 0 2px ${EMBER.hairline}`,
                clipPath:
                  'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
                padding: '34px 24px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 62,
                  fontWeight: 700,
                  color: EMBER.textPrimary,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 26,
                  color: EMBER.textTertiary,
                  margin: '16px 0 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom rail — CTA / handle */}
      <div
        style={{
          padding: '48px 72px 64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: 30, fontWeight: 600, color: EMBER.textSecondary }}>
          {cta ?? 'Think you can beat me?'}
        </span>
        <span
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: EMBER.textTertiary,
          }}
        >
          play.arena
        </span>
      </div>
    </div>
  );
});
