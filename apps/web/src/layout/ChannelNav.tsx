import React from "react";

const CHANNELS = ["channel-1", "channel-2", "channel-3"];

interface ChannelNavProps {
  activeChannel: string;
  onSelect: (id: string) => void;
}

export const ChannelNav: React.FC<ChannelNavProps> = ({
  activeChannel,
  onSelect
}) => {
  return (
    <div className="cn-channel-nav">
      <div className="cn-channel-nav-header">Channels</div>
      <div className="cn-channel-list">
        {CHANNELS.map((id) => {
          const active = id === activeChannel;
          return (
            <button
              key={id}
              className={`cn-channel-item ${
                active ? "cn-channel-item-active" : ""
              }`}
              onClick={() => onSelect(id)}
            >
              <span className="cn-channel-hash">#</span>
              <span>{id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
