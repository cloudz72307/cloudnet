// vite-ws-server.ts
import { WebSocketServer } from "ws";

export function createWebSocketServer(httpServer: any) {
  if (!httpServer) {
    console.warn("[CloudNET] No HTTP server available for WebSocket.");
    return;
  }

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", ws => {
    ws.on("message", data => {
      // Broadcast raw message to all connected clients
      for (const client of wss.clients) {
        if ((client as any).readyState === 1) {
          (client as any).send(data.toString());
        }
      }
    });
  });

  console.log("[CloudNET] WebSocket server attached to Vite dev server");
}
