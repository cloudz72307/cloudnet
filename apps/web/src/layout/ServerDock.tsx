import React from "react";

const SERVERS = ["server-1", "server-2", "server-3"];

interface ServerDockProps {
  activeServer: string;
  onSelect: (id: string) => void;
}

export const ServerDock: React.FC<ServerDockProps> = ({
  activeServer,
  onSelect
}) => {
  return (
    <div className="cn-server-dock">
      <div className="cn-server-dock-inner">
        {SERVERS.map((id) => {
          const active = id === activeServer;
          return (
            <button
              key={id}
              className={`cn-server-pill ${
                active ? "cn-server-pill-active" : ""
              }`}
              onClick={() => onSelect(id)}
            >
              <span className="cn-server-dot" />
            </button>
          );
        })}
        <button className="cn-server-pill cn-server-pill-add">+</button>
      </div>
    </div>
  );
};
