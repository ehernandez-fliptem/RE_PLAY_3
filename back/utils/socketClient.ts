import io from 'socket.io-client';
import { CONFIG } from '../config';

const URL = CONFIG.ENDPOINT;

export const socket = io(URL, {
  auth: {
    token: CONFIG.SECRET_TOKEN_SOCKET
  },
  transports: ['websocket'],
  rejectUnauthorized: false
});

// Manejar eventos de conexión
socket.on('connect', () => {
  console.log(`Conectado al servidor Socket.IO: ${URL}`);
});

socket.on('disconnect', (reason: string) => {
  console.log(`Desconectado del servidor: ${reason}`);
});

socket.on('connect_error', (error: Error) => {
  console.error(`Error de conexión: ${error.message}`);
});