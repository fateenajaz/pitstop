import React from 'react';

export default function UrgencyBadge({ urgency, text }) {
  let bg = 'var(--urgent-low)';
  if (urgency === 'moderate') bg = 'var(--urgent-moderate)';
  if (urgency === 'high') bg = 'var(--urgent-high)';
  if (urgency === 'critical') bg = 'var(--urgent-critical)';

  return (
    <div style={{
      display: 'inline-block',
      padding: '4px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.08em',
      color: 'white',
      backgroundColor: bg,
      borderRadius: 'var(--radius-sm)',
      textTransform: 'uppercase',
      fontWeight: 500
    }}>
      {text || urgency?.toUpperCase()}
    </div>
  );
}
