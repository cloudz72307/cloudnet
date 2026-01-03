import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

// ========= Types =========

type Role = "owner" | "admin" | "user";

type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  password: string;
  banned?: boolean;
  kicked?: boolean;
  muted?: boolean;
  rainbowName?: boolean;
  tempMod?: boolean;
};

type ChatKind = "server" | "dm" | "group";

type Chat = {
  id: string;
  name: string;
  kind: ChatKind;
  members: string[];
};

type Message = {
  id: string;
  chatId: string;
  senderId: string | "system";
  senderDisplayName: string;
  senderRole: Role | "system";
  content: string;
  createdAt: number;
};

type Theme = {
  bgDark: string;
  bgDarker: string;
  bgLight: string;
  bgLighter: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
};

type ViewMode = "home" | "createServer" | "chat";

type AppMode = "chooseAccount" | "addAccount" | "login" | "app";

// ========= Theme / util =========

const makeTheme = (accent: string): Theme => ({
  bgDark: "#050811",
  bgDarker: "#02040a",
  bgLight: "#0e1424",
  bgLighter: "#161d33",
  text: "#f5f7ff",
  textMuted: "#8b94b8",
  border: "#1f293d",
  accent,
  accentSoft: `${accent}33`,
  danger: "#ff4c5b"
});

const DEFAULT_ACCENT = "#4c7dff";

const LS_KEY_ACCENT = "cloudnet_accent";

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

// ========= Initial data (no users, safe) =========

const initialUsers: User[] = []; // no default accounts, no personal data

const initialChats: Chat[] = [
  {
    id: "c_server_general",
    name: "general",
    kind: "server",
    members: []
  }
];

const initialMessages: Message[] = [];

// ========= Main component =========

