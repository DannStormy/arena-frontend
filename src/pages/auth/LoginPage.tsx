import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorMessage } from '@/components/common/ErrorMessage';

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
    <div className="flex min-h-svh items-center justify-center bg-arena-bg px-4">
      <Card className="w-full max-w-sm bg-arena-surface border-arena-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
          <p className="text-white/50 text-sm">Sign in to Arena</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                {...register('email')}
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="bg-arena-bg border-arena-border text-white placeholder:text-white/30"
              />
              {errors.email && <ErrorMessage message={errors.email.message!} className="mt-1" />}
            </div>

            <div>
              <Input
                {...register('password')}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="bg-arena-bg border-arena-border text-white placeholder:text-white/30"
              />
              {errors.password && <ErrorMessage message={errors.password.message!} className="mt-1" />}
            </div>

            {errors.root && <ErrorMessage message={errors.root.message!} />}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-center text-sm text-white/50">
              No account?{' '}
              <Link
                to={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
                className="text-arena-gold hover:underline"
              >
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
