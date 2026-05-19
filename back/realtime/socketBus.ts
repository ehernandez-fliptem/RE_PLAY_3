import type { Server as SocketServer } from "socket.io";

let ioRef: SocketServer | null = null;

export function setSocketServer(io: SocketServer) {
  ioRef = io;
}

export function getSocketServer() {
  return ioRef;
}

export function emitSocketEvent(event: string, payload: any) {
  if (!ioRef) return;
  ioRef.emit(event, payload);
}

