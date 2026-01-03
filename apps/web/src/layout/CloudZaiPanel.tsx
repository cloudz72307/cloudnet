import React from "react";

export const CloudZaiPanel: React.FC = () => {
  return (
    <div className="cn-zai-panel">
      <div className="cn-zai-header">
        <div className="cn-zai-orb" />
        <div>
          <div className="cn-zai-title">CloudZAI</div>
          <div className="cn-zai-subtitle">Ambient insight layer</div>
        </div>
      </div>
      <div className="cn-zai-body">
        <div className="cn-zai-hint">
          CloudZAI will summarize, highlight and comment on activity here.
        </div>
      </div>
    </div>
  );
};
