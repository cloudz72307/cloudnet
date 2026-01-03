import React, { useEffect, useMemo, useState } from "react";
import { api, setToken } from "./api";
import { getSocket, joinChat, leaveChat, sendSocketMessage } from "./socket";
import { Chat, Friend, Message, User } from "./types";

const theme = {
  bg: "#1e1f22",
  bgLight: "#2b2d31",
  bgDark: "#1a1b1e",
  bgChat: "#313338",
  text: "#f2f3f5",
  textMuted: "#b5bac1",
  accent: "#00c8ff",
  accentSoft: "rgba(0, 200, 255, 0.18)",
  border: "rgba(255,255,255,0.06)"
};

type PresenceEntry = { id: string; label: string };

export const CloudNetLayout: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [inputValue, setInputValue] = useState("");

  const [showCloudZai, setShowCloudZai] = useState<boolean>(true);
  const [showConsole, setShowConsole] = useState<boolean>(true);

  const [presenceLines, setPresenceLines] = useState<PresenceEntry[]>([]);

  // Initial auth check
  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        setUser(res.user);
      } catch {
        // no token or invalid → stay logged out
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // After login: init socket, load chats + friends
  useEffect(() => {
    if (!user) return;

    const socket = getSocket({
      onMessage: (msg) => {
        // only append if it's for the active chat
        setMessages((prev) =>
          prev.length && prev[0].chatId === msg.chatId
            ? [...prev, msg]
            : prev
        );

        // fake presence log for now
        const label = `[message] ${msg.chatId}: ${msg.content.slice(0, 24)}`;
        setPresenceLines((prev) => [
          { id: `${Date.now()}-${Math.random()}`, label },
          ...prev
        ]);
      }
    });

    (async () => {
      const [friendsRes, chatsRes] = await Promise.all([
        api.getFriends(),
        api.getChats()
      ]);
      setFriends(friendsRes.friends);
      setChats(chatsRes.chats);

      const general =
        chatsRes.chats.find((c) => c.id === "channel:general") ||
        chatsRes.chats[0] ||
        null;
      if (general) setActiveChatId(general.id);
    })();

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // When active chat changes: load messages, join socket room
  useEffect(() => {
    if (!user || !activeChatId) return;

    let cancelled = false;

    (async () => {
      const res = await api.getMessages(activeChatId);
      if (!cancelled) setMessages(res.messages);
      joinChat(activeChatId);
    })();

    return () => {
      cancelled = true;
      leaveChat(activeChatId);
    };
  }, [user, activeChatId]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    try {
      const username = authUsername.trim();
      const password = authPassword.trim();
      if (!username || !password) {
        setAuthError("Username and password required");
        return;
      }

      const res =
        authMode === "login"
          ? await api.login(username, password)
          : await api.register(username, password);

      if (!rememberMe) {
        // still using localStorage now; you could later switch to memory/session
      }

      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setAuthError(err?.error || "auth_failed");
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChatId || !inputValue.trim()) return;
    const content = inputValue.trim();
    setInputValue("");
    // Send via HTTP so DB stays authoritative
    await api.sendMessage(activeChatId, content);
    // Socket will deliver message back and append in listener
  }

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId]
  );

  if (!authChecked) {
    return (
      <div style={rootCentered}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={rootCentered}>
        <div style={authCard}>
          <div style={authTitle}>CloudNET</div>
          <div style={authSubtitle}>Sign in to your Cloud</div>
          <form onSubmit={handleAuthSubmit} style={authForm}>
            <input
              style={authInput}
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
            />
            <input
              style={authInput}
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
            <label style={authRememberRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              <span>Remember Me</span>
            </label>
            {authError && (
              <div style={authErrorStyle}>{authError}</div>
            )}
            <button type="submit" style={authButton}>
              {authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>
          <div style={authFooter}>
            {authMode === "login" ? (
              <>
                No account?{" "}
                <span
                  style={authLink}
                  onClick={() => setAuthMode("register")}
                >
                  Create one
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span
                  style={authLink}
                  onClick={() => setAuthMode("login")}
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

  return (
    <div style={root}>
      {/* SERVER DOCK */}
      <div style={serverDock}>
        <div style={dockLogo}>C</div>
        <DockItem label="server-1" active />
        <DockItem label="+" />
      </div>

      {/* CHANNEL NAV */}
      <div style={channelNav}>
        <div style={channelNavHeader}>
          <div style={serverName}>server-1</div>
        </div>

        <div style={channelList}>
          <section style={sectionBlock}>
            <div style={sectionTitle}>TEXT CHANNELS</div>
            {chats
              .filter((c) => c.type === "channel")
              .map((c) => (
                <ChannelItem
                  key={c.id}
                  label={`#${c.name || "channel"}`}
                  active={c.id === activeChatId}
                  onClick={() => setActiveChatId(c.id)}
                />
              ))}
          </section>

          <section style={sectionBlock}>
            <div style={sectionTitle}>DIRECT MESSAGES</div>
            {chats
              .filter((c) => c.type === "dm")
              .map((c) => (
                <ChannelItem
                  key={c.id}
                  label={c.name || "DM"}
                  active={c.id === activeChatId}
                  onClick={() => setActiveChatId(c.id)}
                />
              ))}
          </section>

          <section style={sectionBlock}>
            <div style={sectionTitle}>GROUP CHATS</div>
            {chats
              .filter((c) => c.type === "gc")
              .map((c) => (
                <ChannelItem
                  key={c.id}
                  label={c.name || "Group"}
                  active={c.id === activeChatId}
                  onClick={() => setActiveChatId(c.id)}
                />
              ))}
          </section>

          <section style={sectionBlock}>
            <div style={sectionTitle}>FRIENDS</div>
            {friends.map((f) => (
              <div key={f.id} style={friendRow}>
                <div style={friendAvatar}>
                  {f.username.slice(0, 2).toUpperCase()}
                </div>
                <div style={friendName}>{f.username}</div>
              </div>
            ))}
          </section>
        </div>

        <div style={channelFooter}>
          <div style={userTag}>
            <div style={userAvatar}>
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div style={userInfo}>
              <div style={userName}>{user.username}</div>
              <div style={userSub}>online</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN COLUMN */}
      <div style={mainColumn}>
        {/* TOP BAR */}
        <div style={topBar}>
          <div style={topBarLeft}>
            <span style={hash}>#</span>
            <span style={topChannelName}>
              {activeChat
                ? activeChat.name || activeChat.id
                : "Select a chat"}
            </span>
          </div>
          <div style={topBarRight}>
            <button
              style={topButton}
              onClick={() => setShowCloudZai((v) => !v)}
            >
              CloudZAI {showCloudZai ? "▾" : "▸"}
            </button>
            <button
              style={topButton}
              onClick={() => setShowConsole((v) => !v)}
            >
              Console {showConsole ? "▾" : "▸"}
            </button>
          </div>
        </div>

        {/* CHAT CORE */}
        <div style={chatCore}>
          <div style={messagesPane} className="messages-pane">
            {messages.map((m) => (
              <div key={m.id} style={messageRow}>
                <div style={messageHeader}>
                  <span style={messageAuthor}>
                    {m.senderId === user.id ? "you" : m.senderId}
                  </span>
                  <span style={messageTimestamp}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={messageBubble}>{m.content}</div>
              </div>
            ))}
          </div>
          <form style={inputBar} onSubmit={handleSend}>
            <input
              style={input}
              placeholder={
                activeChat
                  ? `Message ${
                      activeChat.type === "channel"
                        ? `#${activeChat.name || "channel"}`
                        : activeChat.name || "chat"
                    }`
                  : "Select a chat"
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!activeChat}
            />
          </form>
          {showConsole && (
            <div style={consoleBar} className="console-bar">
              <div style={consoleHeader}>System Console</div>
              <div style={consoleBody}>
                {presenceLines.map((p) => (
                  <div key={p.id} style={consoleLine}>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CLOUDZAI PANEL */}
      {showCloudZai && (
        <div style={cloudZaiPanel} className="cloudzai-panel">
          <div style={cloudZaiHeader}>
            <div>
              <div style={cloudZaiTitle}>CloudZAI</div>
              <div style={cloudZaiSubtitle}>Ambient insight layer</div>
            </div>
          </div>
          <div style={cloudZaiBody}>
            <p style={cloudZaiText}>
              CloudZAI will skim this channel and surface highlights, patterns,
              and anomalies in real time.
            </p>
            <p style={cloudZaiText}>
              As you wire it further, it can observe message rate, keywords, or
              user events and react with subtle commentary.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Dock item
const DockItem: React.FC<{ label: string; active?: boolean }> = ({
  label,
  active
}) => {
  return (
    <div
      style={{
        ...dockItem,
        backgroundColor: active ? theme.accentSoft : "transparent",
        borderRadius: 16
      }}
    >
      <span>{label[0]}</span>
    </div>
  );
};

// Channel item
const ChannelItem: React.FC<{
  label: string;
  active?: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => {
  return (
    <div
      style={{
        ...channelItem,
        backgroundColor: active ? theme.accentSoft : "transparent",
        color: active ? theme.text : theme.textMuted
      }}
      onClick={onClick}
    >
      <span>{label}</span>
    </div>
  );
};

// --- Styles (same as before, kept clean/non-plasticy) ---

const root: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  width: "100vw",
  background: theme.bg,
  color: theme.text,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  overflow: "hidden"
};

const rootCentered: React.CSSProperties = {
  ...root,
  alignItems: "center",
  justifyContent: "center"
};

const serverDock: React.CSSProperties = {
  width: 72,
  background: theme.bgDark,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: 12,
  gap: 10,
  borderRight: `1px solid ${theme.border}`
};

const dockLogo: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 20,
  background: theme.accentSoft,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700
};

const dockItem: React.CSSProperties = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.text,
  fontSize: 18,
  cursor: "pointer",
  transition: "background 0.15s ease"
};

const channelNav: React.CSSProperties = {
  width: 260,
  background: theme.bgLight,
  display: "flex",
  flexDirection: "column",
  borderRight: `1px solid ${theme.border}`
};

const channelNavHeader: React.CSSProperties = {
  height: 48,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  borderBottom: `1px solid ${theme.border}`,
  fontWeight: 600,
  fontSize: 14
};

const serverName: React.CSSProperties = {
  color: theme.text
};

const channelList: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "8px 8px 8px 8px"
};

const sectionBlock: React.CSSProperties = {
  marginBottom: 16
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  color: theme.textMuted,
  letterSpacing: 0.5,
  marginBottom: 6
};

const channelItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
  marginBottom: 2
};

const channelFooter: React.CSSProperties = {
  height: 52,
  borderTop: `1px solid ${theme.border}`,
  padding: "0 8px",
  display: "flex",
  alignItems: "center"
};

const userTag: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%"
};

const userAvatar: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  background: theme.bgDark,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  color: theme.textMuted
};

const userInfo: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: 12
};

const userName: React.CSSProperties = {
  color: theme.text
};

const userSub: React.CSSProperties = {
  color: theme.textMuted,
  fontSize: 11
};

const mainColumn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0
};

const topBar: React.CSSProperties = {
  height: 48,
  background: theme.bgDark,
  borderBottom: `1px solid ${theme.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px"
};

const topBarLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6
};

const hash: React.CSSProperties = {
  fontSize: 18,
  color: theme.textMuted
};

const topChannelName: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600
};

const topBarRight: React.CSSProperties = {
  display: "flex",
  gap: 8
};

const topButton: React.CSSProperties = {
  background: theme.bgLight,
  border: `1px solid ${theme.border}`,
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  color: theme.textMuted,
  cursor: "pointer"
};

const chatCore: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  background: theme.bgChat,
  position: "relative"
};

const messagesPane: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const messageRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column"
};

const messageHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  fontSize: 12
};

const messageAuthor: React.CSSProperties = {
  fontWeight: 600
};

const messageTimestamp: React.CSSProperties = {
  fontSize: 11,
  color: theme.textMuted
};

const messageBubble: React.CSSProperties = {
  marginTop: 2,
  background: theme.bgLight,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 14
};

const inputBar: React.CSSProperties = {
  padding: "8px 12px",
  borderTop: `1px solid ${theme.border}`,
  background: theme.bgDark
};

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "none",
  outline: "none",
  padding: "8px 10px",
  background: theme.bgLight,
  color: theme.text,
  fontSize: 14
};

const consoleBar: React.CSSProperties = {
  borderTop: `1px solid ${theme.border}`,
  background: theme.bgDark,
  height: 120,
  display: "flex",
  flexDirection: "column"
};

const consoleHeader: React.CSSProperties = {
  fontSize: 12,
  color: theme.textMuted,
  padding: "4px 10px"
};

const consoleBody: React.CSSProperties = {
  flex: 1,
  padding: "0 10px 6px 10px",
  overflowY: "auto",
  fontSize: 12
};

const consoleLine: React.CSSProperties = {
  color: theme.textMuted
};

const cloudZaiPanel: React.CSSProperties = {
  width: 280,
  background: theme.bgLight,
  borderLeft: `1px solid ${theme.border}`,
  display: "flex",
  flexDirection: "column"
};

const cloudZaiHeader: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: `1px solid ${theme.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
};

const cloudZaiTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600
};

const cloudZaiSubtitle: React.CSSProperties = {
  fontSize: 12,
  color: theme.textMuted
};

const cloudZaiBody: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: theme.textMuted
};

const cloudZaiText: React.CSSProperties = {
  marginBottom: 8
};

const authCard: React.CSSProperties = {
  width: 320,
  padding: 20,
  borderRadius: 12,
  background: theme.bgDark,
  border: `1px solid ${theme.border}`
};

const authTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 4
};

const authSubtitle: React.CSSProperties = {
  fontSize: 13,
  color: theme.textMuted,
  marginBottom: 16
};

const authForm: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const authInput: React.CSSProperties = {
  borderRadius: 6,
  border: `1px solid ${theme.border}`,
  padding: "8px 10px",
  fontSize: 13,
  background: theme.bg,
  color: theme.text
};

const authRememberRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontSize: 12,
  color: theme.textMuted
};

const authButton: React.CSSProperties = {
  marginTop: 4,
  borderRadius: 6,
  border: "none",
  background: theme.accent,
  color: theme.bgDark,
  fontWeight: 600,
  fontSize: 13,
  padding: "8px 10px",
  cursor: "pointer"
};

const authFooter: React.CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  color: theme.textMuted
};

const authLink: React.CSSProperties = {
  color: theme.accent,
  cursor: "pointer",
  textDecoration: "underline"
};

const authErrorStyle: React.CSSProperties = {
  color: "#ff5c5c",
  fontSize: 12
};

const friendRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  marginBottom: 4
};

const friendAvatar: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 999,
  background: theme.bgDark,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  color: theme.textMuted
};

const friendName: React.CSSProperties = {
  color: theme.text
};
