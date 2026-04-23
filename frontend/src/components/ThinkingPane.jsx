import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

export default function ThinkingPane({ thinkingText, isComplete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isExpanded && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thinkingText, isExpanded]);

  if (!thinkingText) return null;

  return (
    <div 
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        maxWidth: 300,
        alignSelf: 'flex-start',
        opacity: isComplete ? 0.5 : 1,
        transition: 'opacity 0.5s'
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={13} color="var(--accent-blue)" style={!isComplete ? { animation: 'pulse-soft 2s ease-in-out infinite' } : { opacity: 0.4 }} />
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 10, 
            letterSpacing: '0.12em', 
            color: 'var(--text-tertiary)', 
            textTransform: 'uppercase' 
          }}>
            Internal Reasoning
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} color="var(--text-muted)" />
        ) : (
          <ChevronDown size={14} color="var(--text-muted)" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div 
          className="custom-scrollbar scanline-bg"
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            padding: '0 14px 14px',
            position: 'relative'
          }}
        >
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 11, 
            lineHeight: 1.7, 
            color: 'rgba(255,255,255,0.45)',
            whiteSpace: 'pre-wrap'
          }}>
            {thinkingText}
          </div>
          
          {isComplete && (
            <div style={{ 
              marginTop: 12, 
              fontFamily: 'var(--font-mono)', 
              fontSize: 10, 
              color: 'var(--text-muted)', 
              fontStyle: 'italic' 
            }}>
              Reasoning complete.
            </div>
          )}
          
          {!isComplete && (
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 12,
              background: 'var(--accent-blue)',
              animation: 'pulse-soft 1s ease-in-out infinite',
              marginLeft: 4,
              verticalAlign: 'middle'
            }} />
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
