import React from "react";

interface Message {
  id?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt?: string;
}

interface ChatCoreProps {
  messages: Message[];
  onSend: (text: string) => void;
  presence: string[];
}

export const ChatCore: React.FC<ChatCoreProps> = ({
  messages,
  onSend,
  presence
}) => {
  const [input, setInput] = React.useState("");
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input);
        setInput("");
      }
    }
  };

  return (
    <div className="cn-chat-core">
      <div className="cn-chat-header">
        <div className="cn-chat-title">Chat</div>
        <div className="cn-chat-presence">{presence.length} online</div>
      </div>
      <div className="cn-chat-messages" ref={listRef}>
        {messages.map((m, idx) => (
          <div key={m.id ?? idx} className="cn-msg-row">
            <div className="cn-msg-avatar" />
            <div className="cn-msg-body">
              <div className="cn-msg-meta">
                <span className="cn-msg-author">{m.authorName}</span>
                {m.createdAt && (
                  <span className="cn-msg-time">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="cn-msg-bubble">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="cn-chat-input-row">
        <div className="cn-chat-input-shell">
          <input
            className="cn-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message or /command..."
          />
          <button
            className="cn-chat-send"
            onClick={() => {
              if (input.trim()) {
                onSend(input);
                setInput("");
              }
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
