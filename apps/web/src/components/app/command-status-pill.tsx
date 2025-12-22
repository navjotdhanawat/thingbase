'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Check, AlertCircle, Send, Timer, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type CommandStatus = 'pending' | 'sent' | 'acked' | 'failed' | 'timeout';

const statusConfig: Record<CommandStatus, { variant: 'warning' | 'default' | 'success' | 'destructive'; label: string; icon: typeof Clock }> = {
  pending: { variant: 'warning', label: 'Pending', icon: Clock },
  sent: { variant: 'default', label: 'Sent', icon: Send },
  acked: { variant: 'success', label: 'Acknowledged', icon: Check },
  failed: { variant: 'destructive', label: 'Failed', icon: AlertCircle },
  timeout: { variant: 'destructive', label: 'Timeout', icon: Timer },
};

interface CommandStatusPillProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

export function CommandStatusPill({ status, showIcon = true, className }: CommandStatusPillProps) {
  const normalizedStatus = (status?.toLowerCase() || 'pending') as CommandStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

