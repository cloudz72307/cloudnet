import React, { useState, useMemo } from "react";

type Channel = {
  id: string;
  name: string;
};

type Message = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
};

type PresenceEntry = {
  id: string;
  label: string;
};

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

const mockChannels: Channel[] = [
  { id: "channel-1", name: "channel-1" },
  { id: "channel-2", name: "channel-2" },
  { id: "channel-3", name: "channel-3" }
];

const mockMessages: Record<string, Message[]> = {
  "channel-1": [
    {
      id: "m1",
      author: "you",
      content: "Welcome to channel-1",
      timestamp: "1:00 AM"
    }
  ],
  "channel-2": [
    { id: "m2", author: "you", content: "neil", timestamp: "1:00:23 AM" },
    {
      id: "m3",
      author: "you",
      content: "neil say smth",
      timestamp: "1:00:40 AM"
    },
    {
      id: "m4",
      author: "you",
      content: "its cloudzypoo",
      timestamp: "1:00:42 AM"
    },
    { id: "m5", author: "you", content: "e", timestamp: "1:04:03 AM" },
    { id: "m6", author: "you", content: "loser", timestamp: "1:04:56 AM" },
    {
      id: "m7",
      author: "you",
      content: "i have to add MOBILE MODE",
      timestamp: "1:04:59 AM"
    },
    {
      id: "m8",
      author: "you",
      content: "JUST FOR YOU",
      timestamp: "1:05:01 AM"
    }
  ],
  "channel-3": [
    {
      id: "m9",
      author: "you",
      content: "Quiet in channel-3",
      timestamp: "1:06 AM"
    }
  ]
};

const mockPresence: PresenceEntry[] = [
  { id: "p1", label: "[presence] server-1\\channel-1: 2 online" },
  { id: "p2", label: "[presence] server-1\\channel-2: 3 online" },
  { id: "p3", label: "[presence] server-1\\channel-3: 1 online" },
  { id: "p4", label: "[presence] server-1\\channel-2: 1 online" }
];

export const CloudNetLayout: React.FC = () => {
  const [activeChannelId, setActiveChannelId] = useState<string>("channel-2");
  const [showCloudZai, setShowCloudZai] = useState<boolean>(true);
  const [showConsole, setShowConsole] = useState<boolean>(true);
  const [inputValue, setInputValue] = useState<string>("");

  const messages = useMemo(
    () => mockMessages[activeChannelId] ?? [],
    [activeChannelId]
  );

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    // placeholder: in real app you would emit/send here
    setInputValue("");
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
            {mockChannels.map((ch) => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                active={ch.id === activeChannelId}
                onClick={() => setActiveChannelId(ch.id)}
              />
            ))}
          </section>
        </div>
        <div style={channelFooter}>
          <div style={userTag}>
            <div style={userAvatar}>Y</div>
            <div style={userInfo}>
              <div style={userName}>you</div>
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
              {mockChannels.find((c) => c.id === activeChannelId)?.name ??
                "channel"}
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
                  <span style={messageAuthor}>{m.author}</span>
                  <span style={messageTimestamp}>{m.timestamp}</span>
                </div>
                <div style={messageBubble}>{m.content}</div>
              </div>
            ))}
          </div>
          <form style={inputBar} onSubmit={handleSend}>
            <input
              style={input}
              placeholder={`Message #${
                mockChannels.find((c) => c.id === activeChannelId)?.name ??
                "channel"
              }`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </form>
          {showConsole && (
            <div style={consoleBar} className="console-bar">
              <div style={consoleHeader}>System Console</div>
              <div style={consoleBody}>
                {mockPresence.map((p) => (
                  <div key={p.id} style={consoleLine}>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CLOUDZAI PANEL (TOGGLEABLE) */}
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
              In the real version, this panel reacts to message volume, sentiment,
              and event spikes — without being noisy.
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
  channel: Channel;
  active?: boolean;
  onClick: () => void;
}> = ({ channel, active, onClick }) => {
  return (
    <div
      style={{
        ...channelItem,
        backgroundColor: active ? theme.accentSoft : "transparent",
        color: active ? theme.text : theme.textMuted
      }}
      onClick={onClick}
    >
      <span style={{ marginRight: 6, opacity: 0.9 }}>#</span>
      <span>{channel.name}</span>
    </div>
  );
};

// --- Styles ---

const root: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  width: "100vw",
  background: theme.bg,
  color: theme.text,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  overflow: "hidden"
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
  fontWeight: 700,
  cursor: "default"
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
  height: 96,
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
