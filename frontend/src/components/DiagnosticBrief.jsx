import React, { useState } from 'react';
import UrgencyBadge from './UrgencyBadge';
import { motion } from 'framer-motion';

export default function DiagnosticBrief({ brief, garages }) {
  const [briefSent, setBriefSent] = useState(false);

  let fillColor = 'var(--urgent-low)';
  if (brief.urgency === 'moderate') fillColor = 'var(--urgent-moderate)';
  if (brief.urgency === 'high') fillColor = 'var(--urgent-high)';
  if (brief.urgency === 'critical') fillColor = 'var(--urgent-critical)';

  const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="brief-card"
      style={{ alignSelf: 'flex-start' }}
    >
      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: 10, 
              letterSpacing: '0.12em', 
              color: 'var(--text-tertiary)', 
              textTransform: 'uppercase',
              marginBottom: 4 
            }}>
              Diagnostic Brief
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {todayStr}
            </div>
          </div>
          <UrgencyBadge urgency={brief.urgency} text={brief.urgency_label} />
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 16 }} />

        {/* Primary Fault */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 10, 
            letterSpacing: '0.1em', 
            color: 'var(--text-tertiary)', 
            textTransform: 'uppercase',
            marginBottom: 6 
          }}>
            Primary Fault
          </div>
          <div style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 18, 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            marginBottom: 8 
          }}>
            {brief.primary_fault}
          </div>
          
          {/* Confidence bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', maxWidth: 160 }}>
              <div style={{ height: '100%', width: `${Math.round(brief.confidence * 100)}%`, background: fillColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {Math.round(brief.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 10, 
            letterSpacing: '0.1em', 
            color: 'var(--text-tertiary)', 
            textTransform: 'uppercase',
            marginBottom: 6 
          }}>
            What's happening
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            {brief.plain_explanation}
          </p>
        </div>

        {/* If ignored */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: 10, 
            letterSpacing: '0.1em', 
            color: 'var(--text-tertiary)', 
            textTransform: 'uppercase',
            marginBottom: 6 
          }}>
            If ignored
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            {brief.what_happens_if_ignored}
          </p>
        </div>

        {/* Cost + Action */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 0,
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden',
          marginBottom: 4
        }}>
          <div style={{ padding: 12, borderRight: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
              Est. Cost
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {brief.estimated_cost_band}
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
              Action
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {brief.recommended_action}
            </div>
          </div>
        </div>
      </div>

      {/* Garages */}
      {garages && garages.length > 0 && (
        <div style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid var(--border-subtle)', 
          background: 'rgba(255,255,255,0.02)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Nearby Garages
            </span>
            {briefSent ? (
              <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 500 }}>✓ Sent</span>
            ) : (
              <button
                onClick={() => setBriefSent(true)}
                style={{
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Send Brief →
              </button>
            )}
          </div>
          {garages.map((g, i) => (
            <div key={g.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none'
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{g.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {g.distance_km}km · ★ {g.rating}
                </div>
              </div>
              <button style={{
                fontSize: 11,
                color: 'var(--accent-blue)',
                border: '1px solid rgba(59,130,246,0.3)',
                background: 'transparent',
                borderRadius: 999,
                padding: '4px 12px',
                cursor: 'pointer'
              }}>
                Book
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
