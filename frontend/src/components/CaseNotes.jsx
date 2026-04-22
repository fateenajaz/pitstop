import React, { useState, useEffect } from 'react';

function TypewriterNote({ note, isLatest }) {
  const [displayedText, setDisplayedText] = useState(isLatest ? '' : note.note);
  const dateObj = new Date(note.timestamp);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  useEffect(() => {
    if (!isLatest) return;
    
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(note.note.substring(0, currentIndex + 1));
      currentIndex++;
      if (currentIndex === note.note.length) {
        clearInterval(intervalId);
      }
    }, 30);

    return () => clearInterval(intervalId);
  }, [note.note, isLatest]);

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline dot */}
      <div className="absolute left-[3.5px] top-1.5 w-[6px] h-[6px] rounded-full bg-[var(--accent-coral)] z-10" />
      
      <div className="flex gap-4 items-start">
        <div className="font-mono text-[11px] text-[var(--text-tertiary)] pt-0.5 w-10 shrink-0">
          {dateStr}
        </div>
        <div className="font-body text-[14px] text-[var(--text-secondary)] leading-relaxed">
          {displayedText}
          {isLatest && displayedText.length < note.note.length && (
            <span className="inline-block w-1.5 h-3 bg-[var(--accent-coral)] animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CaseNotes({ notes = [], activeVehicle }) {
  return (
    <div className="bg-transparent px-4">
      <div className="mb-6">
        <h3 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-1">
          Vehicle History
        </h3>
        <div className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase">
          {activeVehicle?.label} · DEMO-001
        </div>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        {notes.length > 0 && (
          <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[var(--border-light)]" />
        )}

        {notes.length === 0 ? (
          <div className="text-center py-8">
            <span className="font-body italic text-[13px] text-[var(--text-tertiary)]">
              No previous investigations.
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            {notes.map((note, idx) => (
              <TypewriterNote 
                key={`${note.timestamp}-${idx}`} 
                note={note} 
                isLatest={idx === notes.length - 1} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
