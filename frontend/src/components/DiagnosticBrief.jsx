import React, { useState } from 'react';
import UrgencyBadge from './UrgencyBadge';
import { motion } from 'framer-motion';
import GarageList from './GarageList';

export default function DiagnosticBrief({ brief, garages }) {
  const [briefSent, setBriefSent] = useState(false);

  // Confidence bar gradient logic
  let fillClass = 'from-[var(--urgent-low)] to-[var(--urgent-moderate)]';
  if (brief.urgency === 'high') fillClass = 'from-[var(--urgent-moderate)] to-[var(--urgent-high)]';
  if (brief.urgency === 'critical') fillClass = 'from-[var(--urgent-high)] to-[var(--urgent-critical)]';

  const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] shadow-lg overflow-hidden"
    >
      <div className="p-9">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-1">
              Diagnostic Brief
            </h1>
            <div className="font-body text-[15px] font-medium text-[var(--text-primary)]">
              2019 Toyota Camry
            </div>
            <div className="font-body text-[13px] text-[var(--text-tertiary)] mt-0.5">
              {todayStr}
            </div>
          </div>
          <UrgencyBadge urgency={brief.urgency} text={brief.urgency_label} />
        </div>

        <div className="h-px bg-[var(--border-light)] w-full mb-8" />

        {/* Fault Section */}
        <div className="mb-8">
          <h2 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-2">
            Primary Fault
          </h2>
          <div className="h-px bg-[var(--border-light)] w-full mb-3" />
          <div className="font-display text-[22px] text-[var(--text-primary)] mb-4">
            {brief.primary_fault}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1 h-1 bg-[var(--border-light)] rounded-sm overflow-hidden max-w-xs">
              <div 
                className={`absolute top-0 left-0 h-full rounded-sm bg-gradient-to-r ${fillClass}`}
                style={{ width: `${Math.round(brief.confidence * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[12px] text-[var(--text-primary)]">
              {Math.round(brief.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="mb-8 flex flex-col gap-6">
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-2">
              What's happening
            </h2>
            <div className="h-px bg-[var(--border-light)] w-full mb-3" />
            <p className="font-body text-[15px] leading-[1.65] text-[var(--text-primary)]">
              {brief.plain_explanation}
            </p>
          </div>
          
          <div>
            <h2 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-2">
              What happens if you ignore this
            </h2>
            <div className="h-px bg-[var(--border-light)] w-full mb-3" />
            <p className="font-body text-[15px] leading-[1.65] text-[var(--text-primary)]">
              {brief.what_happens_if_ignored}
            </p>
          </div>
        </div>

        {/* Cost + Action Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[var(--border-light)] rounded-[var(--radius-md)] overflow-hidden mb-2">
          <div className="p-5 border-b md:border-b-0 md:border-r border-[var(--border-light)]">
            <h2 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-2">
              Estimated Cost
            </h2>
            <div className="font-body text-[15px] text-[var(--text-primary)] font-medium">
              {brief.estimated_cost_band}
            </div>
          </div>
          <div className="p-5">
            <h2 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase mb-2">
              Recommended Action
            </h2>
            <div className="font-body text-[15px] text-[var(--text-primary)] leading-snug">
              {brief.recommended_action}
            </div>
          </div>
        </div>
      </div>

      {/* Garages Section (below main brief, light gray bg) */}
      {garages && garages.length > 0 && (
        <div className="bg-[var(--bg-secondary)] p-9 pt-7 border-t border-[var(--border-light)]">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-tertiary)] uppercase">
              Nearby Garages
            </h2>
            
            {briefSent ? (
              <span className="font-body text-[13px] text-[var(--urgent-low)] font-medium flex items-center gap-1">
                ✓ Brief sent to garage.
              </span>
            ) : (
              <button 
                onClick={() => setBriefSent(true)}
                className="bg-[var(--bg-dark)] text-[var(--text-inverse)] px-4 py-2 rounded-[var(--radius-md)] font-body text-[13px] font-medium hover:bg-[var(--accent-coral)] transition-colors"
              >
                Send Brief →
              </button>
            )}
          </div>
          
          <div className="h-px bg-[var(--border-light)] w-full mb-4" />
          
          <div className="flex flex-col">
            {garages.map((g, i) => (
              <div key={g.id} className="flex justify-between items-center py-[14px] border-b border-[var(--border-light)] last:border-0">
                <div className="flex items-center gap-4">
                  {i === 0 ? (
                    <span className="text-[var(--accent-coral)] text-[10px]">●</span>
                  ) : (
                    <span className="text-transparent text-[10px]">●</span>
                  )}
                  <span className="font-body font-medium text-[var(--text-primary)] min-w-[180px]">
                    {g.name}
                  </span>
                  <span className="font-body text-[13px] text-[var(--text-tertiary)] w-16">
                    {g.distance_km} km
                  </span>
                  <span className="font-body text-[13px] text-[var(--text-tertiary)] w-16">
                    ★ {g.rating}
                  </span>
                  <span className="font-body text-[13px] text-[var(--text-tertiary)] hidden md:block">
                    {g.slots[0] || "Call for availability"}
                  </span>
                </div>
                <button className="text-[12px] text-[var(--accent-coral)] border border-[var(--accent-coral)] rounded-full px-4 py-1 hover:bg-[var(--accent-coral-light)] transition-colors">
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
