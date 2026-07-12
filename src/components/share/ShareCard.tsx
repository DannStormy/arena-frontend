import { forwardRef } from 'react';
import { BRAND_NAME } from '@/components/common/Logo';

// ── Card geometry ────────────────────────────────────────────────────────────
// Fixed 1080×1350 (4:5) — the standard portrait share ratio for TikTok /
// WhatsApp status / IG. Rendered at full pixel size off-screen for crisp export,
// then visually scaled down for the on-screen preview by the caller.
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

export type ShareCardVariant = 'speed_math' | 'duel';
export type ShareCardOutcome = 'solo' | 'win' | 'loss' | 'draw';

export interface ShareCardStat {
  label: string;
  value: string;
}

interface ShareCardProps {
  variant: ShareCardVariant;
  /** Drives the default accent + energy tone (win/solo = gold, loss = ember). */
  outcome?: ShareCardOutcome;
  /** Small uppercase tag chip — e.g. "Speed Math" or "Brain Duel". */
  eyebrow: string;
  /** Confident line above the hero — e.g. "I banked" / "I beat @rival". */
  kicker?: string;
  /** The hero flex — big score or "4,340–3,472" scoreline. */
  headline: string;
  /** Optional small line under the hero — e.g. "points banked". */
  subhead?: string;
  /** Optional outcome pill under the hero — e.g. "Victory" / "Got clipped". */
  badge?: string;
  /** Up to three stat tiles above the challenge hook. */
  stats?: ShareCardStat[];
  /** Hero + ray-burst color. Defaults by outcome (gold, or ember for loss). */
  accent?: string;
  /** The viral call-to-action pill near the bottom. */
  cta?: string;
}

// ── Palette (inline, deterministic for html-to-image) ────────────────────────
const GOLD = '#FFD23F'; // §2 win / flex
const EMBER_HOT = '#FBA94C'; // §2 ember-400 (loss + hot-gradient start)
const HOT_PINK = '#FF3D8B'; // §2 hot-gradient end (energy accent only)
const INK = '#0B0A0D'; // deepest warm base
const TEXT = '#F7EFE2'; // warm white
const TEXT_DIM = '#B9AC99'; // warm mid

function accentForOutcome(o: ShareCardOutcome): string {
  return o === 'loss' ? EMBER_HOT : GOLD;
}

// A deterministic sunburst behind the hero — inline SVG wedges (no conic-gradient,
// no gradient-text) so html-to-image serialization is bulletproof.
function RayBurst({ color }: { color: string }) {
  const cx = 500;
  const cy = 500;
  const r = 760;
  const wedges = 24;
  const step = 360 / wedges;
  const paths: string[] = [];
  for (let i = 0; i < wedges; i += 2) {
    const a0 = ((i * step - step * 0.4) * Math.PI) / 180;
    const a1 = ((i * step + step * 0.4) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    paths.push(`M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} Z`);
  }
  return (
    <svg
      width={1080}
      height={1080}
      viewBox="0 0 1000 1000"
      style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: 0.16,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill={color} />
      ))}
    </svg>
  );
}

// A scatter of fixed stars — hardcoded so every export is identical.
const STARS: Array<[number, number, number, number]> = [
  // x%, y%, size, opacity
  [8, 12, 4, 0.5],
  [22, 26, 3, 0.35],
  [15, 62, 5, 0.4],
  [10, 84, 3, 0.3],
  [30, 90, 4, 0.35],
  [46, 15, 3, 0.3],
  [58, 30, 4, 0.4],
  [72, 20, 5, 0.45],
  [88, 14, 3, 0.35],
  [92, 40, 4, 0.4],
  [84, 66, 5, 0.4],
  [90, 86, 3, 0.3],
  [68, 92, 4, 0.35],
  [52, 80, 3, 0.3],
  [78, 48, 3, 0.3],
  [34, 46, 3, 0.28],
];

