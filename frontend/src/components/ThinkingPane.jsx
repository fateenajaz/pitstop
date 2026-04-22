import React, { useEffect, useRef, useState } from 'react';
import { cn } from './BudgetMeter';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ThinkingPane({ thinkingText, isComplete }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when text updates
  useEffect(() => {
    if (isExpanded && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thinkingText, isExpanded]);

  return (
    <div className={cn(
      "bg-[var(--bg-dark-2)] rounded-[var(--radius-lg)] p-5 flex flex-col font-mono relative overflow-hidden transition-opacity duration-500",
      isComplete ? "opacity-50" : "opacity-100"
    )}>
      {/* Header bar */}
      <div 
        className="flex justify-between items-center cursor-pointer mb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-[6px] h-[6px] rounded-full bg-[var(--accent-coral)]",
            !isComplete ? "animate-pulse" : "opacity-30"
          )} />
          <h3 className="text-[var(--text-tertiary)] text-[10px] tracking-[0.15em] uppercase">
            Opus 4.7 · Internal Reasoning
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
        )}
      </div>

      {isExpanded && (
        <div className="relative max-h-[320px] overflow-y-auto text-[var(--thinking-text)] text-[12px] leading-[1.7] scanline-bg custom-scrollbar pr-2">
          <div className="whitespace-pre-wrap">{thinkingText}</div>
          
          {isComplete && (
            <div className="mt-4 text-[var(--text-tertiary)] italic">
              Reasoning complete.
            </div>
          )}
          
          {!isComplete && (
            <span className="inline-block w-1.5 h-3 bg-[var(--accent-coral)] animate-pulse ml-1 align-middle" />
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(26,22,18,0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(217, 119, 87, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 119, 87, 0.5);
        }
      `}} />
    </div>
  );
}
