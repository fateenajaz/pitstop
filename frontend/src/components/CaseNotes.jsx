import React, { useState, useEffect } from 'react';

function TypewriterNote({ note, isLatest }) {
  const [displayedText, setDisplayedText] = useState(isLatest ? '' : note.note);
  const dateObj = new Date(note.timestamp);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  useEffect(() => {
    if (!isLatest) return;
    let idx = 0;
    const iv = setInterval(() => {
      setDisplayedText(note.note.substring(0, idx + 1));
      idx++;
      if (idx === note.note.length) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [note.note, isLatest]);

  return (
    <div style={{ position: 'relative', paddingLeft: 24, paddingBottom: 20 }}>
      <div style={{
        position: 'absolute', left: 3.5, top: 6,
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--accent-blue)', zIndex: 1
      }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', paddingTop: 2, width: 40, flexShrink: 0 }}>
          {dateStr}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {displayedText}
          {isLatest && displayedText.length < note.note.length && (
            <span style={{ display: 'inline-block', width: 6, height: 12, background: 'var(--accent-blue)', animation: 'pulse-soft 1s ease-in-out infinite', marginLeft: 4, verticalAlign: 'middle' }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CaseNotes({ notes = [], activeVehicle }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {activeVehicle?.name || activeVehicle?.label || 'Vehicle'} · History
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        {notes.length > 0 && (
          <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1, background: 'var(--border-subtle)' }} />
        )}
        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No previous investigations.
          </div>
        ) : (
          notes.map((note, idx) => (
            <TypewriterNote key={`${note.timestamp}-${idx}`} note={note} isLatest={idx === notes.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}
