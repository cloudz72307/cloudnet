// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createWebSocketServer } from "./vite-ws-server";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "cloudnet-ws-plugin",
      configureServer(server) {
        if (server.httpServer) {
          createWebSocketServer(server.httpServer);
        }
      }
    }
  ]
});
