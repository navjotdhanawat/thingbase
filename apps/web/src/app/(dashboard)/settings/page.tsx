'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building2, CreditCard, Key, Bell, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/app/page-header';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.getTenant(),
  });

  // Profile form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser({ ...user!, name: updatedUser.name || undefined });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  // Password form
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => api.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      passwordForm.reset();
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and organization settings"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email preferences.
              </CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact support to change your email address.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Badge variant="default" className="capitalize">
                        {user?.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    {...profileForm.register('name')}
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={profileMutation.isPending}>
                    {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <form onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password"
                    {...passwordForm.register('currentPassword')}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      {...passwordForm.register('newPassword')}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      {...passwordForm.register('confirmPassword')}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Manage your organization settings and branding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenantLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input
                        id="org-name"
                        defaultValue={tenant?.name}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-slug">Slug</Label>
                      <Input
                        id="org-slug"
                        defaultValue={tenant?.slug}
                        disabled
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change organization details.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium capitalize">{tenant?.plan || 'Free'} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant?.plan === 'free'
                        ? 'Limited to 10 devices'
                        : 'Unlimited devices and features'}
                    </p>
                  </div>
                </div>
                <Button variant="outline">Upgrade</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Key className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  API key management will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about device events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Notification settings will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
