import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function EvidenceRequest({ request, onSubmit }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onSubmit(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onSubmit(file);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[var(--bg-surface)] border border-[var(--accent-coral)] border-l-[3px] rounded-[var(--radius-lg)] p-7 md:p-8 shadow-md"
    >
      <div className="flex gap-4">
        <div className="flex-1">
          <h3 className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-tertiary)] uppercase mb-3">
            Additional Evidence Required
          </h3>
          <div className="h-px bg-[var(--border-light)] w-full mb-4" />
          
          <div className="font-display text-[18px] text-[var(--text-primary)] mb-6 leading-relaxed">
            "{request.instruction}"
          </div>
          
          <div className="mb-6">
            <span className="block font-mono text-[10px] tracking-[0.1em] text-[var(--text-tertiary)] uppercase mb-1">
              Why this matters:
            </span>
            <span className="font-body italic text-[13px] text-[var(--text-tertiary)]">
              {request.why}
            </span>
          </div>

          <div 
            className={`border-2 rounded-[var(--radius-md)] p-6 text-center cursor-pointer transition-colors duration-200 ${
              isDragOver 
                ? 'border-solid border-[var(--accent-coral)] bg-[var(--accent-coral-light)]' 
                : 'border-dashed border-[var(--border-medium)] hover:border-[var(--accent-coral)] hover:bg-[var(--accent-coral-light)]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileChange}
            />
            <span className="font-body text-[14px] text-[var(--text-secondary)]">
              Drop your photo here, or click to choose a file
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
