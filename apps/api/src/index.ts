import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import path from "path";
import { store } from "./store";
import { Chat, User } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

// Simple auth middleware using "Authorization: Bearer <token>"
function authFromRequest(req: express.Request): User | null {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  const token = parts[1];
  const userId = store.getUserIdFromToken(token);
  if (!userId) return null;
  return store.getUserById(userId);
}

// --- AUTH ROUTES ---

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  try {
    const user = store.createUser(username, password);
    const token = store.createTokenForUser(user.id);
    res.json({ user: { id: user.id, username: user.username }, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "registration_failed" });
  }
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  const user = store.getUserByUsername(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const token = store.createTokenForUser(user.id);
  res.json({ user: { id: user.id, username: user.username }, token });
});

app.get("/auth/me", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ user: { id: user.id, username: user.username } });
});

// --- FRIENDS ---

app.get("/friends", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const friends = store.getFriends(user.id).map(f => ({
    id: f.id,
    username: f.username
  }));
  res.json({ friends });
});

app.post("/friends/add", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: "username required" });

  const target = store.getUserByUsername(username);
  if (!target) return res.status(404).json({ error: "user_not_found" });
  if (target.id === user.id) return res.status(400).json({ error: "cannot_add_self" });

  store.addFriendship(user.id, target.id);
  res.json({ ok: true });

  // Notify via socket (if connected)
  io.to(target.id).emit("friend_status_update", {
    type: "friend_added",
    friend: { id: user.id, username: user.username }
  });
});

// --- CHATS & MESSAGES ---

app.get("/chats", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const chats = store.listUserChats(user.id).map((c: Chat) => ({
    id: c.id,
    type: c.type,
    name: c.name
  }));

  res.json({ chats });
});

app.get("/chats/:chatId/messages", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const { chatId } = req.params;
  const chat = store.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "chat_not_found" });

  const msgs = store.getMessages(chatId);
  res.json({ messages: msgs });
});

app.post("/chats/:chatId/send", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const { chatId } = req.params;
  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: "content_required" });

  const chat = store.getChat(chatId);
  if (!chat) return res.status(404).json({ error: "chat_not_found" });

  const msg = store.addMessage(chatId, user.id, content);
  res.json({ message: msg });

  io.to(chatId).emit("message", {
    ...msg,
    senderUsername: user.username
  });
});

// Create or open DM
app.post("/dms/open", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: "username_required" });

  const target = store.getUserByUsername(username);
  if (!target) return res.status(404).json({ error: "user_not_found" });

  const dm = store.createDM(user.id, target.id);
  res.json({ chat: { id: dm.id, type: dm.type, name: target.username } });
});

// Create group chat
app.post("/gcs/create", (req, res) => {
  const user = authFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const { name, memberUsernames } = req.body || {};
  if (!name) return res.status(400).json({ error: "name_required" });

  const memberIds = (memberUsernames || [])
    .map((u: string) => store.getUserByUsername(u))
    .filter(Boolean)
    .map((u: any) => u.id);

  const gc = store.createGC(name, user.id, memberIds);
  res.json({ chat: { id: gc.id, type: gc.type, name: gc.name } });
});

// HEALTH
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

// --- SOCKET.IO ---

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("auth", ({ token }) => {
    const userId = store.getUserIdFromToken(token);
    if (!userId) return;
    socket.data.userId = userId;
    socket.join(userId); // personal room for events
  });

  socket.on("join_chat", ({ chatId }) => {
    socket.join(chatId);
  });

  socket.on("leave_chat", ({ chatId }) => {
    socket.leave(chatId);
  });

  socket.on("send_message", ({ chatId, content }) => {
    const userId: string | undefined = socket.data.userId;
    if (!userId) return;
    const user = store.getUserById(userId);
    if (!user) return;

    const chat = store.getChat(chatId);
    if (!chat) return;

    const msg = store.addMessage(chatId, user.id, content);

    io.to(chatId).emit("message", {
      ...msg,
      senderUsername: user.username
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
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
