// vite-ws-server.ts
import { WebSocketServer } from "ws";

export function createWebSocketServer() {
  const wss = new WebSocketServer({ port: 5174 });

  wss.on("connection", ws => {
    ws.on("message", data => {
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          client.send(data.toString());
        }
      }
    });
  });

  console.log("[CloudNET] WebSocket server running on ws://localhost:5174");
}
