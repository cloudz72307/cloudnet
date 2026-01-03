import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { store } from "./store";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });

// Helper
function auth(req: express.Request) {
  const header = req.headers.authorization;
  if (!header) return null;
  const token = header.split(" ")[1];
  return store.getUserFromToken(token);
}

// AUTH
app.post("/auth/register", (req, res) => {
  try {
    const { username, password } = req.body;
    const user = store.createUser(username, password);
    const token = store.createToken(user.id);
    res.json({ user, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = store.getUserByUsername(username);
  if (!user || user.password !== password)
    return res.status(401).json({ error: "invalid_credentials" });

  const token = store.createToken(user.id);
  res.json({ user, token });
});

app.get("/auth/me", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ user });
});

// FRIENDS
app.get("/friends", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ friends: store.getFriends(user.id) });
});

app.post("/friends/add", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const target = store.getUserByUsername(req.body.username);
  if (!target) return res.status(404).json({ error: "not_found" });

  store.addFriend(user.id, target.id);
  res.json({ ok: true });
});

// CHATS
app.get("/chats", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ chats: store.listChatsForUser(user.id) });
});

app.get("/chats/:id/messages", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ messages: store.getMessages(req.params.id) });
});

app.post("/chats/:id/send", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const msg = store.addMessage(req.params.id, user.id, req.body.content);
  io.to(req.params.id).emit("message", msg);

  res.json({ message: msg });
});

// DMs
app.post("/dms/open", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const target = store.getUserByUsername(req.body.username);
  if (!target) return res.status(404).json({ error: "not_found" });

  const dm = store.createDM(user.id, target.id);
  res.json({ chat: dm });
});

// GCs
app.post("/gcs/create", (req, res) => {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const members = (req.body.members || [])
    .map((u: string) => store.getUserByUsername(u))
    .filter(Boolean)
    .map((u: any) => u.id);

  const gc = store.createGC(req.body.name, user.id, members);
  res.json({ chat: gc });
});

// SOCKET.IO
io.on("connection", (socket) => {
  socket.on("auth", ({ token }) => {
    const user = store.getUserFromToken(token);
    if (!user) return;
    socket.data.userId = user.id;
  });

  socket.on("join", (chatId) => socket.join(chatId));
  socket.on("leave", (chatId) => socket.leave(chatId));

  socket.on("send", ({ chatId, content }) => {
    const userId = socket.data.userId;
    if (!userId) return;

    const msg = store.addMessage(chatId, userId, content);
    io.to(chatId).emit("message", msg);
  });
});

// STATIC FRONTEND
app.use(express.static(path.join(__dirname, "../../web/dist")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "../../web/dist/index.html"))
);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("CloudNET API running on", PORT));
