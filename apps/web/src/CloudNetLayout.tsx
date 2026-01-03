import React, { useEffect, useMemo, useState } from "react";

// ===== Types =====

type Role = "owner" | "admin" | "user";

type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  banned?: boolean;
  kicked?: boolean;
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
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderRole: Role;
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

type ViewMode = "chat" | "home" | "createServer";

// ===== Theme / constants =====

const defaultTheme: Theme = {
  bgDark: "#050811",
  bgDarker: "#02040a",
  bgLight: "#0e1424",
  bgLighter: "#161d33",
  text: "#f5f7ff",
  textMuted: "#8b94b8",
  border: "#1f293d",
  accent: "#4c7dff",
  accentSoft: "rgba(76,125,255,0.18)",
  danger: "#ff4c5b"
};

const ownerBadgeStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: 4,
  background: "#ffffff", // white highlight
  color: "#f5c542", // gold text
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.4
};

// ===== Util =====

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

// ===== Initial data =====

const initialUsers: User[] = [
  {
    id: "u_cloudz",
    username: "cloudz",
    displayName: "cloudz",
    role: "owner"
  },
  {
    id: "u_alex",
    username: "alex",
    displayName: "alex",
    role: "user"
  },
  {
    id: "u_mira",
    username: "mira",
    displayName: "mira",
    role: "user"
  }
];

const initialChats: Chat[] = [
  {
    id: "c_server_general",
    name: "general",
    kind: "server",
    members: initialUsers.map(u => u.id)
  },
  {
    id: "c_dm_alex",
    name: "alex",
    kind: "dm",
    members: ["u_cloudz", "u_alex"]
  },
  {
    id: "c_group_build",
    name: "build-squad",
    kind: "group",
    members: ["u_cloudz", "u_alex", "u_mira"]
  }
];

let messageCounter = 1;

const initialMessages: Message[] = [
  {
    id: `m_${messageCounter++}`,
    chatId: "c_server_general",
    senderId: "u_alex",
    senderUsername: "alex",
    senderDisplayName: "alex",
    senderRole: "user",
    content: "Welcome to CloudNET.",
    createdAt: Date.now() - 1000 * 60 * 3
  },
  {
    id: `m_${messageCounter++}`,
    chatId: "c_server_general",
    senderId: "u_cloudz",
    senderUsername: "cloudz",
    senderDisplayName: "cloudz",
    senderRole: "owner",
    content: "I own this place. 🛡️",
    createdAt: Date.now() - 1000 * 60 * 2
  },
  {
    id: `m_${messageCounter++}`,
    chatId: "c_dm_alex",
    senderId: "u_alex",
    senderUsername: "alex",
    senderDisplayName: "alex",
    senderRole: "user",
    content: "Yo, DM test.",
    createdAt: Date.now() - 1000 * 60
  },
  {
    id: `m_${messageCounter++}`,
    chatId: "c_group_build",
    senderId: "u_mira",
    senderUsername: "mira",
    senderDisplayName: "mira",
    senderRole: "user",
    content: "Group chat vibes.",
    createdAt: Date.now() - 1000 * 30
  }
];

// ===== Main layout =====

