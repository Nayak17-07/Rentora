import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const serverUrl = import.meta.env?.VITE_WS_URL || (
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'
        : `${window.location.protocol}//${window.location.hostname}:8000`
    );

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Rentora Live WebSocket Server:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket:', reason);
    });
  }
  return socket;
};

export const joinAdminRoom = () => {
  const s = getSocket();
  if (s) s.emit('join:admin');
};

export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (s && userId) s.emit('join:user', userId);
};

export const joinOwnerRoom = (ownerId) => {
  const s = getSocket();
  if (s && ownerId) s.emit('join:owner', ownerId);
};
