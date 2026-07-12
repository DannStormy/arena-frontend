import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Trash2, Download, Upload, X, Pencil, Power } from 'lucide-react';
import {
  useAdminQuestions,
  useAdminReportedQuestions,
  useUpdateQuestion,
  useDeleteQuestion,
  useBulkUploadQuestions,
  type AdminQuestion,
} from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const CATEGORIES = ['', 'naija_street_smarts', 'sports_arena', 'entertainment_zone', 'brain_box', 'faith_and_values', 'tech_and_hustle'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const CSV_HEADERS = 'content,option_a,option_b,option_c,option_d,correct_answer,category,difficulty';
const CSV_EXAMPLE = 'What is the capital of Nigeria?,Lagos,Abuja,Kano,Ibadan,1,naija_street_smarts,easy';

// ── Upload types ──────────────────────────────────────────────────────────────

interface ParsedQuestion {
  content: string;
  options: [string, string, string, string];
  correctAnswer: number;
  category: string;
  arena: string;
  difficulty: string;
}

interface ValidationError {
  row: number;
  reason: string;
}

function validateRows(rows: Record<string, unknown>[]): {
  valid: ParsedQuestion[];
  errors: ValidationError[];
} {
  const valid: ParsedQuestion[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const missing: string[] = [];

    if (!row.content) missing.push('content');
    if (!row.option_a) missing.push('option_a');
    if (!row.option_b) missing.push('option_b');
    if (!row.option_c) missing.push('option_c');
    if (!row.option_d) missing.push('option_d');
    if (row.correct_answer === undefined || row.correct_answer === '') missing.push('correct_answer');
    if (!row.category) missing.push('category');

    if (missing.length > 0) {
      errors.push({ row: rowNum, reason: `Missing: ${missing.join(', ')}` });
      return;
    }

    const correctAnswer = Number(row.correct_answer);
    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
      errors.push({ row: rowNum, reason: `correct_answer must be 0–3 (got ${row.correct_answer})` });
      return;
    }

    const category = String(row.category);
    valid.push({
      content: String(row.content),
      options: [String(row.option_a), String(row.option_b), String(row.option_c), String(row.option_d)],
      correctAnswer,
      category,
      // Arena and category share the same value set (see TournamentArena);
      // the CSV carries one column, which maps directly to both.
      arena: category,
      difficulty: row.difficulty ? String(row.difficulty) : 'medium',
    });
  });

  return { valid, errors };
}

// ── Edit form state ───────────────────────────────────────────────────────────

interface EditForm {
  content: string;
  options: [string, string, string, string];
  correctAnswer: number;
  difficulty: string;
}

const EMPTY_EDIT: EditForm = { content: '', options: ['', '', '', ''], correctAnswer: 0, difficulty: 'medium' };

// ── Component ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  wrong_answer: 'Wrong answer',
  outdated: 'Outdated',
  unclear: 'Unclear',
};

