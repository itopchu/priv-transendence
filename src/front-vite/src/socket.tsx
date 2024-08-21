import io from 'socket.io-client';

const SOCKET_URL: string = import.meta.env.ORIGIN_URL_WEBSOCKET || 'http://localhost.codam.nl:3001';

console.log('SOCKET_URL:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
  withCredentials: true,
});