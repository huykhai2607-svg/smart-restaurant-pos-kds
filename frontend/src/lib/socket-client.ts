'use client';

import { io, Socket } from 'socket.io-client';

function resolveSocketUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
  ).replace(/\/+$/, '');
  // Tự động nâng cấp http:// -> https:// nếu trang đang chạy trên HTTPS (chống Mixed Content)
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    raw.startsWith('http://') &&
    !raw.includes('localhost') &&
    !raw.includes('127.0.0.1')
  ) {
    return raw.replace(/^http:\/\//, 'https://');
  }
  return raw;
}

class SocketService {
  private socket: Socket | null = null;
  private currentRooms: Set<string> = new Set();

  public getSocket(): Socket {
    if (!this.socket && typeof window !== 'undefined') {
      const socketUrl = resolveSocketUrl();
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('⚡ Socket connected to backend:', this.socket?.id);
        // Tự động gia nhập lại các rooms sau khi reconnect
        this.rejoinRooms();
      });

      this.socket.on('connect_error', (error) => {
        console.warn('⚠️ Socket connection error:', error.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
      });
    }

    return this.socket as Socket;
  }

  private rejoinRooms() {
    if (!this.socket || !this.socket.connected) return;
    for (const roomDesc of this.currentRooms) {
      const [type, p1, p2] = roomDesc.split(':');
      if (type === 'pos') this.socket.emit('join:pos', { branchId: p1 });
      if (type === 'branch') this.socket.emit('join:branch', { branchId: p1 });
      if (type === 'kitchen') this.socket.emit('join:kitchen', { branchId: p1, stationId: p2 });
      if (type === 'table') this.socket.emit('join:table', { tableId: p1 });
    }
  }

  public joinPos(branchId: string) {
    this.currentRooms.add(`pos:${branchId}`);
    const socket = this.getSocket();
    if (socket?.connected) {
      socket.emit('join:pos', { branchId });
    }
  }

  public joinKitchen(branchId: string, stationId: string) {
    this.currentRooms.add(`kitchen:${branchId}:${stationId}`);
    const socket = this.getSocket();
    if (socket?.connected) {
      socket.emit('join:kitchen', { branchId, stationId });
    }
  }

  public joinTable(tableId: string) {
    this.currentRooms.add(`table:${tableId}`);
    const socket = this.getSocket();
    if (socket?.connected) {
      socket.emit('join:table', { tableId });
    }
  }

  public joinBranch(branchId: string) {
    this.currentRooms.add(`branch:${branchId}`);
    const socket = this.getSocket();
    if (socket?.connected) {
      socket.emit('join:branch', { branchId });
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRooms.clear();
    }
  }
}

export const socketService = new SocketService();

