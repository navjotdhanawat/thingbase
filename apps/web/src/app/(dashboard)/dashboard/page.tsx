'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu, Users, Activity, Wifi, Plus, ArrowRight, Terminal } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DeviceStatusPill } from '@/components/app/device-status-pill';
import { DeviceLastSeen } from '@/components/app/device-last-seen';
import { EmptyState } from '@/components/app/empty-state';

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  variant?: 'default' | 'success';
}

function StatsCard({ title, value, description, icon: Icon, trend, isLoading, variant = 'default' }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${variant === 'success' ? 'text-success' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${variant === 'success' ? 'text-success' : ''}`}>
            {value}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.getTenant(),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: () => api.getTenantStats(),
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices({ pageSize: 5 }),
  });

  const { data: commands, isLoading: commandsLoading } = useQuery({
    queryKey: ['commands-recent'],
    queryFn: () => api.getCommands(),
  });

  const onlineDevices = devices?.filter((d) => d.status === 'online').length || 0;
  const recentCommands = commands?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={tenantLoading ? 'Loading...' : `Welcome back to ${tenant?.name || 'your dashboard'}`}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Devices"
          value={stats?.deviceCount || 0}
          description="Registered devices"
          icon={Cpu}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Online Now"
          value={onlineDevices}
          description="Currently connected"
          icon={Wifi}
          variant="success"
          isLoading={devicesLoading}
        />
        <StatsCard
          title="Team Members"
          value={stats?.userCount || 0}
          description="Active users"
          icon={Users}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Current Plan"
          value={tenant?.plan || 'Free'}
          description="Subscription tier"
          icon={Activity}
          isLoading={tenantLoading}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Devices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Devices</CardTitle>
              <CardDescription>Your latest registered devices</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/devices">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !devices || devices.length === 0 ? (
              <EmptyState
                icon={Cpu}
                title="No devices yet"
                description="Get started by adding your first device"
                action={{
                  label: 'Add Device',
                  onClick: () => {},
                  icon: Plus,
                }}
              />
            ) : (
              <div className="space-y-4">
                {devices.slice(0, 5).map((device) => (
                  <Link
                    key={device.id}
                    href={`/devices/${device.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Cpu className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{device.name}</p>
                        <DeviceLastSeen lastSeen={device.lastSeen} showTooltip={false} />
                      </div>
                    </div>
                    <DeviceStatusPill status={device.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Commands */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Commands</CardTitle>
              <CardDescription>Latest command activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/commands">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {commandsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentCommands || recentCommands.length === 0 ? (
              <EmptyState
                icon={Terminal}
                title="No commands yet"
                description="Commands sent to devices will appear here"
              />
            ) : (
              <div className="space-y-3">
                {recentCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{cmd.type}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          cmd.status === 'acked' ? 'bg-success/10 text-success' :
                          cmd.status === 'failed' || cmd.status === 'timeout' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {cmd.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cmd.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/devices">
                <Cpu className="h-5 w-5" />
                <span>Manage Devices</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/provisioning">
                <Plus className="h-5 w-5" />
                <span>Add New Device</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/users">
                <Users className="h-5 w-5" />
                <span>Manage Team</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/commands">
                <Terminal className="h-5 w-5" />
                <span>View Commands</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
