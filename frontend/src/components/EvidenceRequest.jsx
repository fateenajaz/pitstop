import React, { useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { AlertTriangle, Upload } from 'lucide-react';

export default function EvidenceRequest({ request, onSubmit }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const inputId = `evidence-upload-${request?.guidance?.targetView || 'generic'}`;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onSubmit(e.target.files[0]);
    }
    e.target.value = '';
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

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="evidence-card"
      style={{ alignSelf: 'flex-start' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={14} color="var(--accent-amber)" />
        <span style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: 10, 
          letterSpacing: '0.1em', 
          color: 'var(--accent-amber)', 
          textTransform: 'uppercase',
          fontWeight: 500
        }}>
          Photo Requested
        </span>
      </div>

      {/* Instruction */}
      <div style={{ 
        fontSize: 14, 
        color: 'var(--text-primary)', 
        lineHeight: 1.6,
        marginBottom: 10 
      }}>
        "{request.instruction}"
      </div>

      {/* Why */}
      <div style={{ 
        fontSize: 12, 
        color: 'var(--text-tertiary)', 
        fontStyle: 'italic',
        marginBottom: 14 
      }}>
        {request.why}
      </div>

      {/* Upload button */}
      <label
        htmlFor={inputId}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 'var(--radius-md)',
          border: isDragOver ? '2px solid var(--accent-blue)' : '2px dashed var(--border-medium)',
          background: isDragOver ? 'var(--accent-blue-glow)' : 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s',
          fontFamily: 'var(--font-body)',
          userSelect: 'none',
        }}
      >
        <Upload size={16} />
        Upload or Take Photo
      </label>

      <input
        id={inputId}
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </Motion.div>
  );
}
