import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const PHASES = [
  { id: 'INTAKE', label: 'Intake' },
  { id: 'EVIDENCE_GAP', label: 'Evidence Gap' },
  { id: 'ANALYSIS', label: 'Analysis' },
  { id: 'VERIFICATION', label: 'Verification' },
  { id: 'BRIEF', label: 'Brief' },
];

export default function BudgetMeter({ budget, currentPhase, emittedPhases, isActive }) {
  const { used = 0, total = 60000, remaining = 60000 } = budget || {};
  const progressPercentage = Math.min(100, Math.max(0, (used / total) * 100));
  const isWarning = remaining < total * 0.25;

  if (!isActive && !budget) {
    return (
      <div className="bg-[var(--bg-dark)] rounded-[var(--radius-lg)] p-6 opacity-40 grayscale pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase">
              Investigation Budget
            </h3>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">[-- tokens]</span>
          </div>
          
          <div className="w-full h-1 bg-[#F2EDE4]/5 rounded-sm overflow-hidden" />
          
          <div className="flex text-xs text-[var(--text-tertiary)] font-mono mt-1">
            <span>-- used · -- remaining</span>
          </div>
        </div>

        <div className="h-px bg-[var(--border-light)] my-5" />

        <div className="flex flex-col gap-2">
          {PHASES.map((phase, i) => (
            <div key={phase.id} className="flex items-center gap-3 text-[13px] text-[var(--text-tertiary)]">
              <span className="text-[11px]">○</span>
              <span>{phase.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-dark)] rounded-[var(--radius-lg)] p-6 shadow-md transition-all duration-300">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase">
            Investigation Budget
          </h3>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">[{total.toLocaleString()} tokens]</span>
        </div>
        
        <div className="relative w-full h-1 bg-[rgba(242,237,228,0.08)] rounded-sm overflow-hidden">
          <div 
            className={cn(
              "absolute top-0 left-0 h-full rounded-sm transition-[width] duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isWarning ? "animate-pulse-soft bg-[var(--accent-coral)]" : "bg-gradient-to-r from-[var(--accent-coral)] to-[#E8A838]"
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="flex items-center gap-1.5 mt-1 font-mono text-[13px]">
          <span className="text-[var(--text-inverse)] opacity-85">{used.toLocaleString()} used</span>
          <span className="text-[var(--text-tertiary)]">·</span>
          <span className="text-[var(--accent-coral)]">{remaining.toLocaleString()} remaining</span>
        </div>
      </div>

      <div className="h-px bg-[var(--border-light)] my-5" />

      <div className="flex flex-col gap-1.5">
        {PHASES.map((phase) => {
          const isEmitted = emittedPhases?.has(phase.id);
          const isCurrent = currentPhase === phase.id;
          
          let icon = <span className="w-4 flex justify-center text-[10px] text-white/20">○</span>;
          let textClass = "text-white/25";
          let rowClass = "py-1 px-2 -mx-2 rounded-md transition-colors";

          if (isCurrent) {
            icon = <span className="w-4 flex justify-center text-[10px] text-[var(--accent-coral)]">●</span>;
            textClass = "text-[var(--text-inverse)] font-medium";
            rowClass = "py-1 px-2 -mx-2 rounded-md bg-[rgba(217,119,87,0.15)]";
          } else if (isEmitted) {
            icon = <span className="w-4 flex justify-center text-[11px] text-[var(--urgent-low)]">✓</span>;
            textClass = "text-[var(--text-tertiary)]";
          }

          return (
            <div key={phase.id} className={cn("flex items-center gap-2 text-[13px] font-body", rowClass)}>
              {icon}
              <span className={textClass}>
                {isCurrent && <span className="uppercase text-[10px] font-mono tracking-widest text-[var(--text-tertiary)] mr-2">PHASE {PHASES.indexOf(phase)+1} —</span>}
                {isCurrent ? phase.id : phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
