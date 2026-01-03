import React from "react";
import { io } from "socket.io-client";
import { ServerDock } from "./layout/ServerDock";
import { ChannelNav } from "./layout/ChannelNav";
import { ChatCore } from "./layout/ChatCore";
import { CloudZaiPanel } from "./layout/CloudZaiPanel";
import { TopBar } from "./layout/TopBar";
import { SystemConsole } from "./layout/SystemConsole";

const socket = io(
  window.location.origin.replace(/\/$/, ""),
  { transports: ["websocket"] }
);

export const CloudNetApp: React.FC = () => {
  const [activeServer, setActiveServer] = React.useState("server-1");
  const [activeChannel, setActiveChannel] = React.useState("channel-1");
  const [userId] = React.useState(() => "user-" + crypto.randomUUID());
  const [messages, setMessages] = React.useState<any[]>([]);
  const [presence, setPresence] = React.useState<string[]>([]);
  const [consoleLines, setConsoleLines] = React.useState<string[]>([]);

  React.useEffect(() => {
    const roomId = `${activeServer}:${activeChannel}`;
    socket.emit("join_room", { roomId, userId });

    const onMessage = (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onPresence = (payload: any) => {
      setPresence(payload.users);
      setConsoleLines((prev) => [
        ...prev,
        `[presence] ${payload.roomId}: ${payload.users.length} online`
      ]);
    };

    socket.on("message", onMessage);
    socket.on("presence_update", onPresence);

    return () => {
      socket.emit("leave_room", { roomId, userId });
      socket.off("message", onMessage);
      socket.off("presence_update", onPresence);
    };
  }, [activeServer, activeChannel, userId]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const roomId = `${activeServer}:${activeChannel}`;
    const payload = {
      roomId,
      authorId: userId,
      authorName: "You",
      content: text.trim()
    };
    socket.emit("send_message", payload);
  };

  return (
    <div className="cn-root">
      <TopBar server={activeServer} channel={activeChannel} />
      <div className="cn-main">
        <ServerDock activeServer={activeServer} onSelect={setActiveServer} />
        <ChannelNav activeChannel={activeChannel} onSelect={setActiveChannel} />
        <ChatCore
          messages={messages}
          onSend={sendMessage}
          presence={presence}
        />
        <CloudZaiPanel />
      </div>
      <SystemConsole lines={consoleLines} />
    </div>
  );
};
