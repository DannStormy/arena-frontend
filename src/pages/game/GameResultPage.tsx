import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportQuestionPicker } from '@/components/common/ReportQuestionPicker';
import { useSessionQuestions } from '@/hooks/use-game-session';
import type { GameQuestion } from '@/types/game.types';

export function GameResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetGame } = useGameStore();

  const { finalScore, totalAnswered, totalQuestions, correctCount, isFlagged } = location.state ?? {};

  const { data: sessionQuestions } = useSessionQuestions(sessionId);

  const [reportListOpen, setReportListOpen] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<GameQuestion | null>(null);

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

        {sessionQuestions && sessionQuestions.length > 0 && (
          <button
            onClick={() => setReportListOpen(true)}
            className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors py-1"
          >
            Had an issue with a question?
          </button>
        )}
      </div>

      {/* Question list dialog */}
      <Dialog open={reportListOpen} onOpenChange={(open) => { if (!open) setReportListOpen(false); }}>
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Report a question</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto -mx-1 px-1">
            {sessionQuestions?.map((q) => (
              <div
                key={q.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-arena-border bg-arena-bg px-3 py-2.5"
              >
                <p className="text-sm text-white/80 leading-snug flex-1">{q.content}</p>
                <button
                  onClick={() => setReportingQuestion(q)}
                  className="shrink-0 text-white/30 hover:text-arena-gold transition-colors mt-0.5"
                  title="Report this question"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reason picker dialog */}
      <Dialog
        open={!!reportingQuestion}
        onOpenChange={(open) => { if (!open) setReportingQuestion(null); }}
      >
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white text-base">What's the issue?</DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-xs leading-snug line-clamp-2">
            {reportingQuestion?.content}
          </p>
          {reportingQuestion && (
            <ReportQuestionPicker
              questionId={reportingQuestion.id}
              onClose={() => {
                setReportingQuestion(null);
                setReportListOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
