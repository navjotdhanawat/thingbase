'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type DeviceStatus = 'online' | 'offline' | 'provisioned' | 'pending' | 'error';

const statusConfig: Record<DeviceStatus, { variant: 'success' | 'secondary' | 'default' | 'warning' | 'destructive'; label: string }> = {
  online: { variant: 'success', label: 'Online' },
  offline: { variant: 'secondary', label: 'Offline' },
  provisioned: { variant: 'default', label: 'Provisioned' },
  pending: { variant: 'warning', label: 'Pending' },
  error: { variant: 'destructive', label: 'Error' },
};

interface DeviceStatusPillProps {
  status: string;
  showDot?: boolean;
  className?: string;
}

export function DeviceStatusPill({ status, showDot = true, className }: DeviceStatusPillProps) {
  const normalizedStatus = (status?.toLowerCase() || 'offline') as DeviceStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.offline;

  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            config.variant === 'success' && 'bg-success',
            config.variant === 'secondary' && 'bg-muted-foreground',
            config.variant === 'default' && 'bg-primary',
            config.variant === 'warning' && 'bg-warning',
            config.variant === 'destructive' && 'bg-destructive'
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

