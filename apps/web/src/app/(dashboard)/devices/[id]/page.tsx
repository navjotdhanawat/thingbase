'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Power,
  PowerOff,
  RefreshCw,
  Send,
  Settings,
  RotateCcw,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceStatusPill } from '@/components/app/device-status-pill';
import { DeviceLastSeen } from '@/components/app/device-last-seen';
import { CommandStatusPill } from '@/components/app/command-status-pill';
import { TelemetryChart } from '@/components/app/telemetry-chart';
import { useDeviceUpdates, useDeviceRealtime, useSocketConnection } from '@/hooks/use-device-updates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const commandSchema = z.object({
  type: z.string().min(1, 'Command type is required'),
  payload: z.string().optional(),
});

type CommandForm = z.infer<typeof commandSchema>;

interface Device {
  id: string;
  name: string;
  externalId?: string;
  status: string;
  lastSeen?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

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

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deviceId } = use(params);
  const queryClient = useQueryClient();
  const [activeQuickCommand, setActiveQuickCommand] = useState<string | null>(null);

  // Real-time WebSocket connection status
  const isSocketConnected = useSocketConnection();

  // Real-time device state (live telemetry)
  const realtimeState = useDeviceRealtime(deviceId);

  // Also enable query invalidation for commands
  useDeviceUpdates(deviceId);

  const { data: device, isLoading: deviceLoading } = useQuery<Device>({
    queryKey: ['device', deviceId],
    queryFn: () => api.getDevice(deviceId),
  });

  const { data: apiDeviceState, isLoading: stateLoading } = useQuery({
    queryKey: ['device', deviceId, 'state'],
    queryFn: () => api.getDeviceState(deviceId),
    // No more polling - we have real-time updates!
    staleTime: Infinity,
  });

  // Merge API state with real-time state
  const deviceState = useMemo(() => {
    return {
      ...(apiDeviceState || {}),
      ...(realtimeState.data || {}),
    };
  }, [apiDeviceState, realtimeState.data]);

  const { data: commands, isLoading: commandsLoading } = useQuery<Command[]>({
    queryKey: ['commands', deviceId],
    queryFn: () => api.getCommands(deviceId),
  });

  const sendCommandMutation = useMutation({
    mutationFn: (data: { type: string; payload: Record<string, unknown> }) =>
      api.sendCommand({ deviceId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands', deviceId] });
      commandForm.reset();
      toast.success('Command sent');
      setActiveQuickCommand(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send command');
      setActiveQuickCommand(null);
    },
  });

  const retryCommandMutation = useMutation({
    mutationFn: (commandId: string) => api.retryCommand(commandId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands', deviceId] });
      toast.success('Command retried');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to retry command');
    },
  });

  const commandForm = useForm<CommandForm>({
    resolver: zodResolver(commandSchema),
    defaultValues: {
      type: '',
      payload: '',
    },
  });

  const onCommandSubmit = (data: CommandForm) => {
    let payload = {};
    try {
      payload = data.payload ? JSON.parse(data.payload) : {};
    } catch {
      toast.error('Invalid JSON payload');
      return;
    }
    sendCommandMutation.mutate({ type: data.type, payload });
  };

  const handleQuickCommand = (type: string, payload: Record<string, unknown>) => {
    setActiveQuickCommand(type);
    sendCommandMutation.mutate({ type, payload });
  };

  const isOnline = device?.status === 'online';

  if (deviceLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-semibold">Device not found</h2>
        <p className="text-muted-foreground mb-4">
          The device you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/devices">Back to Devices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/devices">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Cpu className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{device.name}</h1>
              <DeviceStatusPill status={device.status} />
              {/* Real-time connection indicator */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                  isSocketConnected
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}
                title={isSocketConnected ? "Live updates active" : "Connecting to real-time updates..."}
              >
                {isSocketConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Connecting</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>ID: {device.externalId || device.id.slice(0, 8)}</span>
              <span>•</span>
              <DeviceLastSeen lastSeen={device.lastSeen} />
              {realtimeState.lastUpdate && (
                <>
                  <span>•</span>
                  <span className="text-green-600 dark:text-green-400">
                    Last update: {new Date(realtimeState.lastUpdate).toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="telemetry">
            Telemetry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Control panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Control Panel</CardTitle>
                  <CardDescription>
                    Send quick commands to your device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={isOnline ? 'default' : 'secondary'}
                      disabled={!isOnline || sendCommandMutation.isPending}
                      onClick={() => handleQuickCommand('setPower', { power: true })}
                    >
                      {activeQuickCommand === 'setPower' && sendCommandMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4 mr-2" />
                      )}
                      Turn On
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!isOnline || sendCommandMutation.isPending}
                      onClick={() => handleQuickCommand('setPower', { power: false })}
                    >
                      {activeQuickCommand === 'setPower' && sendCommandMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <PowerOff className="h-4 w-4 mr-2" />
                      )}
                      Turn Off
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!isOnline || sendCommandMutation.isPending}
                      onClick={() => handleQuickCommand('reset', {})}
                    >
                      {activeQuickCommand === 'reset' && sendCommandMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      )}
                      Reset
                    </Button>
                  </div>
                  {!isOnline && (
                    <p className="text-sm text-muted-foreground mt-3">
                      Device is offline. Commands will be queued until the device reconnects.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Custom Command */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Custom Command</CardTitle>
                  <CardDescription>
                    Send a custom command with JSON payload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={commandForm.handleSubmit(onCommandSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="commandType">Command Type</Label>
                        <Input
                          id="commandType"
                          placeholder="e.g., setPower, setBrightness"
                          {...commandForm.register('type')}
                        />
                        {commandForm.formState.errors.type && (
                          <p className="text-sm text-destructive">
                            {commandForm.formState.errors.type.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commandPayload">Payload (JSON)</Label>
                        <Input
                          id="commandPayload"
                          placeholder='{"power": true}'
                          {...commandForm.register('payload')}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={sendCommandMutation.isPending}>
                      {sendCommandMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Command
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right column - State and history */}
            <div className="space-y-6">
              {/* Current State */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Current State</CardTitle>
                    {isSocketConnected && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live
                      </div>
                    )}
                  </div>
                  <CardDescription>
                    {isSocketConnected ? 'Real-time device telemetry' : 'Device state (shadow)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stateLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : deviceState && Object.keys(deviceState).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(deviceState).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                        >
                          <span className="text-sm font-medium">{key}</span>
                          <span className="text-sm text-muted-foreground">
                            {typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No state data available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Commands */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Commands</CardTitle>
                </CardHeader>
                <CardContent>
                  {commandsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : commands && commands.length > 0 ? (
                    <div className="space-y-3">
                      {commands.slice(0, 5).map((cmd) => (
                        <div
                          key={cmd.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {cmd.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(cmd.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CommandStatusPill status={cmd.status} />
                            {(cmd.status === 'failed' || cmd.status === 'timeout') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryCommandMutation.mutate(cmd.id)}
                                disabled={retryCommandMutation.isPending}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No commands sent yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Command History</CardTitle>
              <CardDescription>
                Complete history of commands sent to this device
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commandsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : commands && commands.length > 0 ? (
                <div className="space-y-3">
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cmd.type}</span>
                          <CommandStatusPill status={cmd.status} />
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {JSON.stringify(cmd.payload)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {new Date(cmd.createdAt).toLocaleString()}</span>
                          {cmd.sentAt && (
                            <span>Sent: {new Date(cmd.sentAt).toLocaleString()}</span>
                          )}
                          {cmd.completedAt && (
                            <span>Completed: {new Date(cmd.completedAt).toLocaleString()}</span>
                          )}
                        </div>
                        {cmd.errorMessage && (
                          <p className="text-xs text-destructive">{cmd.errorMessage}</p>
                        )}
                      </div>
                      {(cmd.status === 'failed' || cmd.status === 'timeout') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryCommandMutation.mutate(cmd.id)}
                          disabled={retryCommandMutation.isPending}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No commands sent yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-6">
          <TelemetryChart deviceId={deviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

