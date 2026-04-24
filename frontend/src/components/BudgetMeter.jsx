import React from 'react';

const PHASES = [
  { id: 'INTAKE', label: 'Intake' },
  { id: 'EVIDENCE_GAP', label: 'Evidence' },
  { id: 'ANALYSIS', label: 'Analysis' },
  { id: 'VERIFICATION', label: 'Verify' },
  { id: 'BRIEF', label: 'Brief' },
];

export default function BudgetMeter({ budget, currentPhase, emittedPhases, isActive, phaseStatus = '', phaseProgress = null }) {
  const { used = 0, total = 60000, remaining = 60000 } = budget || {};
  const progress = Math.min(100, Math.max(0, (used / total) * 100));
  const isWarning = remaining < total * 0.25;

  if (!isActive) return null;

  return (
    <div className="budget-bar">
      {(currentPhase || phaseStatus) && (
        <div style={{ marginBottom: 10 }}>
          {currentPhase && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: phaseStatus ? 4 : 0,
            }}>
              {PHASES.find((phase) => phase.id === currentPhase)?.label || currentPhase}
            </div>
          )}
          {phaseStatus && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {phaseStatus}
            </div>
          )}
          {typeof phaseProgress === 'number' && (
            <div style={{
              marginTop: 8,
              height: 4,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 999,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, phaseProgress * 100))}%`,
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
                transition: 'width 0.45s ease',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ 
        height: 2, 
        background: 'var(--border-subtle)', 
        borderRadius: 1, 
        overflow: 'hidden',
        marginBottom: 8
      }}>
        <div style={{ 
          height: '100%', 
          width: `${progress}%`, 
          background: isWarning 
            ? 'var(--accent-red)' 
            : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
          borderRadius: 1,
          transition: 'width 0.6s ease'
        }} />
      </div>

      {/* Phase pills inline */}
      <div style={{ 
        display: 'flex', 
        gap: 6, 
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PHASES.map(phase => {
            const isEmitted = emittedPhases?.has(phase.id);
            const isCurrent = currentPhase === phase.id;

            let pillClass = 'phase-pill phase-pill-pending';
            if (isCurrent) pillClass = 'phase-pill phase-pill-active';
            else if (isEmitted) pillClass = 'phase-pill phase-pill-done';

            return (
              <span key={phase.id} className={pillClass}>
                {phase.label}
              </span>
            );
          })}
        </div>
        <span style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: 10, 
          color: 'var(--text-muted)',
          flexShrink: 0
        }}>
          {used.toLocaleString()}/{total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
