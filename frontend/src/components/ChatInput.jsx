import React, { useRef, useState, useEffect } from 'react';
import { Camera, Send, ImagePlus } from 'lucide-react';

export default function ChatInput({ onSendMessage, onSendImage, disabled = false, placeholder = "Describe the issue..." }) {
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onSendImage?.(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="chat-input-bar">
      <div className="chat-input-inner">
        {/* Camera / Image button */}
        <button
          type="button"
          className="chat-input-btn chat-input-btn-camera"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach photo"
        >
          <Camera size={20} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
        />

        {/* Send button */}
        <button
          type="button"
          className="chat-input-btn chat-input-btn-send"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
