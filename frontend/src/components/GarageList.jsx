import React from 'react';
import { MapPin, Star } from 'lucide-react';

export default function GarageList({ garages }) {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-end border-b border-[var(--border-light)] pb-2 mb-2">
        <h3 className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--text-tertiary)]">
          Nearby Garages
        </h3>
      </div>
      <div className="flex flex-col">
        {garages.map(g => (
          <div key={g.id} className="flex flex-col gap-1 border-b border-[var(--border-light)] py-[14px] last:border-0">
            <div className="flex justify-between items-center">
              <span className="font-body font-medium text-[var(--text-primary)]">{g.name}</span>
              <button className="text-[12px] text-[var(--accent-coral)] border border-[var(--accent-coral)] rounded-full px-3 py-1 hover:bg-[var(--accent-coral-light)] transition-colors">
                Book
              </button>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-[var(--text-tertiary)] font-body">
              <span>{g.distance_km} km</span>
              <span>★ {g.rating}</span>
              <span>{g.slots[0] || "Call for availability"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
