import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Flag, Share2, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportQuestionPicker } from '@/components/common/ReportQuestionPicker';
import { ProgressionReveal } from '@/components/common/ProgressionReveal';
import { useSessionQuestions } from '@/hooks/use-game-session';
import { Particles } from '@/components/common/Particles';
import type { GameQuestion } from '@/types/game.types';
import type { ProgressionData } from '@/types/duel.types';

export function GameResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetGame } = useGameStore();

  const {
    finalScore, totalAnswered, totalQuestions, correctCount, isFlagged,
    myProgression,
  }: {
    finalScore?: number; totalAnswered?: number; totalQuestions?: number;
    correctCount?: number; isFlagged?: boolean; myProgression?: ProgressionData;
  } = location.state ?? {};

  const { data: sessionQuestions } = useSessionQuestions(sessionId);

  const [reportListOpen, setReportListOpen] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<GameQuestion | null>(null);

  const handleShare = async () => {
    const text = `I scored ${finalScore ?? 0} points in Arena! Can you beat me?`;
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
    <div className="relative flex flex-col min-h-svh items-center justify-center bg-arena-bg px-4 gap-6">
      <Particles />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xs animate-slide-up">
        <div className="text-center space-y-2">
          <p className="font-display text-5xl font-bold text-arena-text-primary">
            {finalScore ?? 0}
          </p>
          <p className="text-arena-text-tertiary text-sm">points scored</p>
        </div>

        {myProgression && <ProgressionReveal data={myProgression} />}

        <div className="w-full rounded-2xl bg-arena-surface border border-arena-border p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Questions answered</span>
            <span className="text-white font-semibold">{totalAnswered} / {totalQuestions}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-white/50">Accuracy</span>
            <span className="text-white font-semibold">{accuracy}%</span>
          </div>

          {isFlagged && (
            <div className="rounded-xl bg-arena-red/10 border border-arena-red/30 p-3">
              <p className="text-arena-red text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Your session was flagged for review. Results may be adjusted.
              </p>
            </div>
          )}
        </div>

        <div className="w-full space-y-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full h-11 border-arena-border text-white/60 hover:text-white hover:bg-white/5 gap-2 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share result
          </Button>

          <Button
            onClick={handleBack}
            className="w-full h-11 bg-arena-purple hover:bg-arena-purple-bright text-white font-semibold transition-colors"
          >
            Back to lobby
          </Button>

          {sessionQuestions && sessionQuestions.length > 0 && (
            <button
              onClick={() => setReportListOpen(true)}
              className="w-full text-center text-sm text-white/30 hover:text-white/60 transition-colors py-1"
            >
              Had an issue with a question?
            </button>
          )}
        </div>
      </div>

      {/* Question list dialog */}
      <Dialog open={reportListOpen} onOpenChange={(open) => { if (!open) setReportListOpen(false); }}>
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-display">Report a question</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto -mx-1 px-1">
            {sessionQuestions?.map((q) => (
              <div
                key={q.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-arena-border bg-arena-bg px-3 py-2.5"
              >
                <p className="text-sm text-white/70 leading-snug flex-1">{q.content}</p>
                <button
                  onClick={() => setReportingQuestion(q)}
                  className="shrink-0 text-white/30 hover:text-arena-purple-bright transition-colors mt-0.5"
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
            <DialogTitle className="text-white text-base font-display">What's the issue?</DialogTitle>
          </DialogHeader>
          <p className="text-white/40 text-xs leading-snug line-clamp-2">
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
