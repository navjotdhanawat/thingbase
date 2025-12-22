import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

// Event types for type safety
export interface DeviceTelemetryEvent {
  type: 'device:telemetry';
  deviceId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface DeviceStateEvent {
  type: 'device:state';
  deviceId: string;
  state: Record<string, unknown>;
}

export interface DeviceStatusEvent {
  type: 'device:status';
  deviceId: string;
  online: boolean;
  timestamp: string;
}

export interface CommandAckEvent {
  type: 'command:ack';
  deviceId: string;
  correlationId: string;
  status: 'success' | 'error';
  error?: string;
  state?: Record<string, unknown>;
  timestamp: string;
}

export interface DevicesInitEvent {
  devices: Array<{
    id: string;
    name: string;
    status: string;
    lastSeen: string;
  }>;
  states: Record<string, unknown>;
}

export interface SendCommandResponse {
  success: boolean;
  commandId?: string;
  correlationId?: string;
  error?: string;
}

export type DeviceEvent = DeviceTelemetryEvent | DeviceStateEvent | DeviceStatusEvent | CommandAckEvent;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const accessToken = useAuthStore.getState().accessToken;

  if (!accessToken) {
    throw new Error('No access token available');
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  socket = io(`${baseUrl}/devices`, {
    transports: ['websocket', 'polling'],
    auth: {
      token: accessToken,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 WebSocket connection error:', error);
  });

  socket.on('error', (error) => {
    console.error('🔌 WebSocket error:', error);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to a specific device's updates
 */
export function subscribeToDevice(deviceId: string): void {
  if (!socket?.connected) {
    console.warn('Socket not connected, cannot subscribe to device');
    return;
  }
  socket.emit('subscribe:device', deviceId);
}

/**
 * Unsubscribe from a device's updates
 */
export function unsubscribeFromDevice(deviceId: string): void {
  if (!socket?.connected) return;
  socket.emit('unsubscribe:device', deviceId);
}

/**
 * Send a command to a device
 * Returns a promise that resolves with the command response
 */
export function sendCommand(
  deviceId: string,
  action: string,
  params?: Record<string, unknown>
): Promise<SendCommandResponse> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      resolve({ success: false, error: 'Not connected to server' });
      return;
    }

    // Set timeout for command response
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Command timed out' });
    }, 15000);

    socket.emit('send:command', { deviceId, action, params }, (response: SendCommandResponse) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

/**
 * Listen for device telemetry events
 */
export function onDeviceTelemetry(callback: (data: DeviceTelemetryEvent) => void): () => void {
  if (!socket) return () => { };
  socket.on('device:telemetry', callback);
  return () => socket?.off('device:telemetry', callback);
}

/**
 * Listen for device state events
 */
export function onDeviceState(callback: (data: DeviceStateEvent) => void): () => void {
  if (!socket) return () => { };
  socket.on('device:state', callback);
  return () => socket?.off('device:state', callback);
}

/**
 * Listen for device status events (online/offline)
 */
export function onDeviceStatus(callback: (data: DeviceStatusEvent) => void): () => void {
  if (!socket) return () => { };
  socket.on('device:status', callback);
  return () => socket?.off('device:status', callback);
}

/**
 * Listen for command acknowledgements
 */
export function onCommandAck(callback: (data: CommandAckEvent) => void): () => void {
  if (!socket) return () => { };
  socket.on('command:ack', callback);
  return () => socket?.off('command:ack', callback);
}

/**
 * Listen for initial device data on connect
 */
export function onDevicesInit(callback: (data: DevicesInitEvent) => void): () => void {
  if (!socket) return () => { };
  socket.on('devices:init', callback);
  return () => socket?.off('devices:init', callback);
}

// Re-connect socket when auth state changes
useAuthStore.subscribe((state, prevState) => {
  if (state.isAuthenticated && !prevState.isAuthenticated) {
    connectSocket();
  } else if (!state.isAuthenticated && prevState.isAuthenticated) {
    disconnectSocket();
  }
});
