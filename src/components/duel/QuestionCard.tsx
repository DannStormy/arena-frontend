// QuestionCard — presents the question text with appropriate weight and breathing room.
// Tinted with the mode accent to visually anchor which game is being played.
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  content: string;
  modeAccent: string;
  className?: string;
}

export function QuestionCard({ content, modeAccent, className }: QuestionCardProps) {
  return (
    <div
      className={cn('rounded-2xl border px-5 py-6', className)}
      style={{
        background:   `${modeAccent}07`,
        borderColor:  `${modeAccent}20`,
      }}
    >
      <p className="text-white text-xl font-medium leading-relaxed">{content}</p>
    </div>
  );
}