const CloudNetLayout: React.FC = () => {
  const isMobile = useIsMobile();

  // theme
  const [accent, setAccent] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    try {
      return localStorage.getItem(LS_KEY_ACCENT) || DEFAULT_ACCENT;
    } catch {
      return DEFAULT_ACCENT;
    }
  });
  const theme = useMemo(() => makeTheme(accent), [accent]);

  // app mode
  const [appMode, setAppMode] = useState<AppMode>("chooseAccount");

  // core state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const [draftsByChat, setDraftsByChat] = useState<Record<string, string>>({});
  const [typingByChat, setTypingByChat] = useState<Record<string, boolean>>({});

  const [settingsOpen, setSettingsOpen] = useState(false);

  // auth fields
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newAccountError, setNewAccountError] = useState<string | null>(null);

  // websocket
  const ws = useRef<WebSocket | null>(null);

  // ========= WebSocket client =========

  useEffect(() => {
    // Use current origin, just swap http -> ws
    const wsUrl = window.location.origin.replace(/^http/, "ws");

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      // Optional: console.log("[CloudNET] WebSocket connected");
    };

    socket.onmessage = event => {
      try {
        const msg: Message = JSON.parse(event.data);
        if (!msg || !msg.id || !msg.chatId) return;

        setMessages(prev => {
          // avoid duplicate messages if any
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {
        // ignore malformed frames
      }
    };

    socket.onerror = () => {
      // Optional: you could show a small "offline" indicator somewhere
      // console.warn("[CloudNET] WebSocket error");
    };

    socket.onclose = () => {
      // Optional: console.log("[CloudNET] WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  // admin target (not heavily used yet)
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(
    null
  );

  // ========= persistence =========

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_ACCENT, accent);
    } catch {
      // ignore
    }
  }, [accent]);

  // ========= derived =========

  const isOwner = currentUser?.role === "owner";

  const activeChat = useMemo(
    () => chats.find(c => c.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const messagesForActiveChat = useMemo(
    () =>
      activeChatId
        ? messages
            .filter(m => m.chatId === activeChatId)
            .sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [messages, activeChatId]
  );

  const serverChats = useMemo(
    () => chats.filter(c => c.kind === "server"),
    [chats]
  );

  const dmAndGroupChats = useMemo(() => {
    if (!currentUser) return [];
    return chats.filter(
      c =>
        (c.kind === "dm" || c.kind === "group") &&
        c.members.includes(currentUser.id)
    );
  }, [chats, currentUser]);

  const friends = useMemo(() => {
    if (!currentUser) return [];
    return users.filter(u => u.id !== currentUser.id);
  }, [users, currentUser]);

  const typingActive =
    activeChatId && typingByChat[activeChatId] && draftsByChat[activeChatId];

  const getUserById = (id: string) => users.find(u => u.id === id) || null;

  // ========= auth logic =========

  const ensureUserInServer = (userId: string) => {
    setChats(prev =>
      prev.map(c =>
        c.id === "c_server_general"
          ? {
              ...c,
              members: c.members.includes(userId)
                ? c.members
                : [...c.members, userId]
            }
          : c
      )
    );
  };

  const handleCreateAccount = () => {
    const uname = newUsername.trim();
    const pwd = newPassword.trim();
    const dname =
      uname.toLowerCase() === "cloudz"
        ? "cloudz"
        : newDisplayName.trim() || uname;

    if (!uname || !pwd) {
      setNewAccountError("Username and password are required.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(uname)) {
      setNewAccountError("Username must be letters, numbers, and underscores.");
      return;
    }
    if (users.some(u => u.username.toLowerCase() === uname.toLowerCase())) {
      setNewAccountError("That username already exists.");
      return;
    }

    const role: Role = uname.toLowerCase() === "cloudz" ? "owner" : "user";

    const newUser: User = {
      id: createId("u"),
      username: uname,
      displayName: dname,
      password: pwd,
      role
    };

    setUsers(prev => [...prev, newUser]);
    ensureUserInServer(newUser.id);

    setNewUsername("");
    setNewDisplayName("");
    setNewPassword("");
    setNewAccountError(null);

    setSelectedAccountId(newUser.id);
    setAppMode("login");
    setLoginPassword("");
    setLoginError(null);
  };

  const handleLogin = () => {
    if (!selectedAccountId) {
      setLoginError("Select an account first.");
      return;
    }
    const pwd = loginPassword;
    const user = users.find(u => u.id === selectedAccountId);
    if (!user) {
      setLoginError("Account not found.");
      return;
    }
    if (user.banned) {
      setLoginError("This account is banned.");
      return;
    }
    if (user.password !== pwd) {
      setLoginError("Incorrect password.");
      return;
    }
    setCurrentUser(user);
    setLoginPassword("");
    setLoginError(null);
    setAppMode("app");
    setViewMode("home");
    setActiveChatId("c_server_general");
    ensureUserInServer(user.id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode("chooseAccount");
    setSelectedAccountId(null);
    setSettingsOpen(false);
    setLoginPassword("");
  };

  const handleDeleteAccount = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setChats(prev =>
      prev.map(c => ({
        ...c,
        members: c.members.filter(id => id !== userId)
      }))
    );
    if (selectedAccountId === userId) {
      setSelectedAccountId(null);
      setAppMode("chooseAccount");
    }
    if (currentUser?.id === userId) {
      handleLogout();
    }
  };

  // ========= chat actions =========

  const sendMessage = (chatId: string) => {
    if (!currentUser) return;
    const raw = draftsByChat[chatId] || "";
    const text = raw.trim();
    if (!text) return;
    if (!activeChatId || activeChatId !== chatId) return;

    const now = Date.now();

    const msg: Message = {
      id: `m_${now}_${Math.random().toString(16).slice(2)}`,
      chatId,
      senderId: currentUser.id,
      senderDisplayName: currentUser.displayName,
      senderRole: currentUser.role,
      content: text,
      createdAt: now
    };

    // send to WebSocket server (it will broadcast to all clients)
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(msg));
      } catch {
        // optional: handle send error
      }
    } else {
      // fallback: local-only (so you don't lose message if WS is down)
      setMessages(prev => [...prev, msg]);
    }

    setDraftsByChat(prev => ({ ...prev, [chatId]: "" }));
    setTypingByChat(prev => ({ ...prev, [chatId]: false }));
  };

  const handleDraftChange = (chatId: string, value: string) => {
    setDraftsByChat(prev => ({ ...prev, [chatId]: value }));
    setTypingByChat(prev => ({ ...prev, [chatId]: value.trim().length > 0 }));
  };

  const handleCreateServer = (name: string) => {
    if (!currentUser) return;
    const n = name.trim();
    if (!n) return;
    const id = createId("c_server");
    const newChat: Chat = {
      id,
      name: n,
      kind: "server",
      members: [currentUser.id]
    };
    setChats(prev => [...prev, newChat]);
    setViewMode("chat");
    setActiveChatId(id);
  };

  const handleOpenChat = (chatId: string) => {
    setViewMode("chat");
    setActiveChatId(chatId);
  };

  const handleSwitchToHome = () => {
    setViewMode("home");
    setActiveChatId(null);
  };

  const handleSwitchToCreateServer = () => {
    setViewMode("createServer");
    setActiveChatId(null);
  };

  const handleMobileBackToSidebar = () => {
    setActiveChatId(null);
    setViewMode("home");
  };

  // ========= moderator actions =========

  const safeOwnerGuard = (targetId: string) => {
    const u = getUserById(targetId);
    if (!u) return false;
    if (u.username.toLowerCase() === "cloudz") return false; // cannot harm owner
    return true;
  };

  const handleBanUser = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              banned: true
            }
          : u
      )
    );
  };

  const handleKickUser = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              kicked: true
            }
          : u
      )
    );
    setChats(prev =>
      prev.map(c =>
        c.members.includes(userId)
          ? { ...c, members: c.members.filter(id => id !== userId) }
          : c
      )
    );
  };

  const handleResetUsername = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              username: `user_${u.id.slice(-4)}`,
              displayName: `user_${u.id.slice(-4)}`
            }
          : u
      )
    );
  };

  const handleForceLogoutUser = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              kicked: true
            }
          : u
      )
    );
    if (currentUser?.id === userId) {
      handleLogout();
    }
  };

  const handleToggleMuteUser = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              muted: !u.muted
            }
          : u
      )
    );
  };

  // ========= promote / role actions =========

  const handlePromoteToAdmin = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              role: "admin",
              tempMod: false
            }
          : u
      )
    );
  };

  const handleDemoteAdmin = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              role: "user",
              tempMod: false
            }
          : u
      )
    );
  };

  const handleGrantTempMod = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              role: "admin",
              tempMod: true
            }
          : u
      )
    );
  };

  // ========= fun features (affect data) =========

  const randomNicknames = [
    "ghost",
    "byte",
    "spark",
    "glitch",
    "omega",
    "phantom",
    "static",
    "nova"
  ];

  const handleToggleRainbowName = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              rainbowName: !u.rainbowName
            }
          : u
      )
    );
  };

  const handleRandomNickname = (userId: string) => {
    if (!isOwner || !safeOwnerGuard(userId)) return;
    const nick =
      randomNicknames[Math.floor(Math.random() * randomNicknames.length)];
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              displayName: nick
            }
          : u
      )
    );
  };

  const handleSystemPing = () => {
    if (!isOwner || !currentUser) return;
    const now = Date.now();
    const allChatIds = chats.map(c => c.id);
    const newMessages: Message[] = allChatIds.map(chatId => ({
      id: `m_${now}_${Math.random().toString(16).slice(2)}`,
      chatId,
      senderId: "system",
      senderDisplayName: "system",
      senderRole: "system",
      content: "⚡ system ping from owner",
      createdAt: now
    }));

    // broadcast each system message
    newMessages.forEach(msg => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(msg));
      } else {
        setMessages(prev => [...prev, msg]);
      }
    });
  };

  const handleExplodeChat = () => {
    if (!isOwner || !currentUser || !activeChat) return;
    const now = Date.now();
    const msg: Message = {
      id: `m_${now}_${Math.random().toString(16).slice(2)}`,
      chatId: activeChat.id,
      senderId: "system",
      senderDisplayName: "system",
      senderRole: "system",
      content: "💥 chat exploded (visual only) 💥",
      createdAt: now
    };

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    } else {
      setMessages(prev => [...prev, msg]);
    }
  };

  // ========= settings / profile =========

  const handleUpdateProfile = (updates: {
    displayName?: string;
    username?: string;
    password?: string;
  }) => {
    if (!currentUser) return;
    const guardOwnerUsername =
      currentUser.username.toLowerCase() === "cloudz";

    setUsers(prev =>
      prev.map(u =>
        u.id === currentUser.id
          ? {
              ...u,
              displayName:
                updates.displayName !== undefined
                  ? updates.displayName
                  : u.displayName,
              username:
                updates.username !== undefined
                  ? guardOwnerUsername
                    ? "cloudz"
                    : updates.username
                  : u.username,
              password:
                updates.password !== undefined
                  ? updates.password
                  : u.password
            }
          : u
      )
    );

    setCurrentUser(prev =>
      prev
        ? {
            ...prev,
            displayName:
              updates.displayName !== undefined
                ? updates.displayName
                : prev.displayName,
            username:
              updates.username !== undefined
                ? guardOwnerUsername
                  ? "cloudz"
                  : updates.username
                : prev.username,
            password:
              updates.password !== undefined
                ? updates.password
                : prev.password
          }
        : prev
    );
  };

  const handleChangeAccent = (color: string) => {
    setAccent(color);
  };

  // ========= UI helpers =========

  const renderRoleTag = (user: User) => {
    if (user.role === "owner")
      return (
        <span
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: "#ffffff",
            color: "#f5c542",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.4
          }}
        >
          OWNER🛡️
        </span>
      );
    if (user.role === "admin")
      return (
        <span
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: theme.accentSoft,
            color: theme.accent,
            fontSize: 10,
            fontWeight: 700
          }}
        >
          ADMIN
        </span>
      );
    return null;
  };

  const renderSenderName = (msg: Message) => {
    const base = msg.senderDisplayName;
    if (msg.senderRole === "system") return "system";
    const sender = msg.senderId === "system" ? null : getUserById(msg.senderId);
    if (!sender) return base;
    return sender.displayName;
  };

  const getSenderRole = (msg: Message): Role | "system" => {
    if (msg.senderRole === "system") return "system";
    const sender =
      msg.senderId === "system" ? null : getUserById(msg.senderId);
    return sender?.role || msg.senderRole;
  };

  const isRainbowName = (userId: string) => {
    const u = getUserById(userId);
    return !!u?.rainbowName;
  };

  // ========= AUTH SCREENS =========

  if (appMode === "chooseAccount") {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          background: theme.bgDarker,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <div
          style={{
            width: 380,
            maxWidth: "100%",
            background: theme.bgLight,
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700
            }}
          >
            Choose an account
          </div>
          <div
            style={{
              fontSize: 12,
              color: theme.textMuted
            }}
          >
            No accounts are stored in this file. You create everything at
            runtime.
          </div>

          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              borderRadius: 8,
              background: theme.bgDark,
              border: `1px solid ${theme.border}`,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6
            }}
          >
            {users.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: theme.textMuted
                }}
              >
                No accounts yet. Create one to begin.
              </div>
            )}
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedAccountId(u.id);
                  setAppMode("login");
                  setLoginPassword("");
                  setLoginError(null);
                }}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: theme.bgLighter,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: theme.accentSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {u.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column"
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      {u.displayName}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: theme.textMuted
                      }}
                    >
                      @{u.username}
                    </span>
                  </div>
                </div>
                {renderRoleTag(u)}
              </div>
            ))}
          </div>

          <button
            onClick={() => setAppMode("addAccount")}
            style={{
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 6,
              border: "none",
              background: theme.accent,
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Add account
          </button>
        </div>
      </div>
    );
  }

  if (appMode === "addAccount") {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          background: theme.bgDarker,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <div
          style={{
            width: 380,
            maxWidth: "100%",
            background: theme.bgLight,
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700
            }}
          >
            Create account
          </div>
          <div
            style={{
              fontSize: 12,
              color: theme.textMuted
            }}
          >
            Use username <b>cloudz</b> to become owner. No data is stored in
            this file.
          </div>

          <label
            style={{
              fontSize: 11,
              color: theme.textMuted
            }}
          >
            USERNAME
          </label>
          <input
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            style={{
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.bgDark,
              color: theme.text,
              fontSize: 13,
              padding: "6px 8px",
              outline: "none"
            }}
            placeholder="cloudz"
          />

          <label
            style={{
              fontSize: 11,
              color: theme.textMuted,
              marginTop: 6
            }}
          >
            DISPLAY NAME
          </label>
          <input
            value={newDisplayName}
            onChange={e => setNewDisplayName(e.target.value)}
            style={{
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.bgDark,
              color: theme.text,
              fontSize: 13,
              padding: "6px 8px",
              outline: "none"
            }}
            placeholder="Shown in chat (ignored if username is cloudz)"
          />

          <label
            style={{
              fontSize: 11,
              color: theme.textMuted,
              marginTop: 6
            }}
          >
            PASSWORD
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.bgDark,
              color: theme.text,
              fontSize: 13,
              padding: "6px 8px",
              outline: "none"
            }}
            placeholder="Keep this secret; not stored anywhere else"
          />

          {newAccountError && (
            <div
              style={{
                fontSize: 11,
                color: theme.danger
              }}
            >
              {newAccountError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 6
            }}
          >
            <button
              onClick={handleCreateAccount}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                background: theme.accent,
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setAppMode("chooseAccount");
                setNewAccountError(null);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.textMuted,
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === "login") {
    const account =
      (selectedAccountId &&
        users.find(u => u.id === selectedAccountId)) ||
      null;
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          background: theme.bgDarker,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <div
          style={{
            width: 380,
            maxWidth: "100%",
            background: theme.bgLight,
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700
            }}
          >
            Login
          </div>

          {account ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: theme.accentSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                {account.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  {account.displayName}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: theme.textMuted
                  }}
                >
                  @{account.username}
                </span>
              </div>
              <div style={{ marginLeft: "auto" }}>{renderRoleTag(account)}</div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: theme.danger
              }}
            >
              No account selected.
            </div>
          )}

          <label
            style={{
              fontSize: 11,
              color: theme.textMuted,
              marginTop: 6
            }}
          >
            PASSWORD
          </label>
          <input
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            style={{
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.bgDark,
              color: theme.text,
              fontSize: 13,
              padding: "6px 8px",
              outline: "none"
            }}
            placeholder="••••••••"
          />

          {loginError && (
            <div
              style={{
                fontSize: 11,
                color: theme.danger
              }}
            >
              {loginError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 6
            }}
          >
            <button
              onClick={handleLogin}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                background: theme.accent,
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Login
            </button>
            <button
              onClick={() => {
                setAppMode("chooseAccount");
                setLoginError(null);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.textMuted,
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Switch account
            </button>
          </div>

          {account && (
            <button
              onClick={() => handleDeleteAccount(account.id)}
              style={{
                marginTop: 6,
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: theme.danger,
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12
              }}
            >
              Delete this account (local only)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========= APP UI =========

  if (!currentUser) return null;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: theme.bgDarker,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* top app bar */}
      <div
        style={{
          height: 48,
          background: theme.bgDark,
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <button
            style={{
              height: 28,
              width: 28,
              borderRadius: 999,
              border: "none",
              background:
                viewMode === "home" ? theme.accentSoft : "transparent",
              color: theme.text,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14
            }}
            onClick={handleSwitchToHome}
          >
            C
          </button>
          <button
            style={{
              height: 28,
              width: 28,
              borderRadius: 999,
              border: "none",
              background:
                viewMode === "createServer"
                  ? theme.accentSoft
                  : "transparent",
              color: theme.text,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={handleSwitchToCreateServer}
          >
            +
          </button>
          <span
            style={{
              fontSize: 13,
              color: theme.textMuted,
              marginLeft: 8
            }}
          >
            CloudNET
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              borderRadius: 999,
              border: "none",
              background: theme.bgLight,
              color: theme.textMuted,
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 14
            }}
          >
            ⚙
          </button>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: theme.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {currentUser.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column"
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {currentUser.displayName}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: theme.textMuted
                }}
              >
                @{currentUser.username}
              </span>
              {renderRoleTag(currentUser)}
            </div>
          </div>
        </div>
      </div>

      {/* main body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* left sidebar */}
        <div
          style={{
            width: isMobile ? "100%" : 260,
            position: isMobile ? "absolute" : "relative",
            left: isMobile
              ? activeChatId && viewMode === "chat"
                ? "-100%"
                : "0"
              : 0,
            top: 0,
            height: "100%",
            transition: isMobile ? "left 0.25s ease" : undefined,
            zIndex: 20,
            background: theme.bgLight,
            borderRight: `1px solid ${theme.border}`,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              height: 48,
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <span>server-1</span>
            {isMobile && activeChatId && viewMode === "chat" && (
              <button
                onClick={handleMobileBackToSidebar}
                style={{
                  border: "none",
                  background: "transparent",
                  color: theme.textMuted,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            {/* server channels */}
            <section>
              <div
                style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 6
                }}
              >
                SERVER CHANNELS
              </div>
              {serverChats.map(chat => {
                const isActive =
                  activeChatId === chat.id && viewMode === "chat";
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleOpenChat(chat.id)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: isActive ? theme.accentSoft : "transparent",
                      color: isActive ? theme.accent : theme.text
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        color: theme.textMuted
                      }}
                    >
                      #
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden"
                      }}
                    >
                      {chat.name}
                    </span>
                  </div>
                );
              })}
            </section>

            {/* dms / groups */}
            <section>
              <div
                style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  letterSpacing: 0.5,
                  marginBottom: 6
                }}
              >
                DIRECT MESSAGES / GROUPS
              </div>
              {dmAndGroupChats.map(chat => {
                const isActive =
                  activeChatId === chat.id && viewMode === "chat";
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleOpenChat(chat.id)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: isActive ? theme.accentSoft : "transparent",
                      color: isActive ? theme.accent : theme.text
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: theme.bgLighter,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10
                      }}
                    >
                      {chat.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden"
                      }}
                    >
                      {chat.name}
                    </span>
                  </div>
                );
              })}
              {dmAndGroupChats.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: theme.textMuted
                  }}
                >
                  No DMs yet.
                </div>
              )}
            </section>
          </div>
        </div>

        {/* center content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative"
          }}
        >
          {/* center top bar */}
          <div
            style={{
              height: 48,
              background: theme.bgDark,
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {isMobile && activeChatId && viewMode === "chat" && (
                <button
                  onClick={handleMobileBackToSidebar}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: theme.textMuted,
                    fontSize: 18,
                    marginRight: 4,
                    cursor: "pointer"
                  }}
                >
                  ☰
                </button>
              )}

              {viewMode === "home" && (
                <>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    Home
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: theme.textMuted
                    }}
                  >
                    DMs · Groups · Friends
                  </span>
                </>
              )}
              {viewMode === "createServer" && (
                <>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    Create Server
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: theme.textMuted
                    }}
                  >
                    Spin up a new realm
                  </span>
                </>
              )}
              {viewMode === "chat" && activeChat && (
                <>
                  <span
                    style={{
                      fontSize: 18,
                      color:
                        activeChat.kind === "server"
                          ? theme.textMuted
                          : theme.text
                    }}
                  >
                    {activeChat.kind === "server" ? "#" : ""}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    {activeChat.name}
                  </span>
                </>
              )}
              {viewMode === "chat" && !activeChat && (
                <span
                  style={{
                    fontSize: 14,
                    color: theme.textMuted
                  }}
                >
                  No chat selected
                </span>
              )}
            </div>
            {viewMode === "chat" && typingActive && (
              <div
                style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  fontStyle: "italic"
                }}
              >
                typing…
              </div>
            )}
          </div>

          {/* center main */}
          <div
            style={{
              flex: 1,
              display: "flex",
              minHeight: 0
            }}
          >
            {/* home */}
            {viewMode === "home" && (
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  background: theme.bgDarker,
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 16
                }}
              >
                {/* DMs / groups */}
                <div
                  style={{
                    flex: 1,
                    background: theme.bgLight,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      Direct Messages & Groups
                    </span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                  >
                    {dmAndGroupChats.map(chat => (
                      <div
                        key={chat.id}
                        onClick={() => handleOpenChat(chat.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: theme.bgLighter,
                          border: `1px solid ${theme.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            background: theme.accentSoft,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700
                          }}
                        >
                          {chat.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden"
                            }}
                          >
                            {chat.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: theme.textMuted
                            }}
                          >
                            {chat.kind === "dm"
                              ? "Direct Message"
                              : "Group Chat"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {dmAndGroupChats.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: theme.textMuted
                        }}
                      >
                        No DMs yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* friends */}
                <div
                  style={{
                    width: isMobile ? "100%" : 260,
                    background: theme.bgLight,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      Friends
                    </span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                  >
                    {friends.map(friend => (
                      <div
                        key={friend.id}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: theme.bgLighter,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              background: theme.accentSoft,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11
                            }}
                          >
                            {friend.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column"
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500
                              }}
                            >
                              {friend.displayName}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: theme.textMuted
                              }}
                            >
                              @{friend.username}
                            </span>
                          </div>
                        </div>
                        <button
                          style={{
                            fontSize: 10,
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "none",
                            background: theme.accentSoft,
                            color: theme.accent,
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            const existing = chats.find(
                              c =>
                                c.kind === "dm" &&
                                c.members.includes(currentUser.id) &&
                                c.members.includes(friend.id)
                            );
                            if (existing) {
                              handleOpenChat(existing.id);
                            } else {
                              const id = createId("c_dm");
                              const newChat: Chat = {
                                id,
                                name: friend.displayName,
                                kind: "dm",
                                members: [currentUser.id, friend.id]
                              };
                              setChats(prev => [...prev, newChat]);
                              handleOpenChat(id);
                            }
                          }}
                        >
                          Message
                        </button>
                      </div>
                    ))}
                    {friends.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: theme.textMuted
                        }}
                      >
                        No friends yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* create server */}
            {viewMode === "createServer" && (
              <CreateServerView theme={theme} onCreate={handleCreateServer} />
            )}

            {/* chat */}
            {viewMode === "chat" && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  background: theme.bgDarker
                }}
              >
                {!activeChat && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme.textMuted,
                      fontSize: 13
                    }}
                  >
                    Pick something on the left.
                  </div>
                )}
                {activeChat && (
                  <>
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      {messagesForActiveChat.map(msg => {
                        const sender =
                          msg.senderId === "system"
                            ? null
                            : getUserById(msg.senderId);
                        const isSelf =
                          sender && currentUser && sender.id === currentUser.id;
                        const role = getSenderRole(msg);
                        const rainbow =
                          msg.senderId !== "system" &&
                          sender &&
                          sender.rainbowName;
                        const muted = sender?.muted;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 2
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  backgroundImage: rainbow
                                    ? "linear-gradient(90deg, #f97316, #facc15, #22c55e, #0ea5e9, #a855f7, #ec4899)"
                                    : undefined,
                                  WebkitBackgroundClip: rainbow
                                    ? "text"
                                    : undefined,
                                  color: rainbow ? "transparent" : theme.text
                                }}
                              >
                                {renderSenderName(msg)}
                              </span>
                              {role !== "system" && sender
                                ? renderRoleTag(sender)
                                : null}
                              {muted && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: theme.textMuted
                                  }}
                                >
                                  (muted)
                                </span>
                              )}
                              {msg.senderRole === "system" && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: theme.textMuted
                                  }}
                                >
                                  [system]
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                background:
                                  msg.senderRole === "system"
                                    ? theme.bgLighter
                                    : isSelf
                                    ? theme.accentSoft
                                    : theme.bgLight,
                                borderRadius: 8,
                                padding: "6px 10px",
                                fontSize: 13,
                                color:
                                  msg.senderRole === "system"
                                    ? theme.textMuted
                                    : isSelf
                                    ? theme.accent
                                    : theme.text,
                                display: "inline-flex",
                                maxWidth: "80%"
                              }}
                            >
                              <span>{msg.content}</span>
                            </div>
                          </div>
                        );
                      })}
                      {messagesForActiveChat.length === 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: theme.textMuted
                          }}
                        >
                          No messages yet.
                        </div>
                      )}
                    </div>
                    {activeChat && (
                      <div
                        style={{
                          padding: 10,
                          borderTop: `1px solid ${theme.border}`,
                          background: theme.bgDark,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6
                        }}
                      >
                        {typingActive && (
                          <div
                            style={{
                              fontSize: 11,
                              color: theme.textMuted
                            }}
                          >
                            You are typing…
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 8
                          }}
                        >
                          <input
                            value={draftsByChat[activeChat.id] || ""}
                            onChange={e =>
                              handleDraftChange(activeChat.id, e.target.value)
                            }
                            onKeyDown={e => {
                              if (
                                e.key === "Enter" &&
                                !e.shiftKey &&
                                !e.altKey
                              ) {
                                e.preventDefault();
                                sendMessage(activeChat.id);
                              }
                            }}
                            placeholder={`Message ${
                              activeChat.kind === "server"
                                ? `#${activeChat.name}`
                                : activeChat.name
                            }`}
                            style={{
                              flex: 1,
                              borderRadius: 6,
                              border: `1px solid ${theme.border}`,
                              background: theme.bgLight,
                              color: theme.text,
                              fontSize: 13,
                              padding: "6px 8px",
                              outline: "none"
                            }}
                          />
                          <button
                            onClick={() => sendMessage(activeChat.id)}
                            style={{
                              padding: "0 12px",
                              borderRadius: 6,
                              border: "none",
                              background: theme.accent,
                              color: "#000",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 13
                            }}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* right owner admin / fun menu */}
        {!isMobile && isOwner && (
          <div
            style={{
              width: 280,
              borderLeft: `1px solid ${theme.border}`,
              background: theme.bgDark,
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                height: 36,
                borderBottom: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                fontSize: 12,
                fontWeight: 600
              }}
            >
              Fun Admin Menu
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}
            >
              {/* moderation features (5) */}
              <section>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    marginBottom: 4
                  }}
                >
                  MODERATION (5)
                </div>
                {users
                  .filter(u => u.id !== currentUser.id)
                  .map(u => (
                    <div
                      key={u.id}
                      style={{
                        borderRadius: 6,
                        border: `1px solid ${theme.border}`,
                        background: theme.bgLight,
                        padding: 6,
                        marginBottom: 6
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column"
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            {u.displayName}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: theme.textMuted
                            }}
                          >
                            @{u.username}
                          </span>
                        </div>
                        {renderRoleTag(u)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4
                        }}
                      >
                        <AdminButton
                          theme={theme}
                          label="Ban"
                          onClick={() => handleBanUser(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label="Kick"
                          onClick={() => handleKickUser(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label="Reset name"
                          onClick={() => handleResetUsername(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label="Force logout"
                          onClick={() => handleForceLogoutUser(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label={u.muted ? "Unmute" : "Mute"}
                          onClick={() => handleToggleMuteUser(u.id)}
                        />
                      </div>
                    </div>
                  ))}
                {users.filter(u => u.id !== currentUser.id).length === 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted
                    }}
                  >
                    No other users yet.
                  </div>
                )}
              </section>

              {/* promote features (3) */}
              <section>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    marginBottom: 4
                  }}
                >
                  PROMOTE (3)
                </div>
                {users
                  .filter(u => u.id !== currentUser.id)
                  .map(u => (
                    <div
                      key={u.id}
                      style={{
                        borderRadius: 6,
                        border: `1px solid ${theme.border}`,
                        background: theme.bgLight,
                        padding: 6,
                        marginBottom: 6
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {u.displayName}
                        </span>
                        {renderRoleTag(u)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4
                        }}
                      >
                        <AdminButton
                          theme={theme}
                          label="Promote admin"
                          onClick={() => handlePromoteToAdmin(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label="Demote admin"
                          onClick={() => handleDemoteAdmin(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label="Temp mod"
                          onClick={() => handleGrantTempMod(u.id)}
                        />
                      </div>
                    </div>
                  ))}
              </section>

              {/* fun features (4) */}
              <section>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    marginBottom: 4
                  }}
                >
                  FUN (4)
                </div>
                {users
                  .filter(u => u.id !== currentUser.id)
                  .map(u => (
                    <div
                      key={u.id}
                      style={{
                        borderRadius: 6,
                        border: `1px solid ${theme.border}`,
                        background: theme.bgLight,
                        padding: 6,
                        marginBottom: 6
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {u.displayName}
                        </span>
                        {u.rainbowName && (
                          <span
                            style={{
                              fontSize: 10,
                              color: theme.textMuted
                            }}
                          >
                            rainbow
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4
                        }}
                      >
                        <AdminButton
                          theme={theme}
                          label={u.rainbowName ? "Stop rainbow" : "Rainbow"}
                          onClick={() => handleToggleRainbowName(u.id)}
                        />
                        <AdminButton
                          theme={theme}
                          label="Random nick"
                          onClick={() => handleRandomNickname(u.id)}
                        />
                      </div>
                    </div>
                  ))}

                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <AdminButton
                    theme={theme}
                    label="System ping (all chats)"
                    onClick={handleSystemPing}
                  />
                  <AdminButton
                    theme={theme}
                    label="Explode current chat"
                    onClick={handleExplodeChat}
                  />
                </div>
              </section>
            </div>
          </div>
        )}

        {/* settings panel */}
        {settingsOpen && (
          <SettingsPanel
            theme={theme}
            currentUser={currentUser}
            isOwner={isOwner}
            onClose={() => setSettingsOpen(false)}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
            onChangeAccent={handleChangeAccent}
          />
        )}
      </div>
    </div>
  );
};

// ========= small components =========

const AdminButton: React.FC<{
  theme: Theme;
  label: string;
  onClick: () => void;
}> = ({ theme, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      fontSize: 10,
      padding: "3px 6px",
      borderRadius: 4,
      border: "none",
      background: theme.bgLighter,
      color: theme.text,
      cursor: "pointer"
    }}
  >
    {label}
  </button>
);

const CreateServerView: React.FC<{
  theme: Theme;
  onCreate: (name: string) => void;
}> = ({ theme, onCreate }) => {
  const [name, setName] = useState("");
  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        background: theme.bgDarker,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: 360,
          maxWidth: "100%",
          background: theme.bgLight,
          borderRadius: 10,
          border: `1px solid ${theme.border}`,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600
          }}
        >
          Create a new server
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.textMuted
          }}
        >
          Name it. Chaos comes later.
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My epic server"
          style={{
            borderRadius: 6,
            border: `1px solid ${theme.border}`,
            background: theme.bgDark,
            color: theme.text,
            fontSize: 13,
            padding: "6px 8px",
            outline: "none"
          }}
        />
        <button
          style={{
            marginTop: 4,
            padding: "6px 10px",
            borderRadius: 6,
            border: "none",
            background: theme.accent,
            color: "#000",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13
          }}
          onClick={() => onCreate(name)}
        >
          Create
        </button>
      </div>
    </div>
  );
};

const SettingsPanel: React.FC<{
  theme: Theme;
  currentUser: User;
  isOwner: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: {
    displayName?: string;
    username?: string;
    password?: string;
  }) => void;
  onChangeAccent: (accent: string) => void;
}> = ({
  theme,
  currentUser,
  isOwner,
  onClose,
  onLogout,
  onUpdateProfile,
  onChangeAccent
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [password, setPassword] = useState("");
  const [accentChoice, setAccentChoice] = useState(theme.accent);

  const applyChanges = () => {
    const updates: {
      displayName?: string;
      username?: string;
      password?: string;
    } = {};
    if (displayName.trim() && displayName.trim() !== currentUser.displayName) {
      updates.displayName = displayName.trim();
    }
    if (username.trim() && username.trim() !== currentUser.username) {
      updates.username = username.trim();
    }
    if (password.trim()) {
      updates.password = password;
    }
    if (Object.keys(updates).length > 0) {
      onUpdateProfile(updates);
      setPassword("");
    }
  };

  const applyAccent = (acc: string) => {
    setAccentChoice(acc);
    onChangeAccent(acc);
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        maxWidth: "100%",
        background: theme.bgLight,
        borderLeft: `1px solid ${theme.border}`,
        boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40
      }}
    >
      <div
        style={{
          height: 44,
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          fontSize: 13,
          fontWeight: 600
        }}
      >
        <span>Settings</span>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: theme.textMuted,
            cursor: "pointer",
            fontSize: 16
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}
      >
        {/* profile */}
        <section>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4
            }}
          >
            Profile
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6
            }}
          >
            <label
              style={{
                fontSize: 10,
                color: theme.textMuted
              }}
            >
              DISPLAY NAME
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: theme.bgDark,
                color: theme.text,
                fontSize: 12,
                padding: "5px 7px",
                outline: "none"
              }}
            />

            <label
              style={{
                fontSize: 10,
                color: theme.textMuted,
                marginTop: 6
              }}
            >
              USERNAME
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={currentUser.username.toLowerCase() === "cloudz"}
              style={{
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: currentUser.username.toLowerCase() === "cloudz"
                  ? theme.bgLighter
                  : theme.bgDark,
                color: theme.text,
                fontSize: 12,
                padding: "5px 7px",
                outline: "none"
              }}
            />

            <label
              style={{
                fontSize: 10,
                color: theme.textMuted,
                marginTop: 6
              }}
            >
              NEW PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: theme.bgDark,
                color: theme.text,
                fontSize: 12,
                padding: "5px 7px",
                outline: "none"
              }}
              placeholder="Leave empty to keep current"
            />

            <button
              onClick={applyChanges}
              style={{
                marginTop: 8,
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: theme.accent,
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12
              }}
            >
              Save changes
            </button>
          </div>
        </section>

        {/* theme */}
        <section>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4
            }}
          >
            Theme
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap"
            }}
          >
            {[
              "#4c7dff",
              "#f97316",
              "#22c55e",
              "#e11d48",
              "#a855f7",
              "#0ea5e9"
            ].map(color => (
              <button
                key={color}
                onClick={() => applyAccent(color)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border:
                    accentChoice === color
                      ? `2px solid ${theme.text}`
                      : `1px solid ${theme.border}`,
                  background: color,
                  cursor: "pointer"
                }}
              />
            ))}
          </div>
        </section>

        {/* owner note */}
        {isOwner && (
          <section>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4
              }}
            >
              Owner
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted
              }}
            >
              You become owner by using the username <b>cloudz</b>. Nothing
              about that is stored in this file.
            </div>
          </section>
        )}
      </div>

      <div
        style={{
          borderTop: `1px solid ${theme.border}`,
          padding: 8
        }}
      >
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            border: "none",
            background: theme.danger,
            color: "#000",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 12
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default CloudNetLayout;
