import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { X, ChevronDown, ChevronRight, AlertCircle, Info } from 'lucide-react';
import {
  useProgressionConfig,
  useProgressionConfigVersions,
  useCreateProgressionConfig,
} from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── Field Metadata ──────────────────────────────────────────────────────────

type FieldGroup =
  | 'Player Level (XP)'
  | 'Tournament XP'
  | 'Duel Rank Points'
  | 'Demotion Shield'
  | 'Tournament Rank'
  | 'Season Reset Points'
  | 'Other';

interface FieldMeta {
  label: string;
  group: FieldGroup;
  hint?: string;
  isNegative?: boolean;
  isPositive?: boolean;
  isDecimal?: boolean;
  is01Range?: boolean;
  type?: 'milestones' | 'seasonReset';
}

const GROUP_ORDER: FieldGroup[] = [
  'Player Level (XP)',
  'Tournament XP',
  'Duel Rank Points',
  'Demotion Shield',
  'Tournament Rank',
  'Season Reset Points',
  'Other',
];

const FIELD_META: Record<string, FieldMeta> = {
  levelBase: { label: 'Level Base XP', group: 'Player Level (XP)' },
  levelGrowth: {
    label: 'Level Growth Factor',
    group: 'Player Level (XP)',
    isDecimal: true,
    hint: 'multiplier per level (e.g. 1.5)',
  },
  maxLevel: { label: 'Max Level', group: 'Player Level (XP)' },
  levelMilestones: { label: 'Level Milestones', group: 'Player Level (XP)', type: 'milestones' },
  firstDuelOfDayBonusXp: { label: 'First Duel of Day Bonus XP', group: 'Player Level (XP)' },
  xpWin: { label: 'XP – Win', group: 'Player Level (XP)', isPositive: true, hint: 'must be positive' },
  xpDraw: { label: 'XP – Draw', group: 'Player Level (XP)' },
  xpLoss: { label: 'XP – Loss', group: 'Player Level (XP)', isNegative: true, hint: 'must be negative' },
  xpForfeitWin: { label: 'XP – Forfeit Win', group: 'Player Level (XP)', isPositive: true, hint: 'must be positive' },
  xpForfeitLoss: { label: 'XP – Forfeit Loss', group: 'Player Level (XP)', isNegative: true, hint: 'must be negative' },
  xpStreakBonusPerWin: { label: 'XP Streak Bonus / Win', group: 'Player Level (XP)' },
  xpStreakBonusCap: { label: 'XP Streak Bonus Cap', group: 'Player Level (XP)' },

  tournamentXpCompletion: { label: 'Completion XP', group: 'Tournament XP' },
  tournamentXpPerCorrect: { label: 'XP / Correct Answer', group: 'Tournament XP' },
  tournamentXpAccuracyBonus: { label: 'Accuracy Bonus XP', group: 'Tournament XP' },
  tournamentXpAccuracyThreshold: {
    label: 'Accuracy Threshold',
    group: 'Tournament XP',
    isDecimal: true,
    is01Range: true,
    hint: '0–1 decimal (e.g. 0.8 = 80%)',
  },

  duelRankWinFree: { label: 'Win – Free', group: 'Duel Rank Points', isPositive: true, hint: 'must be positive' },
  duelRankWinStaked: { label: 'Win – Staked', group: 'Duel Rank Points', isPositive: true, hint: 'must be positive' },
  duelRankLossFree: { label: 'Loss – Free', group: 'Duel Rank Points', isNegative: true, hint: 'must be negative' },
  duelRankLossStaked: { label: 'Loss – Staked', group: 'Duel Rank Points', isNegative: true, hint: 'must be negative' },
  duelRankDrawFree: { label: 'Draw – Free', group: 'Duel Rank Points' },
  duelRankDrawStaked: { label: 'Draw – Staked', group: 'Duel Rank Points' },
  duelRankForfeitWinFree: { label: 'Forfeit Win – Free', group: 'Duel Rank Points', isPositive: true, hint: 'must be positive' },
  duelRankForfeitWinStaked: { label: 'Forfeit Win – Staked', group: 'Duel Rank Points', isPositive: true, hint: 'must be positive' },
  duelRankForfeitLossFree: { label: 'Forfeit Loss – Free', group: 'Duel Rank Points', isNegative: true, hint: 'must be negative' },
  duelRankForfeitLossStaked: { label: 'Forfeit Loss – Staked', group: 'Duel Rank Points', isNegative: true, hint: 'must be negative' },
  duelRankStreakBonusPerWin: { label: 'Streak Bonus / Win', group: 'Duel Rank Points' },
  duelRankStreakBonusCap: { label: 'Streak Bonus Cap', group: 'Duel Rank Points' },
  duelRankFreeSoftCapWins: { label: 'Free Soft Cap Wins', group: 'Duel Rank Points' },

  demotionShieldBuffer: {
    label: 'Demotion Shield Buffer',
    group: 'Demotion Shield',
    hint: 'points below threshold before demotion triggers',
  },

  tournamentRankTopAward: { label: 'Top Award Points', group: 'Tournament Rank' },
  tournamentRankDecayK: { label: 'Decay K Factor', group: 'Tournament Rank', isDecimal: true },
  tournamentRankParticipationFloor: { label: 'Participation Floor', group: 'Tournament Rank' },

  seasonResetPoints: { label: 'Season Reset Points', group: 'Season Reset Points', type: 'seasonReset' },
};

