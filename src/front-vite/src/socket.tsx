import io from 'socket.io-client';

const SOCKET_URL: string = import.meta.env.ORIGIN_URL_WEBSOCKET || 'http://localhost.codam.nl:3001';

export const socket = io(SOCKET_URL, {
  withCredentials: true,
});