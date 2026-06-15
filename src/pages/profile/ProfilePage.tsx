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
import { RankBadge, getTierFromName, isKnownTier } from '@/components/common/RankBadge';
import { AvatarRing } from '@/components/common/AvatarRing';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const bankSchema = z.object({
  bankCode: z.string().min(1, 'Select a bank'),
  bankAccountNumber: z.string().length(10, 'Account number must be 10 digits'),
  bankAccountName: z.string().min(2, 'Enter account name'),
});

type BankFormData = z.infer<typeof bankSchema>;

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

  // ── Auto-resolve account name ────────────────────────────────────────────────

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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const { onChange: onAccountNumberChange, ...accountNumberRest } = register('bankAccountNumber');

  const copyReferral = async () => {
    if (!user?.referralCode) return;
    await navigator.clipboard.writeText(user.referralCode);
    toast.success('Referral code copied!');
  };

  const onSubmitBank = (data: BankFormData) => updateBankDetails.mutate(data);

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const currentRank = user?.rank ?? stats?.seasonRank;
  const initials    = user?.username?.slice(0, 2).toUpperCase() ?? '??';

  const winRate =
    stats?.duelsWon != null && stats?.duelsPlayed
      ? Math.round((stats.duelsWon / stats.duelsPlayed) * 100)
      : null;

  // XP bar (used in level block only — ring has its own inline calc)
  const xpPct =
    stats?.level != null && stats?.intoLevel != null && stats?.nextLevelAt
      ? Math.min((stats.intoLevel / stats.nextLevelAt) * 100, 100)
      : 0;

  const seasonRange = Math.max((stats?.nextRankAt ?? 0) - (stats?.seasonRankFloor ?? 0), 1);
  const seasonPct =
    stats?.seasonRank && stats?.seasonPoints != null
      ? Math.min(((stats.seasonPoints - (stats.seasonRankFloor ?? 0)) / seasonRange) * 100, 100)
      : 0;

  const seasonBarColor =
    stats?.seasonRank && isKnownTier(stats.seasonRank)
      ? getTierFromName(stats.seasonRank).color + 'CC'
      : '#6B6B7A';

  // All-time highest rank — may be absent if BE hasn't shipped it yet
  const allTimeHighestRank = stats?.allTimeHighestRank ?? null;

  // Next-tier label for season block
  const nextTierName = (() => {
    const TIERS = ['Spectator', 'Challenger', 'Gladiator', 'Champion', 'Legend'];
    if (!stats?.seasonRank) return null;
    const idx = TIERS.findIndex((t) => t.toLowerCase() === stats.seasonRank!.toLowerCase());
    return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  })();

  const hasRing = stats?.level != null && stats.intoLevel != null && stats.nextLevelAt != null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Profile" />

      <div className="px-4 space-y-3 pb-6">
        {/* ── Trophy case header ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-arena-border bg-arena-surface p-5 flex items-center gap-4">
          {hasRing ? (
            <AvatarRing
              avatarUrl={user?.avatarUrl}
              initials={initials}
              intoLevel={stats!.intoLevel!}
              nextLevelAt={stats!.nextLevelAt!}
              level={stats!.level!}
            />
          ) : (
            /* Fallback when BE hasn't shipped progression yet */
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: '#7C5CFF', boxShadow: '0 0 0 2px rgba(124,92,255,0.3)' }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-bold text-xl text-white">{initials}</span>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-display font-bold text-lg text-arena-text-primary leading-none">
                {user?.username ?? '—'}
              </p>
              {currentRank && isKnownTier(currentRank) && <RankBadge rank={currentRank} size="sm" />}
            </div>
            <p className="text-arena-text-tertiary text-xs truncate">{user?.email ?? '—'}</p>
          </div>
        </div>

        {/* ── Level block ──────────────────────────────────────────────────── */}
        {stats?.level != null && (
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-4">
            <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em] mb-3">
              Level
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-bold text-2xl text-arena-text-primary">
                {stats.level}
              </span>
              {stats.intoLevel != null && stats.nextLevelAt != null && (
                <span className="text-arena-text-tertiary text-[11px] tabular-nums">
                  {stats.intoLevel.toLocaleString()} / {stats.nextLevelAt.toLocaleString()} XP
                </span>
              )}
            </div>
            <div className="h-[6px] rounded-full bg-arena-elev overflow-hidden">
              <div className="h-full rounded-full bg-arena-purple" style={{ width: `${xpPct}%` }} />
            </div>
            {stats.lifetimeXp != null && (
              <p className="text-arena-text-tertiary text-[10px] mt-2 tabular-nums">
                {stats.lifetimeXp.toLocaleString()} lifetime XP
              </p>
            )}
          </div>
        )}

        {/* ── Season rank block ────────────────────────────────────────────── */}
        {stats?.seasonRank && (
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-4">
            <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em] mb-3">
              Season rank
            </p>
            <div className="flex items-center justify-between mb-2">
              {isKnownTier(stats.seasonRank) && <RankBadge rank={stats.seasonRank} size="sm" />}
              {stats.seasonPoints != null && stats.nextRankAt != null && (
                <span className="text-arena-text-tertiary text-[11px] tabular-nums">
                  {stats.seasonPoints.toLocaleString()} / {stats.nextRankAt.toLocaleString()} pts
                </span>
              )}
            </div>
            <div className="h-[4px] rounded-full bg-arena-elev overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${seasonPct}%`, background: seasonBarColor }} />
            </div>
            {nextTierName && stats.nextRankAt != null && stats.seasonPoints != null && (
              <p className="text-arena-text-tertiary text-[10px] mt-2 tabular-nums">
                {(stats.nextRankAt - stats.seasonPoints).toLocaleString()} pts to {nextTierName}
              </p>
            )}
            {!nextTierName && <p className="text-arena-text-tertiary text-[10px] mt-2">Max rank</p>}
          </div>
        )}

        {/* ── All-time highest rank ─────────────────────────────────────────── */}
        {allTimeHighestRank ? (
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-4 flex items-center justify-between">
            <div>
              <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em] mb-1.5">
                All-time best
              </p>
              {isKnownTier(allTimeHighestRank) && <RankBadge rank={allTimeHighestRank} size="md" />}
            </div>
            <p className="text-arena-text-tertiary text-[10px] text-right max-w-[100px]">
              Permanent — never resets
            </p>
          </div>
        ) : (
          /* Visible only until BE ships allTimeHighestRank — comment flags the gap */
          /* TODO(BE): allTimeHighestRank field not yet in /users/me/stats response */
          null
        )}

        {/* ── Record ───────────────────────────────────────────────────────── */}
        {stats && (
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-4">
            <p className="text-arena-text-tertiary text-[10px] font-semibold uppercase tracking-[0.09em] mb-3">
              Record
            </p>

            {stats.duelsPlayed != null ? (
              <>
                {/* Primary: win / loss / tie counts */}
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

                {/* Secondary: win rate / accuracy / streak */}
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
              /* Fallback when backend hasn't shipped duel stats yet */
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
                  <p className="font-display text-arena-purple-bright text-xl font-bold">
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
                  className="h-11 w-full flex items-center justify-between rounded-xl border border-arena-border bg-arena-elev px-3 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-arena-purple/60"
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
                className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-arena-text-tertiary focus-visible:ring-arena-purple/50 focus-visible:border-arena-purple/60"
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
                  className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-arena-text-tertiary read-only:opacity-60 read-only:cursor-default pr-8 focus-visible:ring-arena-purple/50 focus-visible:border-arena-purple/60"
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
              className="w-full h-11 bg-arena-purple hover:bg-arena-purple-bright active:bg-arena-purple-pressed active:scale-[0.98] text-white font-semibold transition-all"
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
