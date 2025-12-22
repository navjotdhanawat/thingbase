'use client';

import { useQuery } from '@tanstack/react-query';
import { Terminal, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CommandStatusPill } from '@/components/app/command-status-pill';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Command {
  id: string;
  deviceId: string;
  correlationId: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  errorMessage?: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
}

export default function CommandsPage() {
  const { data: commands, isLoading, refetch, isRefetching } = useQuery<Command[]>({
    queryKey: ['commands'],
    queryFn: () => api.getCommands(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command History"
        description="View all commands sent to your devices"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !commands || commands.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No commands yet"
          description="Commands you send to your devices will appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Commands</CardTitle>
            <CardDescription>
              Showing {commands.length} command(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  className={cn(
                    'flex items-start justify-between p-4 rounded-lg border',
                    cmd.status === 'failed' || cmd.status === 'timeout'
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'bg-muted/30'
                  )}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{cmd.type}</span>
                      <CommandStatusPill status={cmd.status} />
                      <Link
                        href={`/devices/${cmd.deviceId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View Device
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {JSON.stringify(cmd.payload)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Device: {cmd.deviceId.slice(0, 8)}</span>
                      <span>Created: {new Date(cmd.createdAt).toLocaleString()}</span>
                      {cmd.completedAt && (
                        <span>Completed: {new Date(cmd.completedAt).toLocaleString()}</span>
                      )}
                    </div>
                    {cmd.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{cmd.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

