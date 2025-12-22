'use client';

import { MoreHorizontal, Power, PowerOff, RefreshCw, Trash2, Settings, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Device {
  id: string;
  name: string;
  status: string;
}

interface DeviceQuickActionsProps {
  device: Device;
  onView?: () => void;
  onSendCommand?: (type: string, payload: Record<string, unknown>) => void;
  onDelete?: () => void;
}

export function DeviceQuickActions({
  device,
  onView,
  onSendCommand,
  onDelete,
}: DeviceQuickActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions for {device.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}
        {onSendCommand && (
          <>
            <DropdownMenuItem
              onClick={() => onSendCommand('setPower', { power: true })}
              disabled={device.status !== 'online'}
            >
              <Power className="mr-2 h-4 w-4" />
              Turn On
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSendCommand('setPower', { power: false })}
              disabled={device.status !== 'online'}
            >
              <PowerOff className="mr-2 h-4 w-4" />
              Turn Off
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSendCommand('reset', {})}
              disabled={device.status !== 'online'}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Device
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Device
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

