import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/duel.types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let currentToken: string | null = null;

export function getDuelSocket(
  token: string,
): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket && socket.connected && currentToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const wsUrl = import.meta.env.VITE_API_BASE_URL_WS ?? import.meta.env.VITE_API_BASE_URL;

  socket = io(`${wsUrl}/duels`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  currentToken = token;
  return socket;
}

export function disconnectDuelSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}
