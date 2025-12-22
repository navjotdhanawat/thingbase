'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Trash2,
  Power,
  Thermometer,
  Activity,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/app/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const alertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['device_offline', 'threshold', 'no_data']),
  metric: z.string().optional(),
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=']).optional(),
  threshold: z.string().optional(),
  enabled: z.boolean(),
});

type AlertRuleForm = z.infer<typeof alertRuleSchema>;

function AlertStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }> = {
    active: { variant: 'destructive', className: 'bg-red-500' },
    acknowledged: { variant: 'secondary', className: 'bg-yellow-500 text-white' },
    resolved: { variant: 'outline', className: '' },
  };

  const { variant, className } = variants[status] || { variant: 'default' as const, className: '' };

  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {status}
    </Badge>
  );
}

function AlertTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'device_offline':
      return <Power className="h-4 w-4 text-red-500" />;
    case 'threshold':
      return <Thermometer className="h-4 w-4 text-orange-500" />;
    case 'no_data':
      return <Activity className="h-4 w-4 text-purple-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
}

export default function AlertsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => api.getAlerts({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      pageSize: 50,
    }),
  });

  const { data: rules, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => api.getAlertRules({ pageSize: 50 }),
  });

  const { data: activeCount } = useQuery({
    queryKey: ['active-alerts-count'],
    queryFn: () => api.getActiveAlertsCount(),
    refetchInterval: 30000,
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: AlertRuleForm) => {
      let condition: Record<string, unknown> = {};
      if (data.type === 'threshold') {
        condition = {
          metric: data.metric,
          operator: data.operator,
          value: parseFloat(data.threshold || '0'),
        };
      }
      return api.createAlertRule({
        name: data.name,
        type: data.type,
        condition,
        enabled: data.enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast.success('Alert rule created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create rule');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) =>
      api.updateAlertRule(ruleId, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => api.deleteAlertRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Rule deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete rule');
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => api.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts-count'] });
      toast.success('Alert acknowledged');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => api.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts-count'] });
      toast.success('Alert resolved');
    },
  });

  const createForm = useForm<AlertRuleForm>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: {
      name: '',
      type: 'threshold',
      metric: 'temperature',
      operator: '>',
      threshold: '',
      enabled: true,
    },
  });

  const selectedType = createForm.watch('type');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Monitor and manage alerts for your devices"
        actions={
          isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={createForm.handleSubmit((data) => createRuleMutation.mutate(data))}>
                  <DialogHeader>
                    <DialogTitle>Create Alert Rule</DialogTitle>
                    <DialogDescription>
                      Set up a new alert rule to monitor your devices
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        placeholder="High Temperature Alert"
                        {...createForm.register('name')}
                      />
                      {createForm.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {createForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Alert Type</Label>
                      <Select
                        value={selectedType}
                        onValueChange={(value) => createForm.setValue('type', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="threshold">Threshold</SelectItem>
                          <SelectItem value="device_offline">Device Offline</SelectItem>
                          <SelectItem value="no_data">No Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedType === 'threshold' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="metric">Metric</Label>
                          <Select
                            value={createForm.watch('metric') || 'temperature'}
                            onValueChange={(value) => createForm.setValue('metric', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="temperature">Temperature</SelectItem>
                              <SelectItem value="humidity">Humidity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="operator">Condition</Label>
                            <Select
                              value={createForm.watch('operator') || '>'}
                              onValueChange={(value) => createForm.setValue('operator', value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value=">">&gt; Greater than</SelectItem>
                                <SelectItem value="<">&lt; Less than</SelectItem>
                                <SelectItem value=">=">&gt;= Greater or equal</SelectItem>
                                <SelectItem value="<=">&lt;= Less or equal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="threshold">Threshold</Label>
                            <Input
                              id="threshold"
                              type="number"
                              placeholder="30"
                              {...createForm.register('threshold')}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enabled"
                        checked={createForm.watch('enabled')}
                        onCheckedChange={(checked) => createForm.setValue('enabled', checked)}
                      />
                      <Label htmlFor="enabled">Enabled</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createRuleMutation.isPending}>
                      {createRuleMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Rule
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Bell className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{activeCount?.count ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{rules?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Activity className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['all', 'active', 'acknowledged', 'resolved'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchAlerts()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {alertsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : alerts?.items && alerts.items.length > 0 ? (
                <div className="space-y-3">
                  {alerts.items.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        alert.status === 'active' && 'bg-red-50 border-red-200 dark:bg-red-950/20'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <AlertTypeIcon type={alert.ruleType} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.ruleName}</span>
                            <AlertStatusBadge status={alert.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Triggered {new Date(alert.triggeredAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeMutation.mutate(alert.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              Acknowledge
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => resolveMutation.mutate(alert.id)}
                              disabled={resolveMutation.isPending}
                            >
                              Resolve
                            </Button>
                          </>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            disabled={resolveMutation.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    {statusFilter === 'all'
                      ? 'No alerts have been triggered yet'
                      : `No ${statusFilter} alerts`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => refetchRules()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {rulesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : rules?.items && rules.items.length > 0 ? (
                <div className="space-y-3">
                  {rules.items.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <AlertTypeIcon type={rule.type} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            <Badge variant="outline" className="capitalize">
                              {rule.type.replace('_', ' ')}
                            </Badge>
                            {!rule.enabled && (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rule.type === 'threshold' && (
                              <>
                                {(rule.condition as any).metric}{' '}
                                {(rule.condition as any).operator}{' '}
                                {(rule.condition as any).value}
                              </>
                            )}
                            {rule.type === 'device_offline' && 'Triggered when device goes offline'}
                            {rule.type === 'no_data' && 'Triggered when no data is received'}
                            {' • '}{rule.alertCount} alerts triggered
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) =>
                              toggleRuleMutation.mutate({ ruleId: rule.id, enabled: checked })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this rule?')) {
                                deleteRuleMutation.mutate(rule.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No alert rules</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a rule to start monitoring your devices
                  </p>
                  {isAdmin && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Rule
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

