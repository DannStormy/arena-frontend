import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy, LogOut, ChevronsUpDown, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { useBanks, type Bank } from '@/hooks/use-banks';
import { useUpdateBankDetails, useResolveAccount } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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

  // Pre-populate selectedBank display when banks load or bankCode changes (Fix 1)
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

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Profile" />

      <div className="px-4 space-y-5">
        <div className="flex items-center gap-4 rounded-xl bg-arena-surface border border-arena-border p-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-arena-border text-white text-lg">
              {user?.username?.slice(0, 2).toUpperCase() ?? '??'}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="text-white font-semibold">{user?.username ?? '—'}</p>
            <p className="text-white/50 text-sm">{user?.email ?? '—'}</p>
          </div>
        </div>

        <div className="rounded-xl bg-arena-surface border border-arena-border p-4 space-y-2">
          <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Referral code</p>

          <div className="flex items-center gap-3">
            <span className="flex-1 font-mono text-arena-gold text-lg tracking-widest">
              {user?.referralCode ?? '—'}
            </span>

            <button
              onClick={copyReferral}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-arena-surface border border-arena-border p-4 space-y-4">
          <p className="text-white/50 text-sm font-medium uppercase tracking-wider">Bank details</p>

          <form onSubmit={handleSubmit(onSubmitBank)} className="space-y-3">
            {/* Bank picker combobox */}
            <div>
              <Popover open={bankPickerOpen} onOpenChange={setBankPickerOpen}>
                <PopoverTrigger
                  disabled={banksLoading}
                  className="h-9 w-full flex items-center justify-between rounded-lg border border-arena-border bg-arena-bg px-2.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-white/40"
                >
                  <span className={selectedBank ? 'text-white' : 'text-white/30'}>
                    {banksLoading ? 'Loading banks…' : (selectedBank?.name ?? 'Select bank')}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
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

            {/* Account number */}
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
                className="bg-arena-bg border-arena-border text-white placeholder:text-white/30"
              />
              {errors.bankAccountNumber && (
                <p className="mt-1 text-xs text-arena-red">{errors.bankAccountNumber.message}</p>
              )}
            </div>

            {/* Account name — auto-resolved */}
            <div>
              <div className="relative">
                <Input
                  {...register('bankAccountName')}
                  type="text"
                  placeholder="Account name"
                  readOnly={isAccountNameLocked}
                  className="bg-arena-bg border-arena-border text-white placeholder:text-white/30 read-only:opacity-60 read-only:cursor-default pr-8"
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
              ) : errors.bankAccountName && (
                <p className="mt-1 text-xs text-arena-red">{errors.bankAccountName.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || updateBankDetails.isPending}
              className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              {updateBankDetails.isPending ? 'Saving…' : 'Save bank details'}
            </Button>
          </form>
        </div>

        {user?.isAdmin && (
          <Link
            to="/admin"
            className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-arena-border text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
          >
            <Shield className="h-4 w-4" />
            Admin panel
          </Link>
        )}

        <Button
          onClick={logout}
          variant="outline"
          className="w-full border-arena-red/40 text-arena-red hover:bg-arena-red/10 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
