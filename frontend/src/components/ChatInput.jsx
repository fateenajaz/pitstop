import React, { useRef, useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';

export default function ChatInput({
  onSendMessage,
  onSendImage,
  disabled = false,
  disableText = false,
  disableImage = false,
  placeholder = "Describe the issue...",
}) {
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || disableText) return;
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

  const canSend = text.trim().length > 0 && !disabled && !disableText;
  const imageDisabled = disabled || disableImage;

  return (
    <div className="chat-input-bar">
      <div className="chat-input-inner">
        {/* Image upload button */}
        <button
          type="button"
          className="chat-input-btn chat-input-btn-camera"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageDisabled}
          aria-label="Upload or take a photo"
        >
          <ImagePlus size={20} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={imageDisabled}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || disableText}
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
