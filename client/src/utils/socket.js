import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      if (userId) {
        this.socket.emit('register-user', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Re-attach all listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    console.log('🔌 Socket emit attempt:', event, 'connected:', this.socket?.connected);
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      console.log('✅ Socket emit successful:', event);
    } else {
      console.error('❌ Socket not connected, cannot emit:', event);
    }
  }

  // WebRTC signaling methods
  callUser(to, offer, from) {
    console.log('📞 SOCKET: Calling user', { to, offer, from });
    this.emit('call-user', { to, offer, from });
  }

  acceptCall(to, answer) {
    this.emit('call-accepted', { to, answer });
  }

  sendIceCandidate(to, candidate) {
    this.emit('ice-candidate', { to, candidate });
  }

  endCall(to) {
    this.emit('end-call', { to });
  }

  rejectCall(to) {
    this.emit('call-rejected', { to });
  }
}

export const socket = new SocketClient();