// ─── Form Value Types ────────────────────────────────────────────────────────

type FormValues = Record<string, string | number[] | Record<string, string>>;

function toFormValues(values: Record<string, unknown>): FormValues {
  const out: FormValues = {};
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v)) {
      out[k] = v as number[];
    } else if (v !== null && typeof v === 'object') {
      out[k] = Object.fromEntries(
        Object.entries(v as Record<string, number>).map(([tk, tv]) => [tk, String(tv)]),
      );
    } else {
      out[k] = String(v ?? '0');
    }
  }
  return out;
}

function toApiValues(form: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (Array.isArray(v)) {
      out[k] = v;
    } else if (typeof v === 'object' && v !== null) {
      out[k] = Object.fromEntries(
        Object.entries(v).map(([tk, tv]) => [tk, parseFloat(tv) || 0]),
      );
    } else {
      out[k] = parseFloat(v as string);
    }
  }
  return out;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(form: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [key, raw] of Object.entries(form)) {
    const meta = FIELD_META[key];
    if (Array.isArray(raw) || (typeof raw === 'object' && raw !== null)) continue;
    const val = parseFloat(raw as string);
    if (isNaN(val)) { errors[key] = 'Must be a number'; continue; }
    if (meta?.isNegative && val >= 0) errors[key] = 'Must be negative';
    if (meta?.isPositive && val <= 0) errors[key] = 'Must be positive';
    if (meta?.is01Range && (val < 0 || val > 1)) errors[key] = 'Must be between 0 and 1';
  }

  // seasonResetPoints — all tiers must be non-negative
  const srp = form.seasonResetPoints;
  if (srp && typeof srp === 'object' && !Array.isArray(srp)) {
    for (const [tier, raw] of Object.entries(srp as Record<string, string>)) {
      const val = parseFloat(raw);
      if (isNaN(val)) errors[`seasonResetPoints.${tier}`] = 'Must be a number';
      else if (val < 0) errors[`seasonResetPoints.${tier}`] = 'Must be non-negative';
    }
  }

  // levelMilestones — must be strictly increasing
  const milestones = form.levelMilestones as number[] | undefined;
  if (milestones && milestones.length > 1) {
    for (let i = 1; i < milestones.length; i++) {
      if (milestones[i] <= milestones[i - 1]) {
        errors.levelMilestones = 'Must be strictly increasing';
        break;
      }
    }
  }

  return errors;
}

