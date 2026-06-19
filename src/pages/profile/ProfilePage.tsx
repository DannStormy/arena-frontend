import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy, LogOut, ChevronsUpDown, Shield, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { useBanks, type Bank } from '@/hooks/use-banks';
import { useUpdateBankDetails, useResolveAccount, useUserStats } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AvatarRing } from '@/components/common/AvatarRing';
import { TierBadge, getTierDisplayName, getTierInkColor } from '@/components/common/TierBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { EMBER } from '@/lib/ember';

const bankSchema = z.object({
  bankCode: z.string().min(1, 'Select a bank'),
  bankAccountNumber: z.string().length(10, 'Account number must be 10 digits'),
  bankAccountName: z.string().min(2, 'Enter account name'),
});

type BankFormData = z.infer<typeof bankSchema>;

const TIER_ORDER = ['spectator', 'challenger', 'gladiator', 'champion', 'legend'] as const;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const { data: banks, isLoading: banksLoading } = useBanks();
  const updateBankDetails = useUpdateBankDetails();
  const { data: stats } = useUserStats();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankCode: user?.bankCode ?? '',
      bankAccountNumber: user?.bankAccountNumber ?? '',
      bankAccountName: user?.bankAccountName ?? '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        bankCode: user.bankCode ?? '',
        bankAccountNumber: user.bankAccountNumber ?? '',
        bankAccountName: user.bankAccountName ?? '',
      });
    }
  }, [user, reset]);

  // ── Bank combobox ────────────────────────────────────────────────────────────

  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const watchedBankCode = useWatch({ control, name: 'bankCode' });
  const watchedAccountNumber = useWatch({ control, name: 'bankAccountNumber' });

  useEffect(() => {
    if (banks && watchedBankCode) {
      const found = banks.find((b) => b.code === watchedBankCode) ?? null;
      setSelectedBank(found);
    } else if (!watchedBankCode) {
      setSelectedBank(null);
    }
  }, [banks, watchedBankCode]);

  // ── Auto-resolve account name ─────────────────────────────────────────────

  const [debouncedAccountNumber, setDebouncedAccountNumber] = useState('');
  const [debouncedBankCode, setDebouncedBankCode] = useState('');
  const hasUserEditedRef = useRef(false);

  useEffect(() => {
    if (!hasUserEditedRef.current) return;
    const id = setTimeout(() => {
      setDebouncedAccountNumber(watchedAccountNumber);
      setDebouncedBankCode(watchedBankCode);
    }, 500);
    return () => clearTimeout(id);
  }, [watchedAccountNumber, watchedBankCode]);

  const {
    data: resolveData,
    isLoading: resolving,
    isError: resolveError,
  } = useResolveAccount(debouncedAccountNumber, debouncedBankCode);

  const resolveReady = debouncedAccountNumber.length === 10 && !!debouncedBankCode;

  useEffect(() => {
    if (resolveData?.accountName) {
      setValue('bankAccountName', resolveData.accountName, { shouldValidate: true });
    }
  }, [resolveData, setValue]);

  useEffect(() => {
    if (resolveError) {
      setValue('bankAccountName', '', { shouldValidate: false });
    }
  }, [resolveError, setValue]);

  const isAccountNameLocked = resolveReady && (resolving || (!resolveError && !!resolveData));

  const { onChange: onAccountNumberChange, ...accountNumberRest } = register('bankAccountNumber');

  const copyReferral = async () => {
    if (!user?.referralCode) return;
    await navigator.clipboard.writeText(user.referralCode);
    toast.success('Referral code copied!');
  };

  const onSubmitBank = (data: BankFormData) => updateBankDetails.mutate(data);

  // ── Derived progression values ────────────────────────────────────────────

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';
  const hasRing  = stats?.level != null && stats.intoLevel != null && stats.nextLevelAt != null;

  // Season rank (duel rank)
  const seasonRank   = stats?.seasonRank ?? null;
  const seasonPoints = stats?.seasonPoints ?? null;

  const seasonRankFloor = stats?.seasonRankFloor ?? 0;
  const nextRankAt      = stats?.nextRankAt ?? null;

  const seasonRange = Math.max((nextRankAt ?? 0) - seasonRankFloor, 1);
  const seasonPct =
    seasonRank && seasonPoints != null
      ? Math.min(((seasonPoints - seasonRankFloor) / seasonRange) * 100, 100)
      : 0;

  const nextTierName = (() => {
    if (!seasonRank) return null;
    const idx = TIER_ORDER.findIndex((t) => t === seasonRank.toLowerCase());
    return idx >= 0 && idx < TIER_ORDER.length - 1
      ? TIER_ORDER[idx + 1].charAt(0).toUpperCase() + TIER_ORDER[idx + 1].slice(1)
      : null;
  })();

  // Demotion shield: within 100 pts of tier floor means player is shielded
  const isShielded =
    seasonPoints != null &&
    seasonRankFloor > 0 &&
    seasonPoints < seasonRankFloor + 100;

  // XP progress for level bar
  const xpPct =
    stats?.level != null && stats.intoLevel != null && stats.nextLevelAt
      ? Math.min((stats.intoLevel / stats.nextLevelAt) * 100, 100)
      : 0;

  const allTimeHighestRank = stats?.allTimeHighestRank ?? null;

  const tierInk = seasonRank ? getTierInkColor(seasonRank) : EMBER.textSecondary;

  // Win rate for record block
  const winRate =
    stats?.duelsWon != null && stats?.duelsPlayed
      ? Math.round((stats.duelsWon / stats.duelsPlayed) * 100)
      : null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Profile" />

      <div className="px-4 space-y-3 pb-6">

        {/* ── Rank hero card ────────────────────────────────────────────────── */}
        <div
          className="clip-card relative overflow-hidden"
          style={{ background: EMBER.surface }}
        >
          {/* Ambient room-light — same layer technique as duels hero */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '-60px -30px -80px -30px',
              pointerEvents: 'none',
              filter: 'blur(24px)',
              background:
                'radial-gradient(40% 38% at 70% 35%, rgba(232,137,59,0.16), transparent 72%)',
              zIndex: 0,
            }}
          />

          <div className="relative z-10 p-5">
            {/* Top: avatar | tier badge + labels */}
            <div className="flex items-start gap-4 mb-5">
              {/* Avatar — level system (permanent, purple) */}
              {hasRing ? (
                <AvatarRing
                  avatarUrl={user?.avatarUrl}
                  initials={initials}
                  intoLevel={stats!.intoLevel!}
                  nextLevelAt={stats!.nextLevelAt!}
                  level={stats!.level!}
                />
              ) : (
                <div
                  className="clip-avatar h-16 w-16 flex items-center justify-center shrink-0 font-bold text-xl text-white select-none"
                  style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
                >
                  {initials}
                </div>
              )}

              {/* Tier badge + labels */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {seasonRank ? (
                  <TierBadge tier={seasonRank} size="lg" />
                ) : (
                  <TierBadge tier="spectator" size="lg" />
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                    style={{ color: EMBER.textTertiary }}
                  >
                    Duel rank · seasonal
                  </p>
                  <p
                    className="font-display font-bold text-2xl leading-none"
                    style={{ color: tierInk }}
                  >
                    {seasonRank ? getTierDisplayName(seasonRank) : 'Unranked'}
                  </p>
                  {seasonPoints != null && (
                    <p
                      className="font-display text-sm mt-1 tabular-nums"
                      style={{ color: EMBER.textSecondary }}
                    >
                      {seasonPoints.toLocaleString()} pts
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Username */}
            <p
              className="font-display font-bold text-lg leading-none mb-4"
              style={{ color: EMBER.textPrimary }}
            >
              {user?.username ?? '—'}
            </p>

            {/* Progress to next tier */}
            {seasonPoints != null && nextRankAt != null && nextTierName && (
              <div>
                <div
                  className="flex items-center justify-between mb-1.5"
                  style={{ color: EMBER.textTertiary }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                    → {nextTierName}
                  </span>
                  <span className="text-[10px] tabular-nums">
                    {(nextRankAt - seasonPoints).toLocaleString()} pts away
                  </span>
                </div>
                <div
                  className="h-[4px] overflow-hidden"
                  style={{ background: 'rgba(232,137,59,0.15)' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${seasonPct}%`,
                      background: `linear-gradient(90deg, ${EMBER.accentDeep}, ${EMBER.accent})`,
                      transition: 'width 600ms ease-out',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Max rank label */}
            {seasonRank && !nextTierName && (
              <p className="text-[10px] mt-1" style={{ color: EMBER.textTertiary }}>
                Maximum rank reached
              </p>
            )}

            {/* Demotion shield indicator */}
            {isShielded && (
              <div className="flex items-center gap-1.5 mt-2">
                <Shield className="h-3 w-3" style={{ color: EMBER.accent }} />
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: EMBER.accent }}
                >
                  Protected from demotion
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Level block (permanent XP system) ────────────────────────────── */}
        {stats?.level != null && (
          <div
            className="clip-card relative overflow-hidden"
            style={{ background: EMBER.surface }}
          >
            <div className="p-4">
              {/* PERMANENT label — visually distinct from seasonal rank above */}
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(198,220,232,0.65)' }}
                >
                  Level · permanent
                </p>
                {stats.intoLevel != null && stats.nextLevelAt != null && (
                  <span
                    className="text-[11px] tabular-nums"
                    style={{ color: EMBER.textTertiary }}
                  >
                    {stats.intoLevel.toLocaleString()} / {stats.nextLevelAt.toLocaleString()} XP
                  </span>
                )}
              </div>

              <p
                className="font-display font-bold text-3xl leading-none mb-3"
                style={{ color: EMBER.textPrimary }}
              >
                {stats.level}
              </p>

              {/* XP bar — purple to distinguish from ember rank bar above */}
              {stats.intoLevel != null && stats.nextLevelAt != null && (
                <div
                  className="h-[5px] overflow-hidden"
                  style={{ background: 'rgba(198,220,232,0.12)' }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${xpPct}%`,
                      background: 'linear-gradient(90deg, #A9C5D6, #C6DCE8)',
                      transition: 'width 600ms ease-out',
                    }}
                  />
                </div>
              )}

              {stats.lifetimeXp != null && (
                <p
                  className="text-[10px] mt-2 tabular-nums"
                  style={{ color: EMBER.textTertiary }}
                >
                  {stats.lifetimeXp.toLocaleString()} lifetime XP
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── All-time peak ─────────────────────────────────────────────────── */}
        {allTimeHighestRank && (
          <div
            className="clip-card"
            style={{ background: EMBER.surface }}
          >
            <div className="p-4 flex items-center gap-4">
              <TierBadge tier={allTimeHighestRank} size="md" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                  style={{ color: EMBER.textTertiary }}
                >
                  All-time peak
                </p>
                <p
                  className="font-display font-bold text-lg leading-none"
                  style={{ color: getTierInkColor(allTimeHighestRank) }}
                >
                  {getTierDisplayName(allTimeHighestRank)}
                </p>
              </div>
              <p
                className="text-[10px] text-right shrink-0"
                style={{ color: EMBER.textTertiary }}
              >
                Permanent —<br />never resets
              </p>
            </div>
          </div>
        )}
        {/* TODO(BE): allTimeHighestRank field not yet confirmed in /users/me/stats response */}

        {/* ── Record ───────────────────────────────────────────────────────── */}
        {stats && (
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-4">
            <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em] mb-3">
              Record
            </p>

            {stats.duelsPlayed != null ? (
              <>
                <div className="grid grid-cols-3 gap-0 mb-4 pb-4 border-b border-arena-border/40">
                  <div className="text-center border-r border-arena-border/40">
                    <p className="font-display text-arena-win text-2xl font-bold">
                      {stats.duelsWon ?? 0}
                    </p>
                    <p className="text-arena-text-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                      Wins
                    </p>
                  </div>
                  <div className="text-center border-r border-arena-border/40">
                    <p className="font-display text-arena-loss text-2xl font-bold">
                      {stats.duelsLost ?? 0}
                    </p>
                    <p className="text-arena-text-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                      Losses
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-arena-text-secondary text-2xl font-bold">
                      {stats.duelsTied ?? 0}
                    </p>
                    <p className="text-arena-text-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                      Tied
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-0">
                  <div className="text-center border-r border-arena-border/40">
                    <p className="font-display text-arena-text-primary text-base font-bold">
                      {winRate != null ? `${winRate}%` : '—'}
                    </p>
                    <p className="text-arena-text-tertiary text-[10px] mt-0.5">Win rate</p>
                  </div>
                  <div className="text-center border-r border-arena-border/40">
                    <p className="font-display text-arena-text-primary text-base font-bold">
                      {stats.accuracy}%
                    </p>
                    <p className="text-arena-text-tertiary text-[10px] mt-0.5">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-arena-text-primary text-base font-bold">
                      {stats.bestWinStreak ?? stats.currentWinStreak ?? '—'}
                    </p>
                    <p className="text-arena-text-tertiary text-[10px] mt-0.5">Best streak</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-display text-arena-text-primary text-xl font-bold">
                    {stats.tournamentsPlayed}
                  </p>
                  <p className="text-arena-text-tertiary text-xs mt-0.5">Played</p>
                </div>
                <div>
                  <p className="font-display text-arena-text-primary text-xl font-bold">
                    {stats.questionsAnswered}
                  </p>
                  <p className="text-arena-text-tertiary text-xs mt-0.5">Questions</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold" style={{ color: '#C6DCE8' }}>
                    {stats.accuracy}%
                  </p>
                  <p className="text-arena-text-tertiary text-xs mt-0.5">Accuracy</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Referral code ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-arena-surface border border-arena-border p-4">
          <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em] mb-3">
            Referral code
          </p>
          <div className="flex items-center gap-3">
            <span className="flex-1 font-mono text-arena-gold text-xl tracking-widest">
              {user?.referralCode ?? '—'}
            </span>
            <button
              onClick={copyReferral}
              className="p-2 rounded-xl text-arena-text-tertiary hover:text-white hover:bg-white/5 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Bank details ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-arena-surface border border-arena-border p-4 space-y-4">
          <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em]">
            Bank details
          </p>

          <form onSubmit={handleSubmit(onSubmitBank)} className="space-y-3">
            <div>
              <Popover open={bankPickerOpen} onOpenChange={setBankPickerOpen}>
                <PopoverTrigger
                  disabled={banksLoading}
                  className="h-11 w-full flex items-center justify-between rounded-xl border border-arena-border bg-arena-elev px-3 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-[#A9C5D6]/60"
                >
                  <span className={selectedBank ? 'text-white' : 'text-arena-text-tertiary'}>
                    {banksLoading ? 'Loading banks…' : (selectedBank?.name ?? 'Select bank')}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-40 shrink-0" />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--available-width,320px)] p-0 bg-arena-surface border-arena-border">
                  <Command className="bg-arena-surface text-white">
                    <CommandInput placeholder="Search bank…" className="text-white placeholder:text-white/30" />
                    <CommandList>
                      <CommandEmpty className="text-white/50">No bank found.</CommandEmpty>
                      <CommandGroup>
                        {banks?.map((bank) => (
                          <CommandItem
                            key={bank.code}
                            value={bank.name}
                            onSelect={() => {
                              hasUserEditedRef.current = true;
                              setValue('bankCode', bank.code, { shouldValidate: true });
                              setSelectedBank(bank);
                              setBankPickerOpen(false);
                            }}
                            className="text-white data-selected:bg-white/10"
                          >
                            {bank.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.bankCode && (
                <p className="mt-1 text-xs text-arena-red">{errors.bankCode.message}</p>
              )}
            </div>

            <div>
              <Input
                {...accountNumberRest}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  hasUserEditedRef.current = true;
                  void onAccountNumberChange(e);
                }}
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="Account number (10 digits)"
                className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-arena-text-tertiary focus-visible:ring-[#C6DCE8]/40 focus-visible:border-[#A9C5D6]/60"
              />
              {errors.bankAccountNumber && (
                <p className="mt-1 text-xs text-arena-red">{errors.bankAccountNumber.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Input
                  {...register('bankAccountName')}
                  type="text"
                  placeholder="Account name"
                  readOnly={isAccountNameLocked}
                  className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-arena-text-tertiary read-only:opacity-60 read-only:cursor-default pr-8 focus-visible:ring-[#C6DCE8]/40 focus-visible:border-[#A9C5D6]/60"
                />
                {resolving && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
              {resolveError ? (
                <p className="mt-1 text-xs text-arena-red">
                  Account not found — check your details
                </p>
              ) : (
                errors.bankAccountName && (
                  <p className="mt-1 text-xs text-arena-red">{errors.bankAccountName.message}</p>
                )
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || updateBankDetails.isPending}
              className="w-full h-11 text-white font-semibold transition-all active:scale-[0.98] hover:brightness-[1.06]"
              style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
            >
              {updateBankDetails.isPending ? 'Saving…' : 'Save bank details'}
            </Button>
          </form>
        </div>

        {/* ── Secondary links ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Link
            to="/wallet"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-arena-border text-arena-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
          >
            <Wallet className="h-4 w-4" />
            Wallet
          </Link>

          {user?.isAdmin && (
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-arena-border text-arena-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <Shield className="h-4 w-4" />
              Admin panel
            </Link>
          )}
        </div>

        <Button
          onClick={logout}
          variant="outline"
          className="w-full h-11 border-arena-red/30 text-arena-red hover:bg-arena-red/10 hover:border-arena-red/50 gap-2 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
