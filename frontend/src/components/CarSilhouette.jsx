import React, { useId } from 'react';

const CAR_PATHS = {
  sedan: `M 60 170 
    Q 60 165 65 160 L 80 155 Q 90 120 120 105 
    L 160 95 Q 180 88 200 85 L 260 82 
    Q 290 82 310 88 L 340 95 
    Q 365 100 380 115 L 400 140 Q 410 155 415 160 
    Q 420 165 420 170 
    L 420 180 Q 420 190 410 195 L 400 195 
    Q 395 175 375 165 Q 355 155 335 155 
    Q 315 155 295 165 Q 275 175 275 195 
    L 205 195 
    Q 200 175 180 165 Q 160 155 140 155 
    Q 120 155 100 165 Q 80 175 80 195 
    L 70 195 Q 60 190 60 180 Z`,
  suv: `M 55 170 
    Q 55 162 62 155 L 78 148 Q 85 115 100 100 
    L 135 85 Q 155 78 180 75 L 260 72 
    Q 295 72 320 78 L 355 88 
    Q 380 95 395 112 L 415 140 Q 425 155 428 160 
    Q 432 165 432 170 
    L 432 182 Q 432 192 422 197 L 408 197 
    Q 402 174 380 162 Q 358 150 336 150 
    Q 314 150 292 162 Q 270 174 270 197 
    L 210 197 
    Q 204 174 182 162 Q 160 150 138 150 
    Q 116 150 94 162 Q 72 174 72 197 
    L 62 197 Q 55 192 55 182 Z`,
};

const WHEEL = (cx, cy, r = 22) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#1a1a1a" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    <circle cx={cx} cy={cy} r={r - 5} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
    <circle cx={cx} cy={cy} r={4} fill="rgba(255,255,255,0.12)" />
    {/* Spokes */}
    {[0, 60, 120, 180, 240, 300].map(angle => (
      <line
        key={angle}
        x1={cx + Math.cos(angle * Math.PI / 180) * 6}
        y1={cy + Math.sin(angle * Math.PI / 180) * 6}
        x2={cx + Math.cos(angle * Math.PI / 180) * (r - 6)}
        y2={cy + Math.sin(angle * Math.PI / 180) * (r - 6)}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />
    ))}
  </g>
);

export default function CarSilhouette({ 
  color = '#3b82f6', 
  type = 'sedan', 
  size = 'large',
  showGlow = true,
  showReflection = true,
  isAnimated = true,
  isAlert = false,
  className = ''
}) {
  const path = CAR_PATHS[type] || CAR_PATHS.sedan;
  
  const sizeConfig = {
    small: { width: 200, height: 120, viewBox: '30 60 440 160' },
    medium: { width: 280, height: 160, viewBox: '30 60 440 160' },
    large: { width: 360, height: 200, viewBox: '20 50 460 180' },
  };
  
  const cfg = sizeConfig[size] || sizeConfig.large;
  const glowColor = isAlert ? 'rgba(239,68,68,0.3)' : `${color}33`;
  const idPrefix = useId().replace(/:/g, '');
  const glowId = `glow-${idPrefix}`;
  const gradId = `grad-${idPrefix}`;
  const reflectId = `reflect-${idPrefix}`;

  return (
    <div 
      className={`${isAnimated ? 'animate-float' : ''} ${className}`}
      style={{ display: 'flex', justifyContent: 'center' }}
    >
      <svg
        width={cfg.width}
        height={cfg.height + (showReflection ? 40 : 0)}
        viewBox={`${cfg.viewBox.split(' ')[0]} ${cfg.viewBox.split(' ')[1]} ${cfg.viewBox.split(' ')[2]} ${parseInt(cfg.viewBox.split(' ')[3]) + (showReflection ? 60 : 0)}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={showGlow ? (isAlert ? 'car-glow-red' : 'car-glow') : ''}
      >
        <defs>
          {/* Car body gradient */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="50%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
          
          {/* Ambient glow filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>

          {/* Reflection gradient */}
          {showReflection && (
            <linearGradient id={reflectId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.06" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        {/* Ground line */}
        <line x1="40" y1="197" x2="440" y2="197" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* Ambient glow behind car */}
        {showGlow && (
          <ellipse cx="240" cy="190" rx="150" ry="30" fill={glowColor} filter={`url(#${glowId})`} />
        )}

        {/* Car body */}
        <path d={path} fill={`url(#${gradId})`} />
        
        {/* Window shape */}
        <path 
          d={type === 'suv' 
            ? "M 130 100 Q 150 82 180 78 L 260 75 Q 290 75 310 82 L 345 92 Q 360 98 370 110 L 380 130 Q 370 128 340 126 L 200 126 Q 160 126 130 128 Z"
            : "M 140 108 Q 160 92 190 88 L 255 85 Q 285 85 305 90 L 335 98 Q 350 104 360 118 L 370 138 Q 355 135 330 132 L 195 132 Q 165 132 140 135 Z"
          }
          fill="rgba(255,255,255,0.04)" 
          stroke="rgba(255,255,255,0.08)" 
          strokeWidth="0.5" 
        />

        {/* Window divider */}
        <line 
          x1={type === 'suv' ? "250" : "245"} 
          y1={type === 'suv' ? "76" : "86"} 
          x2={type === 'suv' ? "248" : "243"} 
          y2={type === 'suv' ? "126" : "133"} 
          stroke="rgba(255,255,255,0.08)" 
          strokeWidth="0.8" 
        />

        {/* Headlights */}
        <ellipse cx="80" cy="158" rx="6" ry="4" fill="rgba(255,255,255,0.5)" />
        <ellipse cx={type === 'suv' ? "418" : "408"} cy="158" rx="6" ry="4" fill="rgba(239,68,68,0.5)" />

        {/* Wheels */}
        {WHEEL(140, 195)}
        {WHEEL(335, 195)}

        {/* Reflection */}
        {showReflection && (
          <g transform="translate(0, 394) scale(1, -1)" opacity="0.15">
            <path d={path} fill={`url(#${reflectId})`} />
          </g>
        )}
      </svg>
    </div>
  );
}
