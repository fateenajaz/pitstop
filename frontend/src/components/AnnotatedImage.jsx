import React, { useEffect, useRef, useState } from 'react';

export default function AnnotatedImage({ imageUrl, annotations = [], isProcessing }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0, nw: 0, nh: 0 });

  useEffect(() => {
    const onResize = () => {
      if (imageRef.current) {
        setDims({ w: imageRef.current.clientWidth, h: imageRef.current.clientHeight, nw: imageRef.current.naturalWidth, nh: imageRef.current.naturalHeight });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onLoad = (e) => setDims({ w: e.target.clientWidth, h: e.target.clientHeight, nw: e.target.naturalWidth, nh: e.target.naturalHeight });

  useEffect(() => {
    if (!canvasRef.current || !dims.w || !dims.nw) return;
    const c = canvasRef.current; c.width = dims.w; c.height = dims.h;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);
    const sx = c.width / dims.nw, sy = c.height / dims.nh;
    const starts = annotations.map((_, i) => performance.now() + i * 300);
    let raf;
    const draw = (t) => {
      ctx.clearRect(0, 0, c.width, c.height);
      let done = true;
      annotations.forEach((a, i) => {
        const x = a.x*sx, y = a.y*sy, w = a.width*sx, h = a.height*sy;
        if (t < starts[i]) { done = false; return; }
        const p = Math.min(1, (t - starts[i]) / 600);
        if (p < 1) done = false;
        ctx.fillStyle = `rgba(59,130,246,${0.06*p})`; ctx.fillRect(x,y,w,h);
        const l = 10; ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
        ctx.moveTo(x, y+l*p); ctx.lineTo(x, y); ctx.lineTo(x+l*p, y);
        ctx.moveTo(x+w-l*p, y); ctx.lineTo(x+w, y); ctx.lineTo(x+w, y+l*p);
        ctx.moveTo(x, y+h-l*p); ctx.lineTo(x, y+h); ctx.lineTo(x+l*p, y+h);
        ctx.moveTo(x+w-l*p, y+h); ctx.lineTo(x+w, y+h); ctx.lineTo(x+w, y+h-l*p);
        ctx.stroke();
        if (p >= 1) {
          const pa = Math.min(1, Math.max(0, (t-starts[i]-600)/300));
          if (pa < 1) done = false;
          if (pa > 0) {
            const txt = `${a.label}  ${Math.round(a.confidence*100)}%`;
            ctx.font = '11px "JetBrains Mono",monospace';
            const tw = ctx.measureText(txt).width + 20;
            ctx.fillStyle = `rgba(10,10,10,${0.92*pa})`; ctx.strokeStyle = `rgba(59,130,246,${pa})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x+w-tw, y-26, tw, 22, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = `rgba(240,240,240,${pa})`; ctx.fillText(txt, x+w-tw+10, y-10);
          }
        }
      });
      if (!done) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dims, annotations]);

  if (!imageUrl) return null;
  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <img ref={imageRef} src={imageUrl} alt="Analyzed" style={{ width: '100%', height: 'auto', display: 'block' }} onLoad={onLoad} />
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      {isProcessing && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Analyzing...</div>
        </div>
      )}
    </div>
  );
}
