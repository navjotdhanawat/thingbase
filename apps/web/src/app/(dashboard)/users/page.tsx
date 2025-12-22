'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { Users, Plus, ArrowUpDown, MoreHorizontal, Mail, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['admin', 'user']),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'admin';
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const users = usersData?.items || [];

  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserForm) => api.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteDialog(false);
      form.reset();
      toast.success('Invitation sent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      role: 'user',
    },
  });

  const onInviteSubmit = (data: InviteUserForm) => {
    inviteMutation.mutate(data);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const initials = row.original.email
          .split('@')[0]
          .split('.')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {row.original.name || row.original.email.split('@')[0]}
              </div>
              <div className="text-xs text-muted-foreground">
                {row.original.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={getRoleVariant(row.original.role)} className="capitalize">
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!isAdmin) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" />
                Resend Invite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Manage your team and permissions"
        actions={
          isAdmin && (
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )
        }
      />

      {!isLoading && users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite team members to collaborate on your IoT platform."
          action={
            isAdmin
              ? {
                  label: 'Invite User',
                  onClick: () => setShowInviteDialog(true),
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchKey="email"
          searchPlaceholder="Search users..."
          isLoading={isLoading}
        />
      )}

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onInviteSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(value) => form.setValue('role', value as 'admin' | 'user')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins can manage devices, users, and settings. Users can view and control devices.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
