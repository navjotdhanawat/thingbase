'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getSocket,
  connectSocket,
  subscribeToDevice,
  unsubscribeFromDevice,
  onDeviceTelemetry,
  onDeviceState,
  onDeviceStatus,
  onCommandAck,
  DeviceTelemetryEvent,
  DeviceStateEvent,
  DeviceStatusEvent,
  CommandAckEvent,
} from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

interface DeviceRealtimeState {
  data: Record<string, unknown>;
  online: boolean;
  lastUpdate: string | null;
  isConnected: boolean;
}

interface CommandUpdate {
  type: string;
  commandId: string;
  status: string;
  errorMessage?: string;
  timestamp: string;
}

/**
 * Hook for real-time device updates
 * Provides live telemetry data and connection status
 */
export function useDeviceRealtime(deviceId: string) {
  const { isAuthenticated } = useAuthStore();
  const [state, setState] = useState<DeviceRealtimeState>({
    data: {},
    online: false,
    lastUpdate: null,
    isConnected: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !deviceId) return;

    let mounted = true;
    const socket = getSocket() || connectSocket();

    // Track connection status
    const updateConnectionStatus = () => {
      if (mounted) {
        setState(prev => ({ ...prev, isConnected: socket.connected }));
      }
    };

    socket.on('connect', updateConnectionStatus);
    socket.on('disconnect', updateConnectionStatus);
    updateConnectionStatus();

    // Subscribe to this device's updates
    subscribeToDevice(deviceId);

    // Handle telemetry updates
    const handleTelemetry = (event: DeviceTelemetryEvent) => {
      if (event.deviceId !== deviceId || !mounted) return;

      setState(prev => ({
        ...prev,
        data: { ...prev.data, ...event.data },
        lastUpdate: event.timestamp,
        online: true,
      }));
    };

    // Handle state updates
    const handleState = (event: DeviceStateEvent) => {
      if (event.deviceId !== deviceId || !mounted) return;

      setState(prev => ({
        ...prev,
        data: event.state,
        lastUpdate: new Date().toISOString(),
      }));
    };

    // Handle status updates
    const handleStatus = (event: DeviceStatusEvent) => {
      if (event.deviceId !== deviceId || !mounted) return;

      setState(prev => ({
        ...prev,
        online: event.online,
        lastUpdate: event.timestamp,
      }));
    };

    // Handle command acknowledgements (may contain state updates)
    const handleCommandAck = (event: CommandAckEvent) => {
      if (event.deviceId !== deviceId || !mounted || !event.state) return;

      setState(prev => ({
        ...prev,
        data: { ...prev.data, ...event.state },
        lastUpdate: event.timestamp,
      }));
    };

    const unsubTelemetry = onDeviceTelemetry(handleTelemetry);
    const unsubState = onDeviceState(handleState);
    const unsubStatus = onDeviceStatus(handleStatus);
    const unsubCommandAck = onCommandAck(handleCommandAck);

    return () => {
      mounted = false;
      unsubscribeFromDevice(deviceId);
      unsubTelemetry();
      unsubState();
      unsubStatus();
      unsubCommandAck();
      socket.off('connect', updateConnectionStatus);
      socket.off('disconnect', updateConnectionStatus);
    };
  }, [isAuthenticated, deviceId]);

  return state;
}

/**
 * Hook for general device list updates (invalidates queries on changes)
 */
export function useDeviceUpdates(deviceId?: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const handleDeviceUpdate = useCallback(
    (update: DeviceTelemetryEvent | DeviceStatusEvent) => {
      // Only invalidate queries for status changes (online/offline)
      // Telemetry and state updates are handled in real-time by useDeviceRealtime
      // without needing to refetch from REST API
      if ('online' in update) {
        // This is a DeviceStatusEvent - refetch device info for status change
        if (deviceId && update.deviceId === deviceId) {
          queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
        }
        // Invalidate the devices list for status changes
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      }
      // Note: We do NOT invalidate on telemetry events since useDeviceRealtime
      // already handles those via WebSocket without needing REST API calls
    },
    [queryClient, deviceId]
  );

  const handleCommandUpdate = useCallback(
    (update: CommandUpdate | CommandAckEvent) => {
      // Invalidate command queries
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      if ('commandId' in update) {
        queryClient.invalidateQueries({ queryKey: ['command', update.commandId] });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket() || connectSocket();

    // Subscribe to device-specific updates
    if (deviceId) {
      subscribeToDevice(deviceId);
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
        unsubscribeFromDevice(deviceId);
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

/**
 * Hook for tracking WebSocket connection status
 */
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setIsConnected(false);
      return;
    }

    const socket = getSocket() || connectSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [isAuthenticated]);

  return isConnected;
}
