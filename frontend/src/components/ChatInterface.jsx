import React, { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg-agent" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)' }} />
        <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)' }} />
        <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)' }} />
      </div>
    </div>
  );
}

function UserMessage({ text, imageUrl }) {
  return (
    <Motion.div 
      className="chat-msg chat-msg-user"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {imageUrl && (
        <div style={{ marginBottom: 8, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <img src={imageUrl} alt="Uploaded" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      {text && <div>{text}</div>}
    </Motion.div>
  );
}

function AgentMessage({ children, noPadding = false }) {
  return (
    <Motion.div 
      className="chat-msg chat-msg-agent"
      style={noPadding ? { padding: 0, background: 'transparent', border: 'none' } : {}}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </Motion.div>
  );
}

export default function ChatInterface({ messages, isTyping, children }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div ref={containerRef} className="chat-container custom-scrollbar" style={{ paddingBottom: 90 }}>
      <AnimatePresence>
        {messages.map((msg, i) => {
          switch (msg.type) {
            case 'user':
              return <UserMessage key={i} text={msg.text} imageUrl={msg.imageUrl} />;
            
            case 'agent':
              return <AgentMessage key={i}>{msg.content}</AgentMessage>;
            
            case 'agent-raw':
              return <AgentMessage key={i} noPadding>{msg.content}</AgentMessage>;
            
            case 'system':
              return (
                <Motion.div
                  key={i}
                  className="chat-msg-system"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg.text}
                </Motion.div>
              );
            
            default:
              return null;
          }
        })}
      </AnimatePresence>

      {/* Inline children (evidence request, brief, etc) */}
      {children}

      {isTyping && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}

export { UserMessage, AgentMessage, TypingIndicator };
