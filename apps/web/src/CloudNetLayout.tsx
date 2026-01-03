import React, { useEffect, useMemo, useState } from "react";
import { api, setToken } from "./api";
import { getSocket, joinChat, leaveChat } from "./socket";
import { Chat, Friend, Message, User } from "./types";

type ThemePreset = "cloudz" | "discord" | "midnight" | "terminal" | "vapor";

type Theme = {
  bg: string;
  bgLight: string;
  bgDark: string;
  bgChat: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  border: string;
};

type PresenceEntry = { id: string; label: string };

type Settings = {
  themePreset: ThemePreset;
  customAccent: string;
  customBg: string;
  customBgLight: string;
  customBgDark: string;
  customBgChat: string;
  customText: string;
  customTextMuted: string;
  fontSize: number;
  bubbleRadius: number;
  compactMode: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  showCloudZai: boolean;
  showConsole: boolean;
  developerMode: boolean;
};

type ProfileSettings = {
  displayName: string;
  customUsername: string;
  pfpDataUrl: string | null;
};

const STORAGE_KEYS = {
  settings: "cloudnet_settings",
  profile: "cloudnet_profile"
};

const DEFAULT_SETTINGS: Settings = {
  themePreset: "cloudz",
  customAccent: "#00c8ff",
  customBg: "#1e1f22",
  customBgLight: "#2b2d31",
  customBgDark: "#1a1b1e",
  customBgChat: "#313338",
  customText: "#f2f3f5",
  customTextMuted: "#b5bac1",
  fontSize: 14,
  bubbleRadius: 8,
  compactMode: false,
  highContrast: false,
  reducedMotion: false,
  showCloudZai: true,
  showConsole: true,
  developerMode: false
};

