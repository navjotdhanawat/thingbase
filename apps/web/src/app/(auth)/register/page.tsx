'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, Cpu } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  tenantName: z.string().min(1, 'Organization name is required'),
  tenantSlug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Auto-generate slug from tenant name
  const tenantName = watch('tenantName');
  const handleTenantNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setValue('tenantSlug', slug);
  };

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      const tokens = await api.register(data);
      api.setAccessToken(tokens.accessToken);
      const userData = await api.getMe();
      setAuth({
        user: { ...userData, role: userData.role as 'admin' | 'user' },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Cpu className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Get started with your IoT platform
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name (optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                {...register('name')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantName">Organization Name</Label>
              <Input
                id="tenantName"
                placeholder="Acme Inc"
                {...register('tenantName', {
                  onChange: (e) => handleTenantNameChange(e.target.value),
                })}
              />
              {errors.tenantName && (
                <p className="text-sm text-destructive">{errors.tenantName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Organization Slug</Label>
              <Input
                id="tenantSlug"
                placeholder="acme-inc"
                {...register('tenantSlug')}
              />
              {errors.tenantSlug && (
                <p className="text-sm text-destructive">{errors.tenantSlug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will be used in your URLs and API endpoints.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