const CloudNetLayout: React.FC = () => {
  const theme = defaultTheme;
  const isMobile = useIsMobile();

  // core state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [currentUserId, setCurrentUserId] = useState<string>("u_cloudz");
  const [activeChatId, setActiveChatId] = useState<string | null>(
    "c_server_general"
  );
  const [viewMode, setViewMode] = useState<ViewMode>("chat"); // "chat" | "home" | "createServer"

  // typing indicator (extra feature)
  const [draftsByChat, setDraftsByChat] = useState<Record<string, string>>({});
  const [typingByChat, setTypingByChat] = useState<Record<string, boolean>>({});

  // admin selection
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(
    null
  );

  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

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

  const dmAndGroupChats = useMemo(
    () =>
      chats.filter(
        c =>
          (c.kind === "dm" || c.kind === "group") &&
          c.members.includes(currentUser.id)
      ),
    [chats, currentUser.id]
  );

  const serverChats = useMemo(
    () => chats.filter(c => c.kind === "server"),
    [chats]
  );

  const friends = useMemo(
    () => users.filter(u => u.id !== currentUser.id),
    [users, currentUser.id]
  );

  const isOwner = currentUser.role === "owner";

  // ===== actions =====

  const sendMessage = (chatId: string) => {
    const draft = draftsByChat[chatId]?.trim();
    if (!draft) return;
    const now = Date.now();

    const newMessage: Message = {
      id: `m_${messageCounter++}`,
      chatId,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderDisplayName: currentUser.displayName,
      senderRole: currentUser.role,
      content: draft,
      createdAt: now
    };

    setMessages(prev => [...prev, newMessage]);
    setDraftsByChat(prev => ({ ...prev, [chatId]: "" }));
    setTypingByChat(prev => ({ ...prev, [chatId]: false }));
  };

  const handleDraftChange = (chatId: string, value: string) => {
    setDraftsByChat(prev => ({ ...prev, [chatId]: value }));
    setTypingByChat(prev => ({ ...prev, [chatId]: value.trim().length > 0 }));
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!isOwner) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleBanUser = (userId: string) => {
    if (!isOwner) return;
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
    if (!isOwner) return;
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
  };

  const handleResetUsername = (userId: string) => {
    if (!isOwner) return;
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

  const handleForceLogout = (userId: string) => {
    if (!isOwner) return;
    // local-only: just mark kicked and clear their membership in chats
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
          ? {
              ...c,
              members: c.members.filter(mId => mId !== userId)
            }
          : c
      )
    );
  };

  const handleCopyUsername = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.username);
    } catch {
      // ignore
    }
  };

  const handleCreateServer = (name: string) => {
    if (!name.trim()) return;
    const id = createId("c_server");
    const newChat: Chat = {
      id,
      name: name.trim(),
      kind: "server",
      members: users.map(u => u.id)
    };
    setChats(prev => [...prev, newChat]);
    setViewMode("chat");
    setActiveChatId(id);
  };

  const handleSwitchToHome = () => {
    setViewMode("home");
    setActiveChatId(null);
  };

  const handleSwitchToCreateServer = () => {
    setViewMode("createServer");
    setActiveChatId(null);
  };

  const handleOpenChat = (chatId: string) => {
    setViewMode("chat");
    setActiveChatId(chatId);
  };

  const handleMobileBackToSidebar = () => {
    setActiveChatId(null);
  };

  // ===== Render helpers =====

  const renderOwnerBadge = (role: Role) => {
    if (role !== "owner") return null;
    return <span style={ownerBadgeStyle}>OWNER🛡️</span>;
  };

  const renderRoleTag = (role: Role) => {
    if (role === "owner") return renderOwnerBadge(role);
    if (role === "admin")
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

  const getUserById = (id: string) => users.find(u => u.id === id) || null;

  const typingActive =
    activeChatId && typingByChat[activeChatId] && draftsByChat[activeChatId];

  // ===== Layout =====

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
      {/* Top app bar */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* C button = Home */}
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
          {/* + button = Create server */}
          <button
            style={{
              height: 28,
              width: 28,
              borderRadius: 999,
              border: "none",
              background:
                viewMode === "createServer" ? theme.accentSoft : "transparent",
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

        {/* current user summary */}
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
            {currentUser.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {currentUser.displayName}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  color: theme.textMuted
                }}
              >
                @{currentUser.username}
              </span>
              {renderRoleTag(currentUser.role)}
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden"
        }}
      >
        {/* Left sidebar: servers + chats */}
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
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${theme.border}`
          }}
        >
          {/* sidebar header */}
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              borderBottom: `1px solid ${theme.border}`,
              fontWeight: 600,
              fontSize: 14,
              justifyContent: "space-between"
            }}
          >
            <div style={{ color: theme.text }}>server-1</div>
            {isMobile && activeChatId && viewMode === "chat" && (
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textMuted,
                  fontSize: 13,
                  cursor: "pointer"
                }}
                onClick={handleMobileBackToSidebar}
              >
                Close
              </button>
            )}
          </div>

          {/* channels / chats */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 8px 8px 8px"
            }}
          >
            {/* Server channels */}
            <section style={{ marginBottom: 16 }}>
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

            {/* DM & group chats */}
            <section style={{ marginBottom: 16 }}>
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
            </section>
          </div>
        </div>

        {/* Center content: Home / CreateServer / Chat */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative"
          }}
        >
          {/* Top bar for center area */}
          <div
            style={{
              height: 48,
              background: theme.bgDark,
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              position: "relative"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {/* mobile back button */}
              {isMobile && activeChatId && viewMode === "chat" && (
                <button
                  style={{
                    background: "transparent",
                    border: "none",
                    color: theme.textMuted,
                    fontSize: 20,
                    marginRight: 4,
                    cursor: "pointer"
                  }}
                  onClick={handleMobileBackToSidebar}
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

            {/* typing indicator */}
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

          {/* Center body */}
          <div
            style={{
              flex: 1,
              display: "flex",
              minHeight: 0
            }}
          >
            {/* HOME VIEW */}
            {viewMode === "home" && (
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 16,
                  background: theme.bgDarker
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
                        No DMs yet. Touch grass or DM someone.
                      </div>
                    )}
                  </div>
                </div>

                {/* Friends */}
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
                            const dmExisting = chats.find(
                              c =>
                                c.kind === "dm" &&
                                c.members.includes(currentUser.id) &&
                                c.members.includes(friend.id)
                            );
                            if (dmExisting) {
                              handleOpenChat(dmExisting.id);
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
                        Forever alone mode enabled.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CREATE SERVER VIEW */}
            {viewMode === "createServer" && (
              <CreateServerView
                theme={theme}
                onCreate={handleCreateServer}
              />
            )}

            {/* CHAT VIEW */}
            {viewMode === "chat" && (
              <div
                style={{
                  flex: 1,
                  display: activeChat ? "flex" : "flex",
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
                    {/* messages list */}
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
                        const sender = getUserById(msg.senderId);
                        const isSelf = msg.senderId === currentUser.id;
                        const effectiveName =
                          msg.senderDisplayName || msg.senderUsername;

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
                                  fontWeight: 600
                                }}
                              >
                                {effectiveName}
                              </span>
                              {renderRoleTag(msg.senderRole)}
                              {sender?.banned && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: theme.danger
                                  }}
                                >
                                  (banned)
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                background: isSelf
                                  ? theme.accentSoft
                                  : theme.bgLight,
                                borderRadius: 8,
                                padding: "6px 10px",
                                fontSize: 13,
                                color: isSelf ? theme.accent : theme.text,
                                display: "inline-flex",
                                maxWidth: "80%",
                                position: "relative"
                              }}
                            >
                              <span>{msg.content}</span>

                              {isOwner && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: theme.textMuted,
                                    cursor: "pointer",
                                    fontSize: 10,
                                    marginLeft: 8
                                  }}
                                >
                                  ✕
                                </button>
                              )}
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
                          No messages yet. Be the chaos.
                        </div>
                      )}
                    </div>

                    {/* input + typing indicator bubble */}
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

        {/* Right admin panel (owner only, hidden on mobile) */}
        {!isMobile && isOwner && (
          <div
            style={{
              width: 260,
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
              Owner Control
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              {users.map(u => (
                <div
                  key={u.id}
                  style={{
                    borderRadius: 6,
                    border: `1px solid ${theme.border}`,
                    background:
                      adminSelectedUserId === u.id
                        ? theme.bgLighter
                        : theme.bgDark,
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
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
                        {u.displayName}{" "}
                        {u.role === "owner" && (
                          <span style={{ ...ownerBadgeStyle, fontSize: 9 }}>
                            OWNER🛡️
                          </span>
                        )}
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
                    <button
                      style={{
                        border: "none",
                        background: "transparent",
                        color: theme.textMuted,
                        cursor: "pointer",
                        fontSize: 10
                      }}
                      onClick={() =>
                        setAdminSelectedUserId(prev =>
                          prev === u.id ? null : u.id
                        )
                      }
                    >
                      {adminSelectedUserId === u.id ? "Hide" : "Tools"}
                    </button>
                  </div>

                  {adminSelectedUserId === u.id && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginTop: 4
                      }}
                    >
                      <button
                        style={adminButtonStyle(theme)}
                        onClick={() => handleCopyUsername(u.id)}
                      >
                        Copy Username
                      </button>
                      {u.id !== currentUser.id && (
                        <>
                          <button
                            style={adminButtonStyle(theme)}
                            onClick={() => handleBanUser(u.id)}
                          >
                            Ban
                          </button>
                          <button
                            style={adminButtonStyle(theme)}
                            onClick={() => handleKickUser(u.id)}
                          >
                            Kick
                          </button>
                          <button
                            style={adminButtonStyle(theme)}
                            onClick={() => handleResetUsername(u.id)}
                          >
                            Reset Name
                          </button>
                          <button
                            style={adminButtonStyle(theme)}
                            onClick={() => handleForceLogout(u.id)}
                          >
                            Force Logout
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {(u.banned || u.kicked) && (
                    <div
                      style={{
                        fontSize: 10,
                        color: theme.danger
                      }}
                    >
                      {u.banned && "Banned. "}
                      {u.kicked && "Kicked. "}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Small components / helpers =====

const adminButtonStyle = (theme: Theme): React.CSSProperties => ({
  fontSize: 10,
  padding: "3px 6px",
  borderRadius: 4,
  border: "none",
  background: theme.bgLighter,
  color: theme.text,
  cursor: "pointer"
});

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
          Give it a name. You can style the chaos later.
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

export default CloudNetLayout;
