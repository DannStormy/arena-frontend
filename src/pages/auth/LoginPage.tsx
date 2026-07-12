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

const loginSchema = z.object({
  identifier: z.string().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Machined ember CTA — chamfered top-right corner, breathing glow (§6/§8).
const CTA_CLIP = 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)';

export function LoginPage() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? undefined;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data, redirectTo);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Login failed. Please try again.';

      setError('root', { message });
    }
  };

  return (
    <AuthShell>
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold text-arena-text-primary">Welcome back</h2>
        <p className="mt-0.5 text-sm text-arena-text-secondary">Your streak is waiting.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            {...register('identifier')}
            type="text"
            placeholder="Username or email"
            autoComplete="username"
            className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-accent/50 focus-visible:border-arena-accent/60"
          />
          {errors.identifier && <ErrorMessage message={errors.identifier.message!} className="mt-1" />}
        </div>

        <div>
          <PasswordInput
            {...register('password')}
            placeholder="Password"
            autoComplete="current-password"
            className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-accent/50 focus-visible:border-arena-accent/60"
          />
          {errors.password && <ErrorMessage message={errors.password.message!} className="mt-1" />}
        </div>

        {errors.root && <ErrorMessage message={errors.root.message!} />}

        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ clipPath: CTA_CLIP }}
          className="animate-lobby-breathe h-12 w-full rounded-none bg-gradient-to-b from-arena-accent to-arena-accent-pressed font-display text-base font-semibold uppercase tracking-wide text-white shadow-[0_0_30px_-6px_rgba(232,137,59,0.65)] transition-[filter,transform] hover:brightness-110 active:translate-y-px active:brightness-95"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-arena-text-secondary">
        New here?{' '}
        <Link
          to={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
          className="font-semibold text-arena-accent-bright hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
