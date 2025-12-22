'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subHours } from 'date-fns';
import {
  ScrollText,
  RefreshCw,
  Filter,
  Download,
  User,
  Calendar,
  ChevronRight,
  Cpu,
  Users,
  Terminal,
  Settings,
  Shield,
  Bell,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/app/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

function getActionIcon(action: string) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('device')) return Cpu;
  if (actionLower.includes('user') || actionLower.includes('invite')) return Users;
  if (actionLower.includes('command')) return Terminal;
  if (actionLower.includes('alert')) return Bell;
  if (actionLower.includes('setting')) return Settings;
  if (actionLower.includes('auth') || actionLower.includes('login')) return Shield;
  return ScrollText;
}

function getActionColor(action: string) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('create') || actionLower.includes('add')) return 'bg-green-500';
  if (actionLower.includes('delete') || actionLower.includes('remove')) return 'bg-red-500';
  if (actionLower.includes('update') || actionLower.includes('edit')) return 'bg-blue-500';
  if (actionLower.includes('login') || actionLower.includes('auth')) return 'bg-purple-500';
  if (actionLower.includes('failed') || actionLower.includes('error')) return 'bg-red-500';
  return 'bg-gray-500';
}

export default function AuditPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');

  const getTimeWindow = () => {
    const endTime = new Date();
    let startTime: Date | undefined;

    switch (timeRange) {
      case '1h':
        startTime = subHours(endTime, 1);
        break;
      case '24h':
        startTime = subHours(endTime, 24);
        break;
      case '7d':
        startTime = subDays(endTime, 7);
        break;
      case '30d':
        startTime = subDays(endTime, 30);
        break;
      case 'all':
        startTime = undefined;
        break;
    }

    return { startTime: startTime?.toISOString(), endTime: endTime.toISOString() };
  };

  const { startTime, endTime } = getTimeWindow();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', timeRange, actionFilter, resourceTypeFilter],
    queryFn: () =>
      api.getAuditLogs({
        startTime,
        endTime,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        resourceType: resourceTypeFilter !== 'all' ? resourceTypeFilter : undefined,
        pageSize: 100,
      }),
  });

  const { data: actions } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => api.getAuditActions(),
  });

  const { data: resourceTypes } = useQuery({
    queryKey: ['audit-resource-types'],
    queryFn: () => api.getAuditResourceTypes(),
  });

  const handleExport = () => {
    if (!logs?.items) return;

    const csvContent = [
      ['Date', 'Action', 'Resource Type', 'Resource ID', 'User', 'Details'].join(','),
      ...logs.items.map((log) =>
        [
          format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          log.action,
          log.resourceType || '-',
          log.resourceId || '-',
          log.user?.email || 'System',
          JSON.stringify(log.metadata).replace(/,/g, ';'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all activities in your organization"
        actions={
          <Button variant="outline" onClick={handleExport} disabled={!logs?.items?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions?.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resourceTypes?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {(actionFilter !== 'all' || resourceTypeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter('all');
                  setResourceTypeFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Activity Timeline
            {logs && (
              <Badge variant="secondary" className="ml-2">
                {logs.total} events
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs?.items && logs.items.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {logs.items.map((log, index) => {
                  const Icon = getActionIcon(log.action);
                  const color = getActionColor(log.action);

                  return (
                    <div key={log.id} className="relative flex gap-4 pl-12">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'absolute left-3 h-4 w-4 rounded-full border-2 border-background',
                          color
                        )}
                      />

                      <div className="flex-1 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-lg',
                                'bg-muted'
                              )}
                            >
                              <Icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{log.action}</span>
                                {log.resourceType && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.resourceType}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                {log.user ? (
                                  <>
                                    <User className="h-3 w-3" />
                                    <span>{log.user.name || log.user.email}</span>
                                  </>
                                ) : (
                                  <span>System</span>
                                )}
                                <span>•</span>
                                <span>
                                  {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                                </span>
                              </div>
                              {log.resourceId && (
                                <p className="text-xs text-muted-foreground mt-1 font-mono">
                                  Resource: {log.resourceId}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>

                        {/* Metadata preview */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <details className="group">
                              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No audit logs</h3>
              <p className="text-sm text-muted-foreground">
                {actionFilter !== 'all' || resourceTypeFilter !== 'all'
                  ? 'No events match the current filters'
                  : 'No activities have been recorded yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
