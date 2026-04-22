import React, { useEffect, useRef, useState } from 'react';
import UrgencyBadge from './UrgencyBadge';

export default function AnnotatedImage({ imageUrl, annotations = [], isProcessing }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        setDimensions({
          width: imageRef.current.clientWidth,
          height: imageRef.current.clientHeight,
          naturalWidth: imageRef.current.naturalWidth,
          naturalHeight: imageRef.current.naturalHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageLoad = (e) => {
    setDimensions({
      width: e.target.clientWidth,
      height: e.target.clientHeight,
      naturalWidth: e.target.naturalWidth,
      naturalHeight: e.target.naturalHeight
    });
  };

  useEffect(() => {
    if (!canvasRef.current || !dimensions.width || !dimensions.naturalWidth) return;
    
    const canvas = canvasRef.current;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / dimensions.naturalWidth;
    const scaleY = canvas.height / dimensions.naturalHeight;

    const coralHex = '#D97757';
    const darkHex = '#1A1612';

    const drawCornerMarkers = (ctx, x, y, w, h, progress) => {
      // Simplification: progress 0 to 1 to simulate drawing
      if (progress <= 0) return;
      
      const len = 10;
      ctx.beginPath();
      
      // Top left
      ctx.moveTo(x, y + len * progress); ctx.lineTo(x, y); ctx.lineTo(x + len * progress, y);
      // Top right
      ctx.moveTo(x + w - len * progress, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len * progress);
      // Bottom left
      ctx.moveTo(x, y + h - len * progress); ctx.lineTo(x, y + h); ctx.lineTo(x + len * progress, y + h);
      // Bottom right
      ctx.moveTo(x + w - len * progress, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len * progress);
      
      ctx.strokeStyle = coralHex;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const drawLabelPill = (ctx, x, y, label, confidence, alpha) => {
      if (alpha <= 0) return;
      
      const confStr = `${Math.round(confidence * 100)}%`;
      const text = `${label}  ${confStr}`;
      
      ctx.font = '11px "JetBrains Mono", monospace';
      const textMetrics = ctx.measureText(text);
      const confMetrics = ctx.measureText(confStr);
      
      const paddingX = 10;
      const paddingY = 4;
      const pillW = textMetrics.width + paddingX * 2;
      const pillH = 22; // approx 11px font + 4*2 + some extra
      
      // Box
      ctx.fillStyle = `rgba(26, 22, 18, ${0.9 * alpha})`; // --bg-dark with 90% opacity
      ctx.strokeStyle = `rgba(217, 119, 87, ${alpha})`; // --accent-coral
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.roundRect(x - pillW, y - pillH - 4, pillW, pillH, 6); // --radius-sm
      ctx.fill();
      ctx.stroke();
      
      // Label Text
      ctx.fillStyle = `rgba(242, 237, 228, ${alpha})`; // --text-inverse
      ctx.fillText(label, x - pillW + paddingX, y - 4 - 6);
      
      // Conf Text
      ctx.fillStyle = `rgba(217, 119, 87, ${alpha})`; // --accent-coral
      ctx.fillText(confStr, x - pillW + paddingX + textMetrics.width - confMetrics.width + 5, y - 4 - 6);
    };

    let animationFrameId;
    const startTimes = annotations.map((_, i) => performance.now() + i * 300);
    const animDuration = 600;

    const render = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let allDone = true;

      annotations.forEach((ann, i) => {
        const x = ann.x * scaleX;
        const y = ann.y * scaleY;
        const w = ann.width * scaleX;
        const h = ann.height * scaleY;
        
        const startTime = startTimes[i];
        if (time < startTime) {
          allDone = false;
          return;
        }

        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / animDuration);
        
        if (progress < 1) allDone = false;

        // Faint coral wash fill
        ctx.fillStyle = `rgba(217, 119, 87, ${0.06 * progress})`;
        ctx.fillRect(x, y, w, h);

        // Border drawing animation (simulate stroke-dashoffset by drawing perimeter percentage)
        // A simple way to simulate it is drawing corner markers that grow, 
        // and if it's supposed to be a full rect, we draw the full rect with dash array.
        // Prompt says: "Corner markers: L-shaped, 10px each arm... only the corners, not the full rect"
        // And "Annotation boxes: Stroke: var(--accent-coral), 2px" (wait, earlier it said stroke 2px, then corner markers only the corners).
        // Let's draw the full faint fill, and L-shaped corners.
        
        drawCornerMarkers(ctx, x, y, w, h, progress);
        
        // Pill fades in after box completes
        if (progress >= 1) {
          const pillAlphaElapsed = time - (startTime + animDuration);
          const pillAlpha = Math.min(1, Math.max(0, pillAlphaElapsed / 300));
          drawLabelPill(ctx, x + w, y, ann.label, ann.confidence, pillAlpha);
          if (pillAlpha < 1) allDone = false;
        }
      });

      if (!allDone) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, annotations]);

  if (!imageUrl) return null;

  // Find if there's a critical or high urgency in annotations (if we passed urgency, but typically urgency is in brief).
  // The spec says "Urgency badge (bottom-left corner of image, overlaid)".
  // We'll just assume there is a prop or we omit if not provided. We don't have urgency in annotations, only in the brief.
  // Wait, the prompt says "Urgency badge (bottom-left corner of image)". 
  // Let's check if we can pass urgency. We'll leave it out until the Brief is provided, or render it conditionally.

  return (
    <div className="relative w-full rounded-[var(--radius-lg)] overflow-hidden bg-[var(--bg-dark)] shadow-md">
      <img 
        ref={imageRef}
        src={imageUrl} 
        alt="Analyzed component" 
        className="w-full h-auto block"
        onLoad={handleImageLoad}
      />
      
      {/* Canvas for annotations */}
      <canvas 
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-[rgba(26,22,18,0.55)] flex flex-col items-center justify-center gap-4 transition-opacity duration-300">
          <div className="font-body text-[14px] text-[var(--text-inverse)] tracking-wide">Analyzing...</div>
        </div>
      )}
    </div>
  );
}
