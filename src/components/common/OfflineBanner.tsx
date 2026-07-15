import { EMBER } from '@/lib/ember';
import { useOnline } from '@/hooks/use-online';

/**
 * Subtle connectivity notice. Renders nothing while online. When offline it
 * reassures that the no-network modes still play. Plain copy, ember palette,
 * no emoji.
 *
 *  • default  — a slim inline bar (flows at the top of a scrollable screen).
 *  • floating — a compact fixed pill (for immersive full-screen game screens).
 */
export function OfflineBanner({ floating = false }: { floating?: boolean }) {
  const online = useOnline();
  if (online) return null;

  const dot = (
    <span
      aria-hidden
      style={{ width: 6, height: 6, borderRadius: 9999, background: EMBER.accent, flexShrink: 0 }}
    />
  );

  if (floating) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-3 z-50 -translate-x-1/2 px-3 safe-area-top">
        <span
          className="clip-chip-sm inline-flex items-center gap-2 whitespace-nowrap font-medium"
          style={{
            fontSize: 11,
            padding: '6px 12px',
            color: EMBER.textSecondary,
            background: EMBER.surfaceRaised,
            boxShadow: `inset 0 0 0 1px ${EMBER.hairline}`,
          }}
        >
          {dot}
          Offline — Speed Math &amp; Memory still work
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
      style={{
        color: EMBER.textSecondary,
        background: EMBER.surfaceRaised,
        boxShadow: `inset 0 -1px 0 ${EMBER.hairline}`,
      }}
    >
      {dot}
      Offline — Speed Math &amp; Memory still work
    </div>
  );
}
