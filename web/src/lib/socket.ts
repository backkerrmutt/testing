import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(apiUrl: string) {
  if (!socket) socket = io(apiUrl, { withCredentials: true });
  return socket!;
}
export function getSocket() {
  if (!socket) throw new Error("Socket not initialized. Call connectSocket first.");
  return socket!;
}
