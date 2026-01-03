import React, { useEffect, useState } from "react";
import { api } from "./api";
import { io, Socket } from "socket.io-client";

type User = { id: string; username: string };
type Chat = { id: string; type: "channel" | "dm" | "gc"; name: string };
type Message = {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
};

const socketUrl = ""; // same origin

export const CloudNetApp: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [friends, setFriends] = useState<User[]>([]);

  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check existing token on load
  useEffect(() => {
    (async () => {
      try {
        const data = await api.me();
        setUser(data.user);
      } catch {
        // ignore
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // Connect socket once logged in
  useEffect(() => {
    if (!user) return;

    const s = io(socketUrl, {
      transports: ["websocket"]
    });

    const token = localStorage.getItem("cloudnet_token");
    s.on("connect", () => {
      if (token) {
        s.emit("auth", { token });
      }
    });

    s.on("message", (msg: Message) => {
      setMessages(prev =>
        prev[0]?.chatId === msg.chatId ? [...prev, msg] : prev
      );
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  // Load initial data once user is loaded
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [friendsRes, chatsRes] = await Promise.all([
        api.getFriends(),
        api.getChats()
      ]);
      setFriends(friendsRes.friends);
      setChats(chatsRes.chats);

      const general = chatsRes.chats.find((c: Chat) => c.id === "channel:general") || chatsRes.chats[0];
      if (general) {
        setCurrentChatId(general.id);
      }
    })();
  }, [user]);

  // Load messages when chat changes
  useEffect(() => {
    if (!currentChatId || !user) return;
    (async () => {
      const res = await api.getMessages(currentChatId);
      setMessages(res.messages);
      socket?.emit("join_chat", { chatId: currentChatId });
    })();

    return () => {
      if (currentChatId) {
        socket?.emit("leave_chat", { chatId: currentChatId });
      }
    };
  }, [currentChatId, user, socket]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    try {
      let u: User;
      if (loginMode === "login") {
        u = await api.login(loginUsername, loginPassword);
      } else {
        u = await api.register(loginUsername, loginPassword);
      }

      if (!rememberMe) {
        // for now we still store token, but you could change api.setToken behavior
      }

      setUser(u);
    } catch (err: any) {
      setAuthError(err?.error || "auth_failed");
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!currentChatId || !messageInput.trim()) return;
    const content = messageInput.trim();
    setMessageInput("");
    await api.sendMessage(currentChatId, content);
  }

  if (!authChecked) {
    return <div style={rootStyle}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={rootStyle}>
        <div style={loginCardStyle}>
          <h2 style={{ marginBottom: 8 }}>CloudNET</h2>
          <p style={{ marginTop: 0, marginBottom: 16 }}>Sign in to continue</p>
          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              style={inputStyle}
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember Me
            </label>
            {authError && (
              <div style={{ color: "#ff5c5c", fontSize: 12 }}>{authError}</div>
            )}
            <button type="submit" style={buttonStyle}>
              {loginMode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
          <div style={{ marginTop: 12, fontSize: 12, textAlign: "center" }}>
            {loginMode === "login" ? (
              <>
                No account?{" "}
                <span
                  style={linkStyle}
                  onClick={() => setLoginMode("register")}
                >
                  Create one
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span
                  style={linkStyle}
                  onClick={() => setLoginMode("login")}
                >
                  Login
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentChat = chats.find(c => c.id === currentChatId) || null;

  return (
    <div style={rootStyle}>
      {/* LEFT SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={profileSectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.username}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Online</div>
        </div>

        <div style={sidebarSectionStyle}>
          <div style={sidebarSectionTitleStyle}>Friends</div>
          {friends.map((f) => (
            <div key={f.id} style={sidebarItemStyle}>
              {f.username}
            </div>
          ))}
        </div>

        <div style={sidebarSectionStyle}>
          <div style={sidebarSectionTitleStyle}>Chats</div>
          {chats.map((chat) => (
            <div
              key={chat.id}
              style={{
                ...sidebarItemStyle,
                background:
                  chat.id === currentChatId ? "rgba(0, 200, 255, 0.16)" : "transparent"
              }}
              onClick={() => setCurrentChatId(chat.id)}
            >
              {chat.type === "channel" ? chat.name : chat.name}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div style={mainAreaStyle}>
        <div style={chatHeaderStyle}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {currentChat ? currentChat.name : "Select a chat"}
          </div>
        </div>

        <div style={messagesContainerStyle}>
          {messages.map((m) => (
            <div key={m.id} style={messageRowStyle}>
              <div style={messageAuthorStyle}>{m.senderUsername}</div>
              <div style={messageBubbleStyle}>{m.content}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} style={inputBarStyle}>
          <input
            style={chatInputStyle}
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
};

// --- styles (inline for now, we can executor-ify later) ---

const rootStyle: React.CSSProperties = {
  height: "100vh",
  width: "100vw",
  display: "flex",
  background: "#050811",
  color: "#f5f8ff",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
};

const sidebarStyle: React.CSSProperties = {
  width: 220,
  borderRight: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexDirection: "column",
  padding: 10,
  boxSizing: "border-box",
  background: "radial-gradient(circle at top left, #0b1020 0%, #050811 60%)"
};

const profileSectionStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: "rgba(0,0,0,0.35)",
  marginBottom: 12
};

const sidebarSectionStyle: React.CSSProperties = {
  marginBottom: 12
};

const sidebarSectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.08,
  opacity: 0.6,
  marginBottom: 6
};

const sidebarItemStyle: React.CSSProperties = {
  fontSize: 13,
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "pointer",
  marginBottom: 2,
  transition: "background 0.12s ease",
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column"
};

const chatHeaderStyle: React.CSSProperties = {
  height: 44,
  display: "flex",
  alignItems: "center",
  padding: "0 14px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(0,0,0,0.45)"
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const messageRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  maxWidth: "70%"
};

const messageAuthorStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.65,
  marginBottom: 2
};

const messageBubbleStyle: React.CSSProperties = {
  background: "rgba(0, 200, 255, 0.14)",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 13
};

const inputBarStyle: React.CSSProperties = {
  height: 50,
  padding: "8px 10px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center"
};

const chatInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 999,
  border: "none",
  outline: "none",
  fontSize: 13,
  padding: "8px 12px",
  background: "rgba(5,10,25,0.9)",
  color: "#f5f8ff"
};

const loginCardStyle: React.CSSProperties = {
  width: 320,
  padding: 20,
  borderRadius: 12,
  background: "radial-gradient(circle at top, #101629 0%, #050811 60%)",
  border: "1px solid rgba(0, 200, 255, 0.2)",
  boxShadow: "0 0 32px rgba(0,0,0,0.75)"
};

const inputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "8px 10px",
  fontSize: 13,
  background: "rgba(5,10,25,0.9)",
  color: "#f5f8ff",
  outline: "none"
};

const buttonStyle: React.CSSProperties = {
  marginTop: 4,
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(90deg, #00c8ff, #4df2ff)",
  color: "#050811",
  fontWeight: 600,
  fontSize: 13,
  padding: "8px 10px",
  cursor: "pointer"
};

const linkStyle: React.CSSProperties = {
  color: "#4df2ff",
  cursor: "pointer",
  textDecoration: "underline"
};
