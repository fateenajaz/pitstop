import React, { useState, useRef } from 'react';

export default function UploadZone({ onSubmit, isUploading }) {
  const [symptomText, setSymptomText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (symptomText || selectedFile) {
      onSubmit({ symptomText, file: selectedFile, previewUrl });
    }
  };

  return (
    <div 
      className={`bg-[var(--bg-surface)] border-2 rounded-[var(--radius-xl)] p-10 md:p-16 transition-all duration-200 ${
        isDragOver 
          ? 'border-solid border-[var(--accent-coral)] bg-[var(--accent-coral-light)]' 
          : 'border-dashed border-[var(--border-medium)]'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <form onSubmit={handleSubmit} className="flex flex-col items-center text-center max-w-lg mx-auto">
        <h2 className="font-display text-[26px] text-[var(--text-primary)] mb-2">
          What's wrong with your car?
        </h2>
        
        <p className="font-body text-[15px] text-[var(--text-secondary)] mb-10">
          Describe the symptom, then drop a photo if you have one.
        </p>

        <div className="w-full relative mb-8">
          <textarea
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
            placeholder="e.g. Grinding noise when turning left..."
            className="w-full bg-transparent border-0 border-b border-[var(--border-medium)] p-3 text-[16px] text-[var(--text-primary)] font-body focus:outline-none focus:border-[var(--text-primary)] transition-colors resize-none placeholder-[var(--text-tertiary)]"
            disabled={isUploading}
            rows={1}
          />
        </div>

        <div className="w-full flex justify-between items-center px-2">
          <div 
            className="text-[var(--accent-coral)] text-[14px] font-medium cursor-pointer hover:text-[var(--accent-coral-dark)] transition-colors flex items-center gap-2"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {previewUrl ? '✓ Photo attached (click to change)' : '+ attach a photo'}
          </div>

          <button
            type="submit"
            disabled={isUploading || (!symptomText && !selectedFile)}
            className="bg-[var(--bg-dark)] text-[var(--text-inverse)] rounded-[var(--radius-md)] px-7 py-3 font-body text-[15px] font-medium hover:bg-[var(--accent-coral)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                Initializing...
              </span>
            ) : "Begin Investigation →"}
          </button>
        </div>

        {previewUrl && (
          <div className="mt-8 relative w-full h-32 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-light)] bg-black/5">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>
        )}
      </form>
    </div>
  );
}
