import React from "react";

interface TopBarProps {
  server: string;
  channel: string;
}

export const TopBar: React.FC<TopBarProps> = ({ server, channel }) => {
  return (
    <div className="cn-topbar">
      <div className="cn-topbar-left">
        <div className="cn-topbar-title">CloudNET</div>
        <div className="cn-topbar-breadcrumb">
          <span>{server}</span>
          <span>/</span>
          <span>{channel}</span>
        </div>
      </div>
      <div className="cn-topbar-right">
        <div className="cn-presence-dot" />
        <span className="cn-topbar-text">Online</span>
      </div>
    </div>
  );
};