// ─── Server Error Parser ─────────────────────────────────────────────────────

function parseServerErrors(error: unknown): Record<string, string> {
  const msgs = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (!msgs) return {};
  const arr = Array.isArray(msgs) ? msgs : [msgs];
  const out: Record<string, string> = {};
  for (const msg of arr) {
    if (typeof msg !== 'string') continue;
    const match = msg.match(/^values\.(.+?)\s+(.+)$/);
    if (match) out[match[1]] = match[2];
    else out['_form'] = msg;
  }
  return out;
}

// ─── Group helper ────────────────────────────────────────────────────────────

function groupedKeys(keys: string[]): Map<FieldGroup, string[]> {
  const map = new Map<FieldGroup, string[]>(GROUP_ORDER.map((g) => [g, []]));
  for (const key of keys) {
    const group = FIELD_META[key]?.group ?? 'Other';
    const arr = map.get(group);
    if (arr) arr.push(key);
  }
  return map;
}

// ─── Date helper ─────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── MilestoneEditor ─────────────────────────────────────────────────────────

function MilestoneEditor({
  value,
  error,
  onChange,
}: {
  value: number[];
  error?: string;
  onChange: (v: number[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const n = parseInt(input, 10);
    if (!isNaN(n) && !value.includes(n)) onChange([...value, n]);
    setInput('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {value.map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1 rounded-full bg-arena-bg border border-arena-border px-2.5 py-0.5 text-xs text-white"
          >
            {m}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== m))}
              className="text-white/40 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-white/20">No milestones</span>}
      </div>
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          placeholder="Level number, then Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="bg-arena-bg border-arena-border text-white placeholder:text-white/30 h-8 text-xs w-48"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input}
          className="text-xs text-arena-gold hover:underline disabled:opacity-30"
        >
          Add
        </button>
      </div>
      {error && (
        <p className="text-xs text-arena-red flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── SeasonResetEditor ───────────────────────────────────────────────────────

function SeasonResetEditor({
  value,
  errors,
  onChange,
}: {
  value: Record<string, string>;
  errors: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Object.keys(value).map((tier) => (
        <div key={tier}>
          <label className="text-xs text-white/50 mb-1 block">{tier}</label>
          <Input
            type="number"
            value={value[tier]}
            onChange={(e) => onChange({ ...value, [tier]: e.target.value })}
            className={cn(
              'bg-arena-bg border-arena-border text-white h-8 text-sm',
              errors[`seasonResetPoints.${tier}`] && 'border-arena-red',
            )}
          />
          {errors[`seasonResetPoints.${tier}`] && (
            <p className="text-xs text-arena-red mt-0.5">{errors[`seasonResetPoints.${tier}`]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AdminProgressionConfigPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');

  // ── Config tab ──────────────────────────────────────────────────────────────
  const { data: config, isLoading, error: loadError } = useProgressionConfig();
  const createMutation = useCreateProgressionConfig();

  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [originalValues, setOriginalValues] = useState<FormValues | null>(null);
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const prevConfigId = useRef<string | undefined>();
  useEffect(() => {
    if (config && config.id !== prevConfigId.current) {
      prevConfigId.current = config.id;
      const fv = toFormValues(config.values as Record<string, unknown>);
      setFormValues(fv);
      setOriginalValues(fv);
    }
  }, [config]);

  const isDirty =
    formValues !== null &&
    originalValues !== null &&
    JSON.stringify(formValues) !== JSON.stringify(originalValues);

  const updateField = (key: string, value: string | number[] | Record<string, string>) => {
    setFormValues((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveClick = () => {
    if (!formValues) return;
    const clientErrors = validate(formValues);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    if (!notes.trim()) {
      setFieldErrors((prev) => ({ ...prev, _notes: 'Add a note before saving' }));
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (!formValues) return;
    try {
      await createMutation.mutateAsync({ values: toApiValues(formValues), notes });
      setNotes('');
      setFieldErrors({});
      setConfirmOpen(false);
      // Form re-initialises when the invalidated config query refetches (new id)
    } catch (err) {
      const serverErrors = parseServerErrors(err);
      setFieldErrors(serverErrors);
      setConfirmOpen(false);
    }
  };

  // ── History tab ─────────────────────────────────────────────────────────────
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const { data: versions, isLoading: versionsLoading } = useProgressionConfigVersions(
    historyPage,
    20,
  );

  const toggleVersion = (id: string) =>
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-bold">Progression Config</h1>
        <p className="text-white/40 text-sm mt-0.5">XP, rank points, and season reset tuning</p>
      </div>

      {/* Non-retroactive banner */}
      <div className="flex items-start gap-3 rounded-xl border border-arena-border bg-arena-surface p-4 text-sm">
        <Info className="h-4 w-4 text-arena-gold shrink-0 mt-0.5" />
        <p className="text-white/60">
          Config changes apply to <span className="text-white font-medium">future awards only</span>{' '}
          and take up to <span className="text-white font-medium">~30 seconds</span> to propagate
          (config cache). Past duels and tournaments keep the config that was live when they
          completed.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-arena-border">
        {(['config', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-arena-gold text-arena-gold'
                : 'border-transparent text-white/50 hover:text-white',
            )}
          >
            {tab === 'config' ? 'Current Config' : 'Version History'}
          </button>
        ))}
      </div>

      {/* ── Config Tab ── */}
      {activeTab === 'config' && (
        <>
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {loadError && <ErrorMessage message="Failed to load progression config." />}

          {formValues && config && (
            <div className="space-y-8">
              {Array.from(groupedKeys(Object.keys(formValues))).map(([group, keys]) => {
                if (keys.length === 0) return null;
                return (
                  <section key={group}>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
                      {group}
                    </h2>
                    <div className="rounded-xl border border-arena-border bg-arena-surface p-4">
                      {group === 'Season Reset Points' ? (
                        // season reset gets its own full-width layout
                        keys.map((key) => {
                          const rawVal = formValues[key];
                          if (typeof rawVal === 'object' && !Array.isArray(rawVal)) {
                            return (
                              <SeasonResetEditor
                                key={key}
                                value={rawVal as Record<string, string>}
                                errors={fieldErrors}
                                onChange={(v) => updateField(key, v)}
                              />
                            );
                          }
                          return null;
                        })
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {keys.map((key) => {
                            const meta = FIELD_META[key];
                            const rawVal = formValues[key];
                            const fieldErr = fieldErrors[key];

                            if (meta?.type === 'milestones') {
                              return (
                                <div key={key} className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                                  <label className="text-xs text-white/50 block">{meta.label}</label>
                                  <MilestoneEditor
                                    value={rawVal as number[]}
                                    error={fieldErr}
                                    onChange={(v) => updateField(key, v)}
                                  />
                                </div>
                              );
                            }

                            // Regular scalar field
                            const label = meta?.label ?? key;
                            const hint = meta?.hint;

                            return (
                              <div key={key} className="space-y-1">
                                <label className="text-xs text-white/50 block">{label}</label>
                                <Input
                                  type="number"
                                  step={meta?.isDecimal ? 'any' : '1'}
                                  value={rawVal as string}
                                  onChange={(e) => updateField(key, e.target.value)}
                                  className={cn(
                                    'bg-arena-bg border-arena-border text-white h-8 text-sm',
                                    fieldErr &&
                                      'border-arena-red focus-visible:ring-arena-red/30',
                                  )}
                                />
                                {hint && !fieldErr && (
                                  <p className="text-xs text-white/30">{hint}</p>
                                )}
                                {fieldErr && (
                                  <p className="text-xs text-arena-red flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {fieldErr}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}

              {/* Generic form error */}
              {fieldErrors._form && (
                <p className="text-sm text-arena-red flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {fieldErrors._form}
                </p>
              )}

              {/* Notes + Save */}
              <div className="rounded-xl border border-arena-border bg-arena-surface p-4 space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">
                    Change notes{' '}
                    <span className="text-white/30">(required — becomes the audit-trail entry)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      if (fieldErrors._notes)
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next._notes;
                          return next;
                        });
                    }}
                    placeholder="Reason for this change (e.g. 'Reducing loss penalty after S2 feedback')"
                    rows={2}
                    className="w-full rounded-lg border border-arena-border bg-arena-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40 resize-none"
                  />
                  {fieldErrors._notes && (
                    <p className="text-xs text-arena-red flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors._notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className={cn('text-xs', isDirty ? 'text-white/40' : 'text-white/20')}>
                    {isDirty ? 'Unsaved changes' : 'No changes'}
                  </p>
                  <Button
                    onClick={handleSaveClick}
                    disabled={!isDirty || createMutation.isPending}
                    className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
                  >
                    Save new version
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {versionsLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {versions && versions.data.length === 0 && (
            <p className="text-white/40 text-sm text-center py-12">No version history yet.</p>
          )}

          {versions && versions.data.length > 0 && (
            <>
              <div className="rounded-xl border border-arena-border overflow-hidden">
                {versions.data.map((v, idx) => {
                  const prev = versions.data[idx + 1];
                  const changedKeys = prev
                    ? Object.keys(v.values).filter(
                        (k) =>
                          JSON.stringify(v.values[k]) !== JSON.stringify(prev.values[k]),
                      )
                    : [];
                  const isExpanded = expandedVersions.has(v.id);

                  return (
                    <div key={v.id} className="border-b border-arena-border/50 last:border-0">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                        onClick={() => toggleVersion(v.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-white font-medium">
                              {formatDate(v.effectiveFrom)}
                            </span>
                            {changedKeys.length > 0 && (
                              <span className="text-xs text-white/40 bg-white/5 rounded px-1.5 py-0.5">
                                {changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''}{' '}
                                changed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-xs text-white/40">by {v.changedBy}</span>
                            {v.notes && (
                              <span className="text-xs text-white/60 truncate max-w-xs">
                                {v.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-arena-border/30 bg-black/10">
                          {changedKeys.length > 0 && (
                            <p className="text-xs text-white/30 mb-3">
                              Highlighted fields changed from previous version.
                            </p>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5">
                            {Object.entries(v.values).map(([key, val]) => {
                              const meta = FIELD_META[key];
                              const label = meta?.label ?? key;
                              const isChanged = changedKeys.includes(key);
                              let displayVal: string;
                              if (Array.isArray(val)) {
                                displayVal = `[${(val as number[]).join(', ')}]`;
                              } else if (val !== null && typeof val === 'object') {
                                displayVal = Object.entries(val as Record<string, number>)
                                  .map(([k, n]) => `${k}: ${n}`)
                                  .join(', ');
                              } else {
                                displayVal = String(val);
                              }
                              return (
                                <div key={key} className="text-xs min-w-0">
                                  <span className="text-white/40 block truncate">{label}</span>
                                  <span
                                    className={cn(
                                      'font-mono break-all',
                                      isChanged ? 'text-arena-gold' : 'text-white/70',
                                    )}
                                  >
                                    {displayVal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {versions.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                    className="text-sm text-white/50 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-white/40">
                    Page {historyPage} of {versions.totalPages}
                  </span>
                  <button
                    disabled={historyPage >= versions.totalPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="text-sm text-white/50 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirm Save Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Save new config version?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60 leading-relaxed">
            This creates a new config version effective immediately. Past awards are unaffected —
            only future duels and tournaments use the new values. Config propagates in ~30s.
          </p>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="border-arena-border text-white/70 hover:bg-white/5"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedSave}
              disabled={createMutation.isPending}
              className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              {createMutation.isPending ? 'Saving…' : 'Confirm & save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
