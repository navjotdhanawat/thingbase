import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

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

  socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      token: accessToken,
    },
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Re-connect socket when auth state changes
useAuthStore.subscribe((state, prevState) => {
  if (state.isAuthenticated && !prevState.isAuthenticated) {
    connectSocket();
  } else if (!state.isAuthenticated && prevState.isAuthenticated) {
    disconnectSocket();
  }
});


