import { useCallback, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { EMBER } from '@/lib/ember';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ShareCard,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShareCardStat,
  type ShareCardVariant,
  type ShareCardOutcome,
} from './ShareCard';

export interface ShareCardData {
  variant: ShareCardVariant;
  outcome?: ShareCardOutcome;
  eyebrow: string;
  kicker?: string;
  headline: string;
  subhead?: string;
  badge?: string;
  stats?: ShareCardStat[];
  accent?: string;
  cta?: string;
}

interface ShareButtonProps {
  card: ShareCardData;
  /** Web-Share text + fallback clipboard payload. */
  shareText: string;
  /** Optional link that drives new players in (async challenge link). */
  shareUrl?: string;
  /** Export filename stem. */
  fileName?: string;
  /** Show a scaled on-screen preview of the card above the button. */
  preview?: boolean;
  label?: string;
  className?: string;
}

async function blobFromNode(node: HTMLElement): Promise<Blob> {
  // Render at native card resolution; pixelRatio 1 because the node is already
  // full-size. cacheBust avoids stale font/image snapshots between exports.
  const dataUrl = await toPng(node, {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: EMBER.base,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

// A share control that turns the branded <ShareCard> into a PNG and shares it.
// Uses navigator.share with a File when supported; otherwise downloads the PNG
// and copies the challenge link to the clipboard (sonner feedback throughout).
export function ShareButton({
  card,
  shareText,
  shareUrl,
  fileName = 'arena-result',
  preview = false,
  label = 'Share result',
  className,
}: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const blob = await blobFromNode(cardRef.current);
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      // Preferred path — native share sheet with the image as a File.
      const shareData: ShareData = {
        title: 'Arena',
        text: shareText,
        ...(shareUrl ? { url: shareUrl } : {}),
        files: [file],
      };
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] }) &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share(shareData);
        return;
      }

      // Fallback — download the PNG so the user can post it manually, and copy
      // the challenge link (if any) so the share still drives new players in.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (shareUrl) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Card saved · challenge link copied');
        } catch {
          toast.success('Card saved to your device');
        }
      } else {
        toast.success('Card saved to your device');
      }
    } catch (err) {
      // AbortError = user dismissed the native share sheet; not an error.
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error('Could not create share image');
    } finally {
      setBusy(false);
    }
  }, [busy, fileName, shareText, shareUrl]);

  return (
    <>
      {/* On-screen preview (optional) — visually scaled 4:5 card */}
      {preview && (
        <div
          className="clip-card mx-auto overflow-hidden"
          style={{
            width: '100%',
            maxWidth: 300,
            aspectRatio: `${SHARE_CARD_WIDTH} / ${SHARE_CARD_HEIGHT}`,
            boxShadow: 'inset 0 0 0 1px rgba(232,137,59,0.10)',
          }}
        >
          <div
            style={{
              width: SHARE_CARD_WIDTH,
              height: SHARE_CARD_HEIGHT,
              transform: `scale(${300 / SHARE_CARD_WIDTH})`,
              transformOrigin: 'top left',
            }}
          >
            <ShareCard {...card} />
          </div>
        </div>
      )}

      {/* Off-screen full-resolution render — the export source. Kept in the DOM
          (not display:none) so html-to-image can measure and paint it. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          opacity: 0,
          zIndex: -1,
        }}
      >
        <ShareCard ref={cardRef} {...card} />
      </div>

      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={busy}
        className={
          className ??
          'clip-card flex h-14 w-full items-center justify-center gap-2 font-display text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60'
        }
        style={
          className
            ? undefined
            : { background: 'linear-gradient(150deg, #E8893B, #C2541E)' }
        }
      >
        {busy ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <Share2 size={18} /> {label}
          </>
        )}
      </button>
    </>
  );
}
