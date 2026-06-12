import { useReportQuestion, type ReportReason } from '@/hooks/use-game-session';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'wrong_answer', label: 'Wrong answer' },
  { value: 'outdated', label: 'Outdated' },
  { value: 'unclear', label: 'Unclear' },
];

interface Props {
  questionId: string;
  onClose: () => void;
}

export function ReportQuestionPicker({ questionId, onClose }: Props) {
  const report = useReportQuestion();

  const handleSelect = (reason: ReportReason) => {
    report.mutate({ questionId, reason }, { onSuccess: () => onClose() });
  };

  return (
    <div className="flex flex-col gap-0.5">
      {REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          disabled={report.isPending}
          className="w-full text-left text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
