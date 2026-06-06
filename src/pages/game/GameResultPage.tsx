import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '@/stores/game.store';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

export function GameResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetGame } = useGameStore();

  const { finalScore, totalAnswered, totalQuestions, correctCount, isFlagged } = location.state ?? {};

  const handleShare = async () => {
    const text = `I scored ${finalScore ?? 0} points in Arena! 🎯 Can you beat me?`;

    if (navigator.share) {
      await navigator.share({ text, url: window.location.origin });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleBack = () => {
    resetGame();
    navigate('/');
  };

  const accuracy =
    totalAnswered > 0 ? Math.round(((correctCount ?? 0) / totalAnswered) * 100) : 0;

  return (
    <div className="flex flex-col min-h-svh items-center justify-center bg-arena-bg px-4 gap-6">
      <div className="text-center space-y-2">
        <p className="text-6xl">🎯</p>
        <h1 className="text-3xl font-bold text-white">{finalScore ?? 0}</h1>
        <p className="text-white/50">points scored</p>
      </div>

      <div className="w-full max-w-xs rounded-xl bg-arena-surface border border-arena-border p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Questions answered</span>
          <span className="text-white font-medium">{totalAnswered} / {totalQuestions}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-white/60">Accuracy</span>
          <span className="text-white font-medium">{accuracy}%</span>
        </div>

        {isFlagged && (
          <div className="rounded-lg bg-arena-red/10 border border-arena-red/30 p-3">
            <p className="text-arena-red text-xs font-medium">
              ⚠️ Your session was flagged for review. Results may be adjusted.
            </p>
          </div>
        )}
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Button
          onClick={handleShare}
          variant="outline"
          className="w-full border-arena-border text-white hover:bg-white/10 gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share result
        </Button>

        <Button
          onClick={handleBack}
          className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
        >
          Back to lobby
        </Button>
      </div>
    </div>
  );
}
