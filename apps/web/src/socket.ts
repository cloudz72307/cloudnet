import { io, Socket } from "socket.io-client";
import { Message } from "./types";
import { getTokenForSocket } from "./tokenForSocket";

export type SocketEvents = {
  onMessage?: (msg: Message) => void;
};

let socket: Socket | null = null;

export function getSocket(events?: SocketEvents): Socket {
  if (socket) return socket;

  socket = io("", {
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    const token = getTokenForSocket();
    if (token) {
      socket!.emit("auth", { token });
    }
  });

  if (events?.onMessage) {
    socket.on("message", events.onMessage);
  }

  return socket;
}

export function joinChat(chatId: string) {
  if (!socket) return;
  socket.emit("join", chatId);
}

export function leaveChat(chatId: string) {
  if (!socket) return;
  socket.emit("leave", chatId);
}

export function sendSocketMessage(chatId: string, content: string) {
  if (!socket) return;
  socket.emit("send", { chatId, content });
}
