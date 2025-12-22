'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subHours, subDays } from 'date-fns';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Activity, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelemetryChartProps {
  deviceId: string;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

const TIME_RANGES: { value: TimeRange; label: string; interval: '1m' | '5m' | '1h' | '1d' }[] = [
  { value: '1h', label: '1 Hour', interval: '1m' },
  { value: '6h', label: '6 Hours', interval: '5m' },
  { value: '24h', label: '24 Hours', interval: '1h' },
  { value: '7d', label: '7 Days', interval: '1d' },
];

// Default colors for fields without explicit colors
const DEFAULT_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899',
  '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#f59e0b',
];

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  unit?: string;
  icon?: string;
  color?: string;
  chartType?: string;
  showInChart?: boolean;
  showInStats?: boolean;
}

export function TelemetryChart({ deviceId }: TelemetryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());

  const selectedRange = TIME_RANGES.find((r) => r.value === timeRange)!;

  const { startTime, endTime } = useMemo(() => {
    const end = new Date();
    let start: Date;

    switch (timeRange) {
      case '1h':
        start = subHours(end, 1);
        break;
      case '6h':
        start = subHours(end, 6);
        break;
      case '24h':
        start = subHours(end, 24);
        break;
      case '7d':
        start = subDays(end, 7);
        break;
      default:
        start = subHours(end, 24);
    }

    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }, [timeRange]);

  // Fetch schema for field definitions
  const { data: schemaData } = useQuery({
    queryKey: ['telemetry-schema', deviceId],
    queryFn: () => api.getTelemetrySchema(deviceId),
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['telemetry', deviceId, timeRange],
    queryFn: () =>
      api.getTelemetry(deviceId, {
        startTime,
        endTime,
        interval: selectedRange.interval,
      }),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['telemetry-stats', deviceId, timeRange],
    queryFn: () => api.getTelemetryStats(deviceId, { startTime, endTime }),
  });

  // Get field configurations from schema or discovered fields
  const fieldConfigs: FieldConfig[] = useMemo(() => {
    if (schemaData?.schema?.fields) {
      return schemaData.schema.fields;
    }
    if (schemaData?.discovered) {
      return schemaData.discovered;
    }
    // Fallback: discover from stats
    if (stats?.fields) {
      return Object.keys(stats.fields).map((key, index) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'number',
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
    }
    return [];
  }, [schemaData, stats]);

  // Filter to only numeric fields for charting
  const numericFields = useMemo(() => {
    return fieldConfigs.filter(
      (f) => f.type === 'number' && f.showInChart !== false
    );
  }, [fieldConfigs]);

  // Define type for aggregated telemetry items
  interface AggregatedItem {
    bucket?: string;
    timestamp?: string;
    fields?: Record<string, { avg: number; min: number; max: number }>;
    data?: Record<string, unknown>;
  }

  // Transform data for charting
  const chartData = useMemo(() => {
    if (!data?.items) return [];

    return data.items.map((item) => {
      const aggregatedItem = item as AggregatedItem;
      const timestamp = aggregatedItem.bucket || item.timestamp;
      const point: Record<string, unknown> = {
        time: timestamp ? format(new Date(timestamp), 'MMM dd HH:mm') : '',
        fullTime: timestamp,
      };

      // Handle aggregated data (has fields object)
      if (aggregatedItem.fields) {
        for (const field of numericFields) {
          const fieldData = aggregatedItem.fields[field.key];
          if (fieldData) {
            point[field.key] = fieldData.avg;
          }
        }
      } else if (item.data) {
        // Handle raw data
        const rawData = item.data as Record<string, unknown>;
        const nestedData = (rawData.data as Record<string, unknown>) || rawData;
        
        for (const field of numericFields) {
          const value = nestedData[field.key];
          if (typeof value === 'number') {
            point[field.key] = value;
          }
        }
      }

      return point;
    });
  }, [data, numericFields]);

  const toggleField = (key: string) => {
    setHiddenFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visibleFields = numericFields.filter((f) => !hiddenFields.has(f.key));

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))
        ) : stats?.fields && Object.keys(stats.fields).length > 0 ? (
          Object.entries(stats.fields)
            .filter(([key]) => {
              const config = fieldConfigs.find((f) => f.key === key);
              return config?.showInStats !== false;
            })
            .slice(0, 4)
            .map(([key, fieldStats]) => {
              const config = fieldConfigs.find((f) => f.key === key);
              const colorIndex = fieldConfigs.findIndex((f) => f.key === key);
              const color = config?.color || DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];

              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Activity className="h-5 w-5" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {config?.label || key}
                        </p>
                        <p className="text-2xl font-bold">
                          {fieldStats.avg.toFixed(1)}
                          {config?.unit && (
                            <span className="text-sm font-normal ml-1">
                              {config.unit}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fieldStats.min.toFixed(0)} - {fieldStats.max.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-5 w-5 mr-2" />
              No telemetry data available
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Telemetry Data</CardTitle>
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <div className="flex rounded-lg border p-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'px-3 h-7',
                    timeRange === range.value && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setTimeRange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Auto-refresh Toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', autoRefresh && 'animate-spin')}
              />
              Auto
            </Button>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefetching && 'animate-spin')}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Field Toggle */}
          {numericFields.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {numericFields.map((field, index) => {
                const color = field.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                const isHidden = hiddenFields.has(field.key);
                
                return (
                  <Badge
                    key={field.key}
                    variant={isHidden ? 'outline' : 'default'}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: isHidden ? 'transparent' : `${color}20`,
                      color: isHidden ? undefined : color,
                      borderColor: color,
                    }}
                    onClick={() => toggleField(field.key)}
                  >
                    {isHidden ? (
                      <EyeOff className="h-3 w-3 mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    {field.label}
                    {field.unit && ` (${field.unit})`}
                  </Badge>
                );
              })}
            </div>
          )}

          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center flex-col gap-2 text-muted-foreground">
              <Activity className="h-12 w-12 opacity-50" />
              <p>No telemetry data available for this time range</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                {/* Create a Y-axis for the first visible field */}
                {visibleFields.length > 0 && (
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{ fontSize: 12 }}
                    label={
                      visibleFields[0]?.unit
                        ? {
                            value: visibleFields[0].unit,
                            angle: -90,
                            position: 'insideLeft',
                            className: 'fill-muted-foreground',
                          }
                        : undefined
                    }
                  />
                )}
                {/* Create a second Y-axis if we have different units */}
                {visibleFields.length > 1 && visibleFields[0]?.unit !== visibleFields[1]?.unit && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={
                      visibleFields[1]?.unit
                        ? {
                            value: visibleFields[1].unit,
                            angle: 90,
                            position: 'insideRight',
                            className: 'fill-muted-foreground',
                          }
                        : undefined
                    }
                  />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend />
                {visibleFields.map((field, index) => {
                  const color = field.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                  // Use right axis for second field with different unit
                  const yAxisId = index === 0 ? 'left' : 
                    (visibleFields[0]?.unit !== field.unit ? 'right' : 'left');
                  
                  return (
                    <Line
                      key={field.key}
                      yAxisId={yAxisId}
                      type="monotone"
                      dataKey={field.key}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      name={`${field.label}${field.unit ? ` (${field.unit})` : ''}`}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