export function AdminQuestionsPage() {
  const [tab, setTab] = useState<'questions' | 'reports'>('questions');
  const [category, setCategory] = useState('');
  const { data: questions, isLoading, error } = useAdminQuestions(category || undefined);
  const { data: reportedQuestions, isLoading: reportsLoading } = useAdminReportedQuestions();
  const updateMutation = useUpdateQuestion();
  const deleteMutation = useDeleteQuestion();
  const bulkMutation = useBulkUploadQuestions();

  // ── Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedQuestion[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fileName, setFileName] = useState('');

  // ── Edit dialog state
  const [editQuestion, setEditQuestion] = useState<AdminQuestion | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);

  // ── Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);

  // ── Upload handlers ──────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const blob = new Blob([`${CSV_HEADERS}\n${CSV_EXAMPLE}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview([]);
    setValidationErrors([]);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setValidationErrors([{ row: 0, reason: 'File is empty or has no data rows.' }]);
          return;
        }
        const { valid, errors } = validateRows(results.data);
        setValidationErrors(errors);
        setPreview(valid);
      },
    });

    e.target.value = '';
  };

  const handleUpload = () => {
    if (preview.length === 0) return;
    bulkMutation.mutate(preview, {
      onSuccess: (result: { created: number; skipped: number }) => {
        setPreview([]);
        setFileName('');
        setValidationErrors([]);
        toast.success(`Uploaded ${result.created} questions${result.skipped > 0 ? `, ${result.skipped} already existed` : ''}`);
      },
    });
  };

  // ── Edit handlers ────────────────────────────────────────────────────────────

  const openEdit = (q: AdminQuestion) => {
    setEditQuestion(q);
    setEditForm({
      content: q.content,
      options: [q.options[0] ?? '', q.options[1] ?? '', q.options[2] ?? '', q.options[3] ?? ''],
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty ?? 'medium',
    });
  };

  const handleEditSave = () => {
    if (!editQuestion) return;
    updateMutation.mutate(
      {
        id: editQuestion.id,
        content: editForm.content,
        options: editForm.options,
        correctAnswer: editForm.correctAnswer,
        difficulty: editForm.difficulty,
      },
      {
        onSuccess: () => {
          toast.success('Question updated');
          setEditQuestion(null);
        },
      },
    );
  };

  const setOption = (i: number, value: string) =>
    setEditForm((f) => {
      const options = [...f.options] as [string, string, string, string];
      options[i] = value;
      return { ...f, options };
    });

  // ── Toggle active ────────────────────────────────────────────────────────────

  const toggleActive = (q: AdminQuestion) => {
    updateMutation.mutate(
      { id: q.id, isActive: !q.isActive },
      {
        onSuccess: () => toast.success(q.isActive ? 'Question deactivated' : 'Question activated'),
      },
    );
  };

  // ── Delete handlers ──────────────────────────────────────────────────────────

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  };

  const selectStyle =
    'h-9 rounded-lg border border-arena-border bg-arena-bg px-2.5 text-sm text-white outline-none focus:border-white/40 appearance-none';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Questions</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {tab === 'questions' ? `${questions?.length ?? 0} shown` : `${reportedQuestions?.length ?? 0} reported`}
          </p>
        </div>
        <div className="flex rounded-lg border border-arena-border overflow-hidden text-sm">
          {(['questions', 'reports'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 transition-colors capitalize',
                tab === t ? 'bg-arena-gold text-black font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5',
              )}
            >
              {t}
              {t === 'reports' && (reportedQuestions?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-arena-red/80 text-white text-xs px-1.5 py-0.5">
                  {reportedQuestions!.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reports tab ──────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reportsLoading && <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>}
          {!reportsLoading && (!reportedQuestions || reportedQuestions.length === 0) && (
            <p className="text-white/40 text-sm text-center py-10">No reported questions.</p>
          )}
          {reportedQuestions && reportedQuestions.length > 0 && (
            <div className="rounded-xl border border-arena-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-arena-border bg-arena-surface">
                    <th className="text-left text-white/50 font-medium px-4 py-3">Question</th>
                    <th className="text-left text-white/50 font-medium px-4 py-3">Reports</th>
                    <th className="text-left text-white/50 font-medium px-4 py-3">Reasons</th>
                    <th className="text-right text-white/50 font-medium px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedQuestions.map((q) => (
                    <tr
                      key={q.id}
                      className={cn(
                        'border-b border-arena-border/50 last:border-0',
                        q.isActive === false && 'opacity-40',
                      )}
                    >
                      <td className="px-4 py-3 text-white max-w-xs">
                        <p className="truncate">{q.content}</p>
                        <p className="text-white/40 text-xs capitalize mt-0.5">{q.category.replace(/_/g, ' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-arena-red/10 border border-arena-red/30 text-arena-red text-xs font-semibold px-2 py-0.5">
                          {q.reportCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {q.reports.map(({ reason, count }) => (
                            <span
                              key={reason}
                              className="rounded-full bg-white/5 border border-arena-border text-white/60 text-xs px-2 py-0.5"
                            >
                              {REASON_LABELS[reason] ?? reason} ({count})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            updateMutation.mutate(
                              { id: q.id, isActive: false },
                              { onSuccess: () => toast.success('Question deactivated') },
                            )
                          }
                          disabled={q.isActive === false || updateMutation.isPending}
                          className={cn(
                            'transition-colors text-xs font-medium disabled:opacity-30',
                            q.isActive === false ? 'text-white/30 cursor-default' : 'text-arena-red/70 hover:text-arena-red',
                          )}
                        >
                          {q.isActive === false ? 'Inactive' : 'Deactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && <>
      {/* ── Upload section ───────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-arena-surface border border-arena-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white font-medium text-sm">Bulk upload</p>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="border-arena-border text-white/60 hover:text-white hover:bg-white/5 gap-1.5 h-8 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download template
          </Button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-arena-border hover:border-white/30 bg-arena-bg py-8 cursor-pointer transition-colors"
        >
          <Upload className="h-6 w-6 text-white/30" />
          <p className="text-white/50 text-sm">
            {fileName ? (
              <span className="text-white">{fileName}</span>
            ) : (
              <>Click to select a <span className="text-arena-gold">.csv</span> file</>
            )}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {validationErrors.length > 0 && (
          <div className="rounded-lg bg-arena-red/10 border border-arena-red/30 p-3 space-y-1">
            <p className="text-arena-red text-xs font-medium">
              {validationErrors.length} row{validationErrors.length !== 1 ? 's' : ''} failed validation
              {preview.length > 0 && ` — ${preview.length} valid row${preview.length !== 1 ? 's' : ''} will still be uploaded`}
            </p>
            <ul className="space-y-0.5">
              {validationErrors.map((e) => (
                <li key={e.row} className="text-arena-red/80 text-xs">Row {e.row}: {e.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white/60 text-xs">{preview.length} question{preview.length !== 1 ? 's' : ''} ready to upload</p>
              <button onClick={() => { setPreview([]); setFileName(''); setValidationErrors([]); }} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg border border-arena-border overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-arena-surface border-b border-arena-border">
                    <th className="text-left text-white/50 font-medium px-3 py-2">#</th>
                    <th className="text-left text-white/50 font-medium px-3 py-2">Question</th>
                    <th className="text-left text-white/50 font-medium px-3 py-2">Category</th>
                    <th className="text-left text-white/50 font-medium px-3 py-2">Difficulty</th>
                    <th className="text-left text-white/50 font-medium px-3 py-2">Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((q, i) => (
                    <tr key={i} className="border-b border-arena-border/40 last:border-0">
                      <td className="px-3 py-2 text-white/30">{i + 1}</td>
                      <td className="px-3 py-2 text-white max-w-xs"><p className="truncate">{q.content}</p></td>
                      <td className="px-3 py-2 text-white/60">{q.category}</td>
                      <td className="px-3 py-2 text-white/60 capitalize">{q.difficulty}</td>
                      <td className="px-3 py-2 text-arena-gold font-medium">{OPTION_LETTERS[q.correctAnswer]}: {q.options[q.correctAnswer]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              onClick={handleUpload}
              disabled={bulkMutation.isPending}
              className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              {bulkMutation.isPending ? 'Uploading…' : `Upload ${preview.length} question${preview.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>

      {/* ── Filter + questions table ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-white/50 text-sm">Category</label>
          <select className={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === '' ? 'All' : c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {isLoading && <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>}
        {error && <ErrorMessage message="Failed to load questions." />}
        {questions && questions.length === 0 && (
          <p className="text-white/40 text-sm text-center py-10">No questions found.</p>
        )}

        {questions && questions.length > 0 && (
          <div className="rounded-xl border border-arena-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-arena-border bg-arena-surface">
                  <th className="text-left text-white/50 font-medium px-4 py-3">Question</th>
                  <th className="text-left text-white/50 font-medium px-4 py-3">Category</th>
                  <th className="text-left text-white/50 font-medium px-4 py-3">Difficulty</th>
                  <th className="text-right text-white/50 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr
                    key={q.id}
                    className={cn(
                      'border-b border-arena-border/50 last:border-0 transition-opacity',
                      q.isActive === false && 'opacity-40',
                    )}
                  >
                    <td className="px-4 py-3 text-white max-w-xs">
                      <p className="truncate">{q.content}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60 capitalize">{q.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-white/60 capitalize">{q.difficulty ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          title="Edit"
                          onClick={() => openEdit(q)}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title={q.isActive === false ? 'Activate' : 'Deactivate'}
                          onClick={() => toggleActive(q)}
                          disabled={updateMutation.isPending}
                          className={cn(
                            'transition-colors disabled:opacity-30',
                            q.isActive === false
                              ? 'text-green-400/60 hover:text-green-400'
                              : 'text-white/40 hover:text-white/80',
                          )}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setDeleteTarget(q)}
                          className="text-arena-red/50 hover:text-arena-red transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </> /* end tab === 'questions' */}

      {/* ── Edit dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={!!editQuestion} onOpenChange={(open) => { if (!open) setEditQuestion(null); }}>
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit question</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Question text</label>
              <Input
                value={editForm.content}
                onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                className="bg-arena-bg border-arena-border text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/50 block">Options</label>
              {OPTION_LETTERS.map((letter, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-white/40 text-xs w-4 shrink-0">{letter}</span>
                  <Input
                    value={editForm.options[i]}
                    onChange={(e) => setOption(i, e.target.value)}
                    className="bg-arena-bg border-arena-border text-white placeholder:text-white/30"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-white/50 mb-2 block">Correct answer</label>
              <div className="space-y-1.5">
                {OPTION_LETTERS.map((letter, i) => (
                  <label
                    key={i}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                      editForm.correctAnswer === i
                        ? 'border-arena-gold bg-arena-gold/10 text-white'
                        : 'border-arena-border text-white/50 hover:border-white/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={editForm.correctAnswer === i}
                      onChange={() => setEditForm((f) => ({ ...f, correctAnswer: i }))}
                      className="accent-arena-gold"
                    />
                    <span className="text-xs font-medium">{letter}.</span>
                    <span className="text-sm truncate">{editForm.options[i] || <em className="opacity-40">empty</em>}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Difficulty</label>
              <select
                value={editForm.difficulty}
                onChange={(e) => setEditForm((f) => ({ ...f, difficulty: e.target.value }))}
                className="h-9 w-full rounded-lg border border-arena-border bg-arena-bg px-2.5 text-sm text-white outline-none focus:border-white/40 appearance-none capitalize"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d} className="capitalize">{d}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="bg-transparent border-0 pt-2 px-0 pb-0">
            <Button
              variant="outline"
              className="border-arena-border text-white/70 hover:bg-white/5"
              onClick={() => setEditQuestion(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editForm.content.trim() || updateMutation.isPending}
              className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete question?</DialogTitle>
          </DialogHeader>

          <p className="text-white/60 text-sm leading-relaxed">
            This will permanently remove:
          </p>
          <p className="text-white text-sm font-medium truncate border border-arena-border rounded-lg px-3 py-2 bg-arena-bg">
            {deleteTarget?.content}
          </p>

          <DialogFooter className="bg-transparent border-0 pt-2 px-0 pb-0">
            <Button
              variant="outline"
              className="border-arena-border text-white/70 hover:bg-white/5"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-arena-red hover:bg-arena-red/90 text-white font-semibold"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
