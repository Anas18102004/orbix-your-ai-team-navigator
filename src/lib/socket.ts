import { io, Socket } from 'socket.io-client';

// Use window location for socket connection (same origin) or explicit URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin.replace(':8080', ':3000') : 'http://localhost:3000');

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('workspace:join', workspaceId);
    }
  }

  leaveWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('workspace:leave', workspaceId);
    }
  }

  joinChannel(workspaceId: string, channelId: string) {
    if (this.socket) {
      this.socket.emit('channel:join', { workspaceId, channelId });
    }
  }

  leaveChannel(workspaceId: string, channelId: string) {
    if (this.socket) {
      this.socket.emit('channel:leave', { workspaceId, channelId });
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketClient = new SocketClient();

