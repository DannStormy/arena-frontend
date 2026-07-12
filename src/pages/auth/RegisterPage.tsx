import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { AuthShell } from '@/components/auth/AuthShell';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  referralCode: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Machined ember CTA — chamfered top-right corner, breathing glow (§6/§8).
const CTA_CLIP = 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? undefined;
  const [showReferral, setShowReferral] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data, redirectTo);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Registration failed. Please try again.';

      setError('root', { message });
    }
  };

  return (
    <AuthShell>
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold text-arena-text-primary">Claim your spot</h2>
        <p className="mt-0.5 text-sm text-arena-text-secondary">
          Free to play. First points in 30 seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            {...register('email')}
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-accent/50 focus-visible:border-arena-accent/60"
          />
          {errors.email && <ErrorMessage message={errors.email.message!} className="mt-1" />}
        </div>

        <div>
          <Input
            {...register('username')}
            type="text"
            placeholder="Username"
            autoComplete="username"
            className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-accent/50 focus-visible:border-arena-accent/60"
          />
          {errors.username && <ErrorMessage message={errors.username.message!} className="mt-1" />}
        </div>

        <div>
          <PasswordInput
            {...register('password')}
            placeholder="Password (8+ characters)"
            autoComplete="new-password"
            className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-accent/50 focus-visible:border-arena-accent/60"
          />
          {errors.password && <ErrorMessage message={errors.password.message!} className="mt-1" />}
        </div>

        {/* Referral code — tucked away to keep the up-front form to 3 fields */}
        {showReferral ? (
          <div>
            <Input
              {...register('referralCode')}
              type="text"
              placeholder="Referral code"
              autoComplete="off"
              autoFocus
              className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-accent/50 focus-visible:border-arena-accent/60"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowReferral(true)}
            className="text-xs font-medium text-arena-text-tertiary transition-colors hover:text-arena-accent-bright"
          >
            Have a referral code?
          </button>
        )}

        {errors.root && <ErrorMessage message={errors.root.message!} />}

        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ clipPath: CTA_CLIP }}
          className="animate-lobby-breathe h-12 w-full rounded-none bg-gradient-to-b from-arena-accent to-arena-accent-pressed font-display text-base font-semibold uppercase tracking-wide text-white shadow-[0_0_30px_-6px_rgba(232,137,59,0.65)] transition-[filter,transform] hover:brightness-110 active:translate-y-px active:brightness-95"
        >
          {isSubmitting ? 'Creating account…' : 'Create account & play'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-arena-text-secondary">
        Already competing?{' '}
        <Link
          to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
          className="font-semibold text-arena-accent-bright hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
