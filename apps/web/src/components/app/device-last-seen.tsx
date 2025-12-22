'use client';

import { formatDistanceToNow, format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DeviceLastSeenProps {
  lastSeen?: string | Date | null;
  showTooltip?: boolean;
  className?: string;
}

export function DeviceLastSeen({ lastSeen, showTooltip = true, className }: DeviceLastSeenProps) {
  if (!lastSeen) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        Never connected
      </span>
    );
  }

  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });
  const absoluteTime = format(date, 'PPpp');

  if (!showTooltip) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {relativeTime}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('text-sm text-muted-foreground cursor-help', className)}>
            {relativeTime}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{absoluteTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

