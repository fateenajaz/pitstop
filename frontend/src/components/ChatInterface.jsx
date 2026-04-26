import React, { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import DiagnosticBrief from './DiagnosticBrief';

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

function ClarificationMessage({ question, why }) {
  return (
    <Motion.div
      className="chat-msg chat-msg-agent"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div style={{ fontSize: 12, color: 'var(--accent-amber)', marginBottom: 8, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Clarification Needed
      </div>
      <div style={{ marginBottom: why ? 8 : 0 }}>{question}</div>
      {why && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{why}</div>}
    </Motion.div>
  );
}

export default function ChatInterface({ messages, isTyping, children, garages = [] }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateStickiness = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 96;
    };

    updateStickiness();
    container.addEventListener('scroll', updateStickiness, { passive: true });

    return () => {
      container.removeEventListener('scroll', updateStickiness);
    };
  }, []);

  useEffect(() => {
    if (bottomRef.current && shouldStickToBottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'auto' });
    }
  }, [messages, isTyping]);

  return (
    <div
      ref={containerRef}
      className="chat-container custom-scrollbar"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        paddingBottom: 90,
      }}
    >
      <AnimatePresence>
        {messages.map((msg, i) => {
          switch (msg.type) {
            case 'user':
              return <UserMessage key={i} text={msg.text} imageUrl={msg.imageUrl} />;
            
            case 'agent':
              return <AgentMessage key={i}>{msg.content}</AgentMessage>;
            
            case 'agent-raw':
              return <AgentMessage key={i} noPadding>{msg.content}</AgentMessage>;

            case 'brief':
              return (
                <AgentMessage key={i} noPadding>
                  <DiagnosticBrief brief={msg.brief} garages={garages} />
                </AgentMessage>
              );

            case 'clarification':
              return <ClarificationMessage key={i} question={msg.question} why={msg.why} />;
            
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

export { UserMessage, AgentMessage, ClarificationMessage, TypingIndicator };