// A branded, screenshot-first arcade flex card. Inline styles + solid colors and
// CSS gradients only (no CSS vars, no gradient-text, no external fonts beyond the
// already-loaded 'Chakra Petch') so html-to-image stays deterministic.
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { outcome = 'solo', eyebrow, kicker, headline, subhead, badge, stats = [], accent, cta },
  ref,
) {
  const hero = accent ?? accentForOutcome(outcome);
  // Auto-size the hero so single scores fill the card while long scorelines fit.
  const heroSize = headline.length <= 6 ? 210 : headline.length <= 9 ? 158 : 124;

  return (
    <div
      ref={ref}
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        // Louder base — warm charcoal core over near-black, less dead space.
        background: `radial-gradient(115% 75% at 50% 42%, #241A12 0%, #150F0C 46%, ${INK} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Chakra Petch', system-ui, sans-serif",
        color: TEXT,
      }}
    >
      {/* ── Energy layers ─────────────────────────────────────────────────── */}
      <RayBurst color={hero} />

      {/* Bold diagonal streak slashing behind the hero */}
      <div
        style={{
          position: 'absolute',
          top: 470,
          left: -120,
          width: 1320,
          height: 260,
          transform: 'rotate(-13deg)',
          background: `linear-gradient(90deg, transparent 0%, ${hero}22 22%, ${hero}44 50%, ${hero}22 78%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Hot glow bloom directly behind the hero number */}
      <div
        style={{
          position: 'absolute',
          top: 360,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 820,
          height: 560,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hero}33 0%, ${HOT_PINK}14 40%, transparent 68%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Starfield */}
      {STARS.map(([x, y, s, o], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: s,
            height: s,
            borderRadius: '50%',
            background: hero,
            opacity: o,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Vignette to seat the edges and push focus to center */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Top rail — wordmark (always visible) + mode tag ─────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 72px 0',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width={58} height={58} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2L3 6v6c0 5.25 3.75 9.65 9 11.15C17.25 21.65 21 17.25 21 12V6L12 2z"
              fill="#F0872E"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke={INK}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 50,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: EMBER_HOT,
              textTransform: 'uppercase',
            }}
          >
            {BRAND_NAME}
          </span>
        </div>

        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TEXT,
            background: 'rgba(255,255,255,0.08)',
            boxShadow: `inset 0 0 0 2px ${hero}66`,
            padding: '14px 26px',
            clipPath:
              'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
          }}
        >
          {eyebrow}
        </span>
      </div>

      {/* ── Hero zone — the one massive flex ────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {kicker && (
          <p
            style={{
              fontSize: 46,
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: TEXT,
              margin: '0 0 8px',
            }}
          >
            {kicker}
          </p>
        )}

        <p
          style={{
            fontSize: heroSize,
            lineHeight: 0.92,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            color: hero,
            margin: 0,
            textShadow: `0 0 8px ${hero}66, 0 0 60px ${hero}55, 0 6px 0 rgba(0,0,0,0.35)`,
          }}
        >
          {headline}
        </p>

        {badge && (
          <span
            style={{
              marginTop: 26,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: INK,
              background: hero,
              padding: '12px 34px',
              clipPath:
                'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
            }}
          >
            {badge}
          </span>
        )}

        {subhead && (
          <p
            style={{
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TEXT_DIM,
              margin: '22px 0 0',
            }}
          >
            {subhead}
          </p>
        )}
      </div>

      {/* ── Stat tiles ──────────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 22, padding: '0 72px', zIndex: 1 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                boxShadow: `inset 0 0 0 2px ${hero}3A`,
                clipPath:
                  'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
                padding: '30px 20px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 66,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: TEXT,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: TEXT_DIM,
                  margin: '14px 0 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Challenge hook — the loud, confident CTA pill ───────────────────── */}
      <div style={{ padding: '40px 72px 0', zIndex: 1 }}>
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '0.01em',
            color: INK,
            background: `linear-gradient(90deg, ${EMBER_HOT} 0%, ${HOT_PINK} 100%)`,
            padding: '26px 28px',
            clipPath:
              'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))',
            boxShadow: `0 0 44px ${HOT_PINK}44`,
          }}
        >
          {cta ?? 'Beat that.'}
        </div>
      </div>

      {/* ── Bottom rail — handle ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '28px 72px 52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: TEXT_DIM,
          }}
        >
          play.arena
        </span>
      </div>
    </div>
  );
});
