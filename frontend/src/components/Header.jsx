import React from 'react';

export default function Header({ activeVehicle, setActiveVehicle, VEHICLES }) {
  return (
    <header className="sticky top-0 z-50 mb-8 border-b border-[var(--border-light)] pb-4 pt-4 flex justify-between items-center bg-[var(--bg-primary)]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="font-display text-[18px] font-normal text-[var(--text-primary)]">
          Pit Stop
        </div>
      </div>
      
      <div className="flex items-center gap-4 border border-[var(--border-medium)] rounded-[var(--radius-xl)] bg-[var(--bg-secondary)] px-4 py-2 hover:border-[var(--border-strong)] transition-colors">
        <select 
          className="bg-transparent text-[14px] font-body text-[var(--text-primary)] focus:outline-none cursor-pointer appearance-none"
          value={activeVehicle.id}
          onChange={(e) => setActiveVehicle(VEHICLES.find(v => v.id === e.target.value))}
        >
          {VEHICLES.map(v => (
            <option key={v.id} value={v.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              Demo Car — {v.label} ▾
            </option>
          ))}
        </select>
      </div>

      <div className="text-[var(--text-tertiary)] text-[13px] font-body hover:text-[var(--text-primary)] cursor-pointer transition-colors">
        History ↗
      </div>
    </header>
  );
}
