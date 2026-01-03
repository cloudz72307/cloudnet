import React from "react";
import ServerDock from "./ServerDock";
import ChannelNav from "./ChannelNav";
import TopBar from "./TopBar";
import ChatCore from "./ChatCore";
import CloudZaiPanel from "./CloudZaiPanel";

export default function App() {
  return (
    <div style={root}>
      <ServerDock />
      <ChannelNav />
      <div style={mainColumn}>
        <TopBar />
        <ChatCore />
      </div>
      <CloudZaiPanel />
    </div>
  );
}

const root: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  width: "100vw",
  background: "#1e1f22",
  color: "#f2f3f5",
  overflow: "hidden"
};

const mainColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0
};
