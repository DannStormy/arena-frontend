import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Particles } from '@/components/common/Particles';
import { Logo } from '@/components/common/Logo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

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
    <div className="relative flex min-h-svh items-center justify-center bg-arena-bg px-4">
      <Particles />
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-2">
            <Logo variant="full" className="text-2xl" />
          </div>
          <p className="text-white/50 text-sm">Welcome back. Let's compete.</p>
        </div>

        <div className="rounded-2xl border border-arena-border bg-arena-surface/80 backdrop-blur-sm p-6 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                {...register('email')}
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-purple/50 focus-visible:border-arena-purple/60"
              />
              {errors.email && <ErrorMessage message={errors.email.message!} className="mt-1" />}
            </div>

            <div>
              <Input
                {...register('password')}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="h-11 bg-arena-elev border-arena-border text-white placeholder:text-white/30 focus-visible:ring-arena-purple/50 focus-visible:border-arena-purple/60"
              />
              {errors.password && <ErrorMessage message={errors.password.message!} className="mt-1" />}
            </div>

            {errors.root && <ErrorMessage message={errors.root.message!} />}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-arena-purple hover:bg-arena-purple-bright active:bg-arena-purple-pressed text-white font-semibold transition-all active:scale-[0.98]"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-white/40">
            No account?{' '}
            <Link
              to={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
              className="text-arena-purple-bright hover:underline font-medium"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
