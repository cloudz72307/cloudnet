import React from "react";

interface SystemConsoleProps {
  lines: string[];
}

export const SystemConsole: React.FC<SystemConsoleProps> = ({ lines }) => {
  return (
    <div className="cn-console">
      <div className="cn-console-label">System console</div>
      <div className="cn-console-body">
        {lines.slice(-50).map((line, idx) => (
          <div key={idx} className="cn-console-line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
