'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

interface DeviceUpdate {
  type: string;
  deviceId: string;
  data?: Record<string, unknown>;
  state?: Record<string, unknown>;
  online?: boolean;
  timestamp: string;
}

interface CommandUpdate {
  type: string;
  commandId: string;
  status: string;
  errorMessage?: string;
  timestamp: string;
}

export function useDeviceUpdates(deviceId?: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const handleDeviceUpdate = useCallback(
    (update: DeviceUpdate) => {
      // Invalidate device queries to refetch data
      if (deviceId && update.deviceId === deviceId) {
        queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
        queryClient.invalidateQueries({ queryKey: ['device', deviceId, 'state'] });
      }
      
      // Always invalidate the devices list
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    [queryClient, deviceId]
  );

  const handleCommandUpdate = useCallback(
    (update: CommandUpdate) => {
      // Invalidate command queries
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      queryClient.invalidateQueries({ queryKey: ['command', update.commandId] });
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket() || connectSocket();

    // Subscribe to device-specific updates
    if (deviceId) {
      socket.emit('subscribe:device', deviceId);
    }

    // Listen for various event types
    socket.on('device:telemetry', handleDeviceUpdate);
    socket.on('device:status', handleDeviceUpdate);
    socket.on('device:state', handleDeviceUpdate);
    socket.on('command:ack', handleCommandUpdate);
    socket.on('command:update', handleCommandUpdate);
    socket.on('command:timeout', handleCommandUpdate);

    return () => {
      if (deviceId) {
        socket.emit('unsubscribe:device', deviceId);
      }
      
      socket.off('device:telemetry', handleDeviceUpdate);
      socket.off('device:status', handleDeviceUpdate);
      socket.off('device:state', handleDeviceUpdate);
      socket.off('command:ack', handleCommandUpdate);
      socket.off('command:update', handleCommandUpdate);
      socket.off('command:timeout', handleCommandUpdate);
    };
  }, [isAuthenticated, deviceId, handleDeviceUpdate, handleCommandUpdate]);
}


