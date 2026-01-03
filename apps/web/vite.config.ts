// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createWebSocketServer } from "./vite-ws-server";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "cloudnet-ws-plugin",
      configureServer(server) {
        // Attach WebSocket server to Vite’s HTTP server
        createWebSocketServer(server.httpServer);
      }
    }
  ]
});
