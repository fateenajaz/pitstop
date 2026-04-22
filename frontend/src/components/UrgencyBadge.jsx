import React from 'react';

export default function UrgencyBadge({ urgency, text }) {
  let bgColor = 'var(--urgent-low)';
  if (urgency === 'moderate') bgColor = 'var(--urgent-moderate)';
  if (urgency === 'high') bgColor = 'var(--urgent-high)';
  if (urgency === 'critical') bgColor = 'var(--urgent-critical)';

  return (
    <div 
      className="inline-block px-[14px] py-[6px] font-mono text-[11px] tracking-[0.1em] text-white"
      style={{ 
        backgroundColor: bgColor,
        borderRadius: '0 var(--radius-md) 0 0',
        opacity: 0.95
      }}
    >
      {text || urgency?.toUpperCase()}
    </div>
  );
}
