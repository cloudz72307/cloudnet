import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

// In-memory presence + rooms
const rooms = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_room", ({ roomId, userId }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId)!.add(userId);

    io.to(roomId).emit("presence_update", {
      roomId,
      users: Array.from(rooms.get(roomId)!)
    });
  });

  socket.on("leave_room", ({ roomId, userId }) => {
    socket.leave(roomId);

    const set = rooms.get(roomId);
    if (set) {
      set.delete(userId);
      io.to(roomId).emit("presence_update", {
        roomId,
        users: Array.from(set)
      });
    }
  });

  socket.on("send_message", (payload) => {
    const { roomId } = payload;

    io.to(roomId).emit("message", {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    });
  });
});

// Serve frontend build
app.use(express.static(path.join(__dirname, "../../web/dist")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../web/dist/index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`CloudNET API listening on port ${PORT}`);
});