const DEFAULT_PROFILE: ProfileSettings = {
  displayName: "",
  customUsername: "",
  pfpDataUrl: null
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function loadProfile(): ProfileSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile: ProfileSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

function getPresetTheme(preset: ThemePreset): Theme {
  switch (preset) {
    case "discord":
      return {
        bg: "#202225",
        bgLight: "#2f3136",
        bgDark: "#18191c",
        bgChat: "#36393f",
        text: "#f2f3f5",
        textMuted: "#b9bbbe",
        accent: "#5865f2",
        accentSoft: "rgba(88, 101, 242, 0.18)",
        border: "rgba(255,255,255,0.06)"
      };
    case "midnight":
      return {
        bg: "#050810",
        bgLight: "#101320",
        bgDark: "#040612",
        bgChat: "#141826",
        text: "#f5f7ff",
        textMuted: "#9ca3c0",
        accent: "#00c8ff",
        accentSoft: "rgba(0, 200, 255, 0.18)",
        border: "rgba(255,255,255,0.08)"
      };
    case "terminal":
      return {
        bg: "#050505",
        bgLight: "#101010",
        bgDark: "#000000",
        bgChat: "#111111",
        text: "#e5ffe5",
        textMuted: "#85a785",
        accent: "#00ff5c",
        accentSoft: "rgba(0, 255, 92, 0.18)",
        border: "rgba(0,255,92,0.3)"
      };
    case "vapor":
      return {
        bg: "#0b101c",
        bgLight: "#141931",
        bgDark: "#070815",
        bgChat: "#181d3a",
        text: "#fdf2ff",
        textMuted: "#c0b2ff",
        accent: "#ff6bcb",
        accentSoft: "rgba(255, 107, 203, 0.18)",
        border: "rgba(255,255,255,0.1)"
      };
    case "cloudz":
    default:
      return {
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
  }
}

function mergeTheme(settings: Settings): Theme {
  const base = getPresetTheme(settings.themePreset);
  const accent = settings.customAccent || base.accent;
  const text = settings.customText || base.text;
  const textMuted = settings.customTextMuted || base.textMuted;

  const theme: Theme = {
    bg: settings.customBg || base.bg,
    bgLight: settings.customBgLight || base.bgLight,
    bgDark: settings.customBgDark || base.bgDark,
    bgChat: settings.customBgChat || base.bgChat,
    text,
    textMuted,
    accent,
    accentSoft:
      settings.highContrast
        ? "rgba(255,255,255,0.12)"
        : `rgba(${parseInt(accent.slice(1, 3), 16)}, ${parseInt(
            accent.slice(3, 5),
            16
          )}, ${parseInt(accent.slice(5, 7), 16)}, 0.18)`,
    border: settings.highContrast ? "rgba(255,255,255,0.25)" : base.border
  };

  return theme;
}

export const CloudNetLayout: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [profile, setProfile] = useState<ProfileSettings>(() => loadProfile());
  const theme = useMemo(() => mergeTheme(settings), [settings]);

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

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showCloudZaiPanel, setShowCloudZaiPanel] = useState(
    settings.showCloudZai
  );
  const [showConsolePanel, setShowConsolePanel] = useState(
    settings.showConsole
  );

  const [presenceLines, setPresenceLines] = useState<PresenceEntry[]>([]);

  const [pfpDragActive, setPfpDragActive] = useState(false);

  useEffect(() => {
    saveSettings({
      ...settings,
      showCloudZai: showCloudZaiPanel,
      showConsole: showConsolePanel
    });
  }, [settings, showCloudZaiPanel, showConsolePanel]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        setUser(res.user);
      } catch {
        // not logged in
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket({
      onMessage: (msg) => {
        setMessages((prev) => [...prev, msg]);

        if (!settings.reducedMotion) {
          setPresenceLines((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              label: `[message] ${msg.chatId}: ${msg.content.slice(0, 32)}`
            },
            ...prev.slice(0, 100)
          ]);
        }
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
  }, [user, settings.reducedMotion]);

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
        // still using localStorage; could be swapped to session later
      }

      setToken(res.token);
      setUser(res.user);

      setProfile((prev) => ({
        ...prev,
        displayName: prev.displayName || res.user.username,
        customUsername: prev.customUsername || res.user.username
      }));
    } catch (err: any) {
      setAuthError(err?.error || "auth_failed");
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChatId || !inputValue.trim()) return;
    const content = inputValue.trim();
    setInputValue("");
    await api.sendMessage(activeChatId, content);
  }

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const effectiveDisplayName = profile.displayName || user?.username || "you";
  const effectiveUsername = profile.customUsername || user?.username || "you";

  function handleSettingsChange<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function handleProfileChange<K extends keyof ProfileSettings>(
    key: K,
    value: ProfileSettings[K]
  ) {
    setProfile((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function handlePfpFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        handleProfileChange("pfpDataUrl", result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handlePfpDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setPfpDragActive(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith("image/")) return;
    handlePfpFile(file);
  }

  function handlePfpDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setPfpDragActive(true);
  }

  function handlePfpDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setPfpDragActive(false);
  }

  function handlePfpInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    handlePfpFile(file);
  }

  const fontSize = settings.fontSize;
  const bubbleRadius = settings.bubbleRadius;
  const compact = settings.compactMode;

  if (!authChecked) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          background: theme.bg,
          color: theme.text,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          background: theme.bg,
          color: theme.text,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: 340,
            padding: 20,
            borderRadius: 12,
            background: theme.bgDark,
            border: `1px solid ${theme.border}`
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 4
            }}
          >
            CloudNET
          </div>
          <div
            style={{
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 16
            }}
          >
            Sign in to your Cloud
          </div>
          <form
            onSubmit={handleAuthSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <input
              style={{
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                padding: "8px 10px",
                fontSize: 13,
                background: theme.bg,
                color: theme.text
              }}
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
            />
            <input
              style={{
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                padding: "8px 10px",
                fontSize: 13,
                background: theme.bg,
                color: theme.text
              }}
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                color: theme.textMuted
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              <span>Remember Me</span>
            </label>
            {authError && (
              <div style={{ color: "#ff5c5c", fontSize: 12 }}>
                {authError}
              </div>
            )}
            <button
              type="submit"
              style={{
                marginTop: 4,
                borderRadius: 6,
                border: "none",
                background: theme.accent,
                color: theme.bgDark,
                fontWeight: 600,
                fontSize: 13,
                padding: "8px 10px",
                cursor: "pointer"
              }}
            >
              {authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: theme.textMuted
            }}
          >
            {authMode === "login" ? (
              <>
                No account?{" "}
                <span
                  style={{
                    color: theme.accent,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                  onClick={() => setAuthMode("register")}
                >
                  Create one
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span
                  style={{
                    color: theme.accent,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: theme.bg,
        color: theme.text,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        overflow: "hidden"
      }}
    >
      <div
        style={{
          width: 72,
          background: theme.bgDark,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
          gap: 10,
          borderRight: `1px solid ${theme.border}`
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: theme.accentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700
          }}
        >
          C
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.text,
            fontSize: 18,
            cursor: "pointer",
            transition: "background 0.15s ease",
            borderRadius: 16,
            backgroundColor: theme.accentSoft
          }}
        >
          S
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.text,
            fontSize: 18,
            cursor: "pointer",
            transition: "background 0.15s ease",
            borderRadius: 16
          }}
        >
          +
        </div>
      </div>

      <div
        style={{
          width: 260,
          background: theme.bgLight,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${theme.border}`
        }}
      >
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            borderBottom: `1px solid ${theme.border}`,
            fontWeight: 600,
            fontSize: 14
          }}
        >
          <div style={{ color: theme.text }}>server-1</div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 8px 8px 8px"
          }}
        >
          <section style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                letterSpacing: 0.5,
                marginBottom: 6
              }}
            >
              TEXT CHANNELS
            </div>
            {chats
              .filter((c) => c.type === "channel")
              .map((c) => {
                const active = c.id === activeChatId;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: compact ? "2px 6px" : "4px 8px",
                      borderRadius: 6,
                      fontSize,
                      cursor: "pointer",
                      marginBottom: 2,
                      backgroundColor: active ? theme.accentSoft : "transparent",
                      color: active ? theme.text : theme.textMuted
                    }}
                    onClick={() => setActiveChatId(c.id)}
                  >
                    <span style={{ marginRight: 6, opacity: 0.9 }}>#</span>
                    <span>{c.name || "channel"}</span>
                    {settings.developerMode && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          opacity: 0.6
                        }}
                      >
                        {c.id}
                      </span>
                    )}
                  </div>
                );
              })}
          </section>

          <section style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                letterSpacing: 0.5,
                marginBottom: 6
              }}
            >
              DIRECT MESSAGES
            </div>
            {chats
              .filter((c) => c.type === "dm")
              .map((c) => {
                const active = c.id === activeChatId;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: compact ? "2px 6px" : "4px 8px",
                      borderRadius: 6,
                      fontSize,
                      cursor: "pointer",
                      marginBottom: 2,
                      backgroundColor: active ? theme.accentSoft : "transparent",
                      color: active ? theme.text : theme.textMuted
                    }}
                    onClick={() => setActiveChatId(c.id)}
                  >
                    <span>{c.name || "DM"}</span>
                    {settings.developerMode && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          opacity: 0.6
                        }}
                      >
                        {c.id}
                      </span>
                    )}
                  </div>
                );
              })}
          </section>

          <section style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                letterSpacing: 0.5,
                marginBottom: 6
              }}
            >
              GROUP CHATS
            </div>
            {chats
              .filter((c) => c.type === "gc")
              .map((c) => {
                const active = c.id === activeChatId;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: compact ? "2px 6px" : "4px 8px",
                      borderRadius: 6,
                      fontSize,
                      cursor: "pointer",
                      marginBottom: 2,
                      backgroundColor: active ? theme.accentSoft : "transparent",
                      color: active ? theme.text : theme.textMuted
                    }}
                    onClick={() => setActiveChatId(c.id)}
                  >
                    <span>{c.name || "Group"}</span>
                    {settings.developerMode && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          opacity: 0.6
                        }}
                      >
                        {c.id}
                      </span>
                    )}
                  </div>
                );
              })}
          </section>

          <section>
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                letterSpacing: 0.5,
                marginBottom: 6
              }}
            >
              FRIENDS
            </div>
            {friends.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize,
                  marginBottom: 4
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: theme.bgDark,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: theme.textMuted
                  }}
                >
                  {f.username.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ color: theme.text }}>{f.username}</div>
                {settings.developerMode && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      opacity: 0.6
                    }}
                  >
                    {f.id}
                  </span>
                )}
              </div>
            ))}
          </section>
        </div>

        <div
          style={{
            height: 60,
            borderTop: `1px solid ${theme.border}`,
            padding: "0 8px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%"
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: theme.bgDark,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              {profile.pfpDataUrl ? (
                <img
                  src={profile.pfpDataUrl}
                  alt="pfp"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color: theme.textMuted
                  }}
                >
                  {effectiveDisplayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 12
              }}
            >
              <div style={{ color: theme.text }}>
                {effectiveDisplayName}
              </div>
              <div
                style={{
                  color: theme.textMuted,
                  fontSize: 11
                }}
              >
                @{effectiveUsername}
              </div>
            </div>
            <button
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                color: theme.textMuted,
                fontSize: 12,
                cursor: "pointer"
              }}
              onClick={() => setShowSettingsPanel(true)}
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0
        }}
      >
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
            <span
              style={{
                fontSize: 18,
                color: theme.textMuted
              }}
            >
              #
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600
              }}
            >
              {activeChat
                ? activeChat.name || activeChat.id
                : "Select a chat"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8
            }}
          >
            <button
              style={{
                background: theme.bgLight,
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
                color: theme.textMuted,
                cursor: "pointer"
              }}
              onClick={() =>
                setShowCloudZaiPanel((v) => !v)
              }
            >
              CloudZAI {showCloudZaiPanel ? "▾" : "▸"}
            </button>
            <button
              style={{
                background: theme.bgLight,
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
                color: theme.textMuted,
                cursor: "pointer"
              }}
              onClick={() =>
                setShowConsolePanel((v) => !v)
              }
            >
              Console {showConsolePanel ? "▾" : "▸"}
            </button>
            <button
              style={{
                background: theme.bgLight,
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
                color: theme.textMuted,
                cursor: "pointer"
              }}
              onClick={() =>
                setShowSettingsPanel((v) => !v)
              }
            >
              Settings
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: theme.bgChat,
            position: "relative"
          }}
        >
          <div
            style={{
              flex: 1,
              padding: compact ? "8px 10px" : "12px 16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: compact ? 4 : 8
            }}
            className="messages-pane"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    fontSize: Math.max(10, fontSize - 2)
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600
                    }}
                  >
                    {m.senderId === user.id
                      ? effectiveDisplayName
                      : m.senderId}
                  </span>
                  <span
                    style={{
                      fontSize: Math.max(9, fontSize - 3),
                      color: theme.textMuted
                    }}
                  >
                    {new Date(
                      m.createdAt
                    ).toLocaleTimeString()}
                  </span>
                  {settings.developerMode && (
                    <span
                      style={{
                        fontSize: 9,
                        color: theme.textMuted
                      }}
                    >
                      {m.id}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    background: theme.bgLight,
                    borderRadius: bubbleRadius,
                    padding: compact ? "4px 8px" : "6px 10px",
                    fontSize
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <form
            style={{
              padding: "8px 12px",
              borderTop: `1px solid ${theme.border}`,
              background: theme.bgDark
            }}
            onSubmit={handleSend}
          >
            <input
              style={{
                width: "100%",
                borderRadius: 8,
                border: "none",
                outline: "none",
                padding: "8px 10px",
                background: theme.bgLight,
                color: theme.text,
                fontSize
              }}
              placeholder={
                activeChat
                  ? activeChat.type === "channel"
                    ? `Message #${activeChat.name || "channel"}`
                    : `Message ${
                        activeChat.name || "chat"
                      }`
                  : "Select a chat"
              }
              value={inputValue}
              onChange={(e) =>
                setInputValue(e.target.value)
              }
              disabled={!activeChat}
            />
          </form>
          {showConsolePanel && (
            <div
              style={{
                borderTop: `1px solid ${theme.border}`,
                background: theme.bgDark,
                height: 120,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: theme.textMuted,
                  padding: "4px 10px"
                }}
              >
                System Console
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "0 10px 6px 10px",
                  overflowY: "auto",
                  fontSize: 12
                }}
              >
                {presenceLines.map((p) => (
                  <div
                    key={p.id}
                    style={{ color: theme.textMuted }}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCloudZaiPanel && (
        <div
          style={{
            width: 280,
            background: theme.bgLight,
            borderLeft: `1px solid ${theme.border}`,
            display: "flex",
            flexDirection: "column"
          }}
          className="cloudzai-panel"
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                CloudZAI
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: theme.textMuted
                }}
              >
                Ambient insight layer
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "10px 12px",
              fontSize: 13,
              color: theme.textMuted,
              flex: 1,
              overflowY: "auto"
            }}
          >
            <p style={{ marginBottom: 8 }}>
              CloudZAI will skim this channel and surface
              highlights, patterns, and anomalies in real
              time.
            </p>
            <p style={{ marginBottom: 8 }}>
              Next update, this panel becomes fully
              chattable — direct prompts, insights, and
              commentary woven into your channels.
            </p>
            {settings.developerMode && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  opacity: 0.8
                }}
              >
                Developer mode: you can wire this panel to
                your AI endpoint and stream responses into
                a message list here.
              </p>
            )}
          </div>
        </div>
      )}

      {showSettingsPanel && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100vh",
            width: 340,
            background: theme.bgDark,
            borderLeft: `1px solid ${theme.border}`,
            display: "flex",
            flexDirection: "column",
            zIndex: 50
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Settings
            </div>
            <button
              style={{
                background: "transparent",
                border: "none",
                color: theme.textMuted,
                cursor: "pointer"
              }}
              onClick={() => setShowSettingsPanel(false)}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 12px",
              fontSize: 13,
              color: theme.text
            }}
          >
            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                color: theme.textMuted
              }}
            >
              Appearance
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16
              }}
            >
              <label>
                Theme preset
                <select
                  value={settings.themePreset}
                  onChange={(e) =>
                    handleSettingsChange(
                      "themePreset",
                      e.target
                        .value as ThemePreset
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: 4,
                    background: theme.bg,
                    color: theme.text,
                    borderRadius: 6,
                    border: `1px solid ${theme.border}`,
                    padding: "4px 6px",
                    fontSize: 13
                  }}
                >
                  <option value="cloudz">CloudZ</option>
                  <option value="discord">
                    Discord Dark
                  </option>
                  <option value="midnight">
                    Midnight
                  </option>
                  <option value="terminal">
                    Terminal Green
                  </option>
                  <option value="vapor">
                    Vaporwave
                  </option>
                </select>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }}
              >
                <span>Accent</span>
                <input
                  type="color"
                  value={settings.customAccent}
                  onChange={(e) =>
                    handleSettingsChange(
                      "customAccent",
                      e.target.value
                    )
                  }
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }}
              >
                <span>Background</span>
                <input
                  type="color"
                  value={settings.customBg}
                  onChange={(e) =>
                    handleSettingsChange(
                      "customBg",
                      e.target.value
                    )
                  }
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }}
              >
                <span>Sidebar</span>
                <input
                  type="color"
                  value={settings.customBgLight}
                  onChange={(e) =>
                    handleSettingsChange(
                      "customBgLight",
                      e.target.value
                    )
                  }
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }}
              >
                <span>Chat</span>
                <input
                  type="color"
                  value={settings.customBgChat}
                  onChange={(e) =>
                    handleSettingsChange(
                      "customBgChat",
                      e.target.value
                    )
                  }
                />
              </label>
              <label>
                Font size ({settings.fontSize}px)
                <input
                  type="range"
                  min={11}
                  max={18}
                  value={settings.fontSize}
                  onChange={(e) =>
                    handleSettingsChange(
                      "fontSize",
                      Number(e.target.value)
                    )
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Bubble radius ({settings.bubbleRadius}px)
                <input
                  type="range"
                  min={0}
                  max={16}
                  value={settings.bubbleRadius}
                  onChange={(e) =>
                    handleSettingsChange(
                      "bubbleRadius",
                      Number(e.target.value)
                    )
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.compactMode}
                  onChange={(e) =>
                    handleSettingsChange(
                      "compactMode",
                      e.target.checked
                    )
                  }
                />
                <span>Compact mode</span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={(e) =>
                    handleSettingsChange(
                      "highContrast",
                      e.target.checked
                    )
                  }
                />
                <span>High contrast</span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) =>
                    handleSettingsChange(
                      "reducedMotion",
                      e.target.checked
                    )
                  }
                />
                <span>Reduced motion</span>
              </label>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                color: theme.textMuted
              }}
            >
              Profile
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16
              }}
            >
              <label>
                Display name
                <input
                  style={{
                    width: "100%",
                    marginTop: 4,
                    background: theme.bg,
                    color: theme.text,
                    borderRadius: 6,
                    border: `1px solid ${theme.border}`,
                    padding: "4px 6px",
                    fontSize: 13
                  }}
                  value={profile.displayName}
                  onChange={(e) =>
                    handleProfileChange(
                      "displayName",
                      e.target.value
                    )
                  }
                />
              </label>
              <label>
                Username (local label)
                <input
                  style={{
                    width: "100%",
                    marginTop: 4,
                    background: theme.bg,
                    color: theme.text,
                    borderRadius: 6,
                    border: `1px solid ${theme.border}`,
                    padding: "4px 6px",
                    fontSize: 13
                  }}
                  value={profile.customUsername}
                  onChange={(e) =>
                    handleProfileChange(
                      "customUsername",
                      e.target.value
                    )
                  }
                />
              </label>
              <div>
                <div
                  style={{
                    marginBottom: 4
                  }}
                >
                  Profile picture
                </div>
                <div
                  onDrop={handlePfpDrop}
                  onDragOver={handlePfpDragOver}
                  onDragLeave={handlePfpDragLeave}
                  style={{
                    borderRadius: 8,
                    border: `1px dashed ${theme.border}`,
                    padding: 10,
                    textAlign: "center",
                    fontSize: 12,
                    color: theme.textMuted,
                    marginBottom: 8,
                    background: pfpDragActive
                      ? theme.accentSoft
                      : "transparent",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    Drag image here or click to upload
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePfpInputChange}
                    style={{ display: "none" }}
                    id="pfp-input"
                  />
                  <label
                    htmlFor="pfp-input"
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: `1px solid ${theme.border}`,
                      background: theme.bgLight,
                      color: theme.text,
                      cursor: "pointer"
                    }}
                  >
                    Choose file
                  </label>
                </div>
                {profile.pfpDataUrl && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        overflow: "hidden"
                      }}
                    >
                      <img
                        src={profile.pfpDataUrl}
                        alt="pfp-prev"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    </div>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: theme.textMuted,
                        fontSize: 12,
                        cursor: "pointer"
                      }}
                      onClick={() =>
                        handleProfileChange(
                          "pfpDataUrl",
                          null
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                color: theme.textMuted
              }}
            >
              Behavior
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <input
                  type="checkbox"
                  checked={showCloudZaiPanel}
                  onChange={(e) =>
                    setShowCloudZaiPanel(e.target.checked)
                  }
                />
                <span>CloudZAI panel visible</span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <input
                  type="checkbox"
                  checked={showConsolePanel}
                  onChange={(e) =>
                    setShowConsolePanel(e.target.checked)
                  }
                />
                <span>Console visible</span>
              </label>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                color: theme.textMuted
              }}
            >
              Developer
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.developerMode}
                  onChange={(e) =>
                    handleSettingsChange(
                      "developerMode",
                      e.target.checked
                    )
                  }
                />
                <span>Developer mode</span>
              </label>
            </div>

            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                marginTop: 8
              }}
            >
              Next update: full CloudZAI chat wiring +
              AI personalities live in this same file.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
