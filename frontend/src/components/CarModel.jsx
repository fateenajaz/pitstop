import React, { useState } from 'react';
import CarSilhouette from './CarSilhouette';
import ThreeCarModel from './ThreeCarModel';
import ThreeCarAssetModel from './ThreeCarAssetModel';

function sanitizeSvgMarkup(svgString) {
  if (typeof svgString !== 'string') return null;

  let safe = svgString.trim();
  if (!safe.toLowerCase().startsWith('<svg')) return null;

  safe = safe
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|foreignObject|iframe|object|embed|audio|video|canvas|link|meta|base)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|foreignObject|iframe|object|embed|audio|video|canvas|link|meta|base)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-zA-Z-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/g, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*"(?!#)[^"]*"/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*'(?!#)[^']*'/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*(?!["'#])[^\s>]+/gi, '')
    .replace(/\sstyle\s*=\s*"[^"]*url\s*\([^"]*\)[^"]*"/gi, '')
    .replace(/\sstyle\s*=\s*'[^']*url\s*\([^']*\)[^']*'/gi, '');

  const match = safe.match(/<svg\b[\s\S]*<\/svg>/i);
  return match ? match[0].trim() : null;
}

export default function CarModel({
  svgString = null,
  model3d = null,
  modelAsset = null,
  color = '#3b82f6',
  type = 'sedan',
  size = 'large',
  rotateY = 0,
  rotateX = 0,
  isAnimated = true,
  isAlert = false,
  showReflection = true,
  showGlow = true,
  guidance = null,
  phaseLabel = '',
  phaseStatus = '',
}) {
  const [assetErrorKey, setAssetErrorKey] = useState(null);
  const safeSvg = sanitizeSvgMarkup(svgString);
  const sizeConfig = {
    small: { width: 200, height: 120 },
    medium: { width: 280, height: 160 },
    large: { width: 340, height: 190 },
  };
  const cfg = sizeConfig[size] || sizeConfig.large;

  const assetKey = `${type}:${modelAsset || 'default'}`;
  const hasAssetModel = assetErrorKey !== assetKey && (Boolean(modelAsset) || type === 'sedan' || type === 'suv');

  if (!hasAssetModel && !model3d && !safeSvg) {
    return (
      <CarSilhouette
        color={color}
        type={type}
        size={size}
        showGlow={showGlow}
        showReflection={showReflection}
        isAnimated={isAnimated}
        isAlert={isAlert}
      />
    );
  }

  const glowColor = isAlert ? 'rgba(239,68,68,0.25)' : `${color}22`;
  const wrapperClassName = isAnimated && rotateY === 0 && rotateX === 0 ? 'animate-float' : '';
  const activeGuidance = guidance && typeof guidance === 'object' ? guidance : null;
  const targetView = activeGuidance?.targetView || '';

  const markerStyle = (isActive, baseStyle) => ({
    position: 'absolute',
    borderRadius: 999,
    border: `1px solid ${isActive ? 'rgba(96,165,250,0.65)' : 'rgba(255,255,255,0.08)'}`,
    background: isActive ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.03)',
    boxShadow: isActive ? '0 0 18px rgba(59,130,246,0.28)' : 'none',
    transition: 'all 0.35s ease',
    ...baseStyle,
  });

  return (
    <div
      className={wrapperClassName}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '800px',
        position: 'relative',
        minWidth: cfg.width,
      }}
    >
      {(phaseLabel || phaseStatus) && (
        <div
          style={{
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {phaseLabel && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              {phaseLabel}
            </div>
          )}
          {phaseStatus && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                maxWidth: Math.round(cfg.width * 0.92),
              }}
            >
              {phaseStatus}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: phaseLabel || phaseStatus ? 46 : 6,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          display: activeGuidance ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        {activeGuidance?.headline && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(15,23,42,0.78)',
              border: '1px solid rgba(96,165,250,0.28)',
              color: 'var(--text-primary)',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {activeGuidance.headline}
          </div>
        )}
        {activeGuidance?.captureHint && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              maxWidth: Math.round(cfg.width * 0.9),
            }}
          >
            {activeGuidance.captureHint}
          </div>
        )}
      </div>

      {/* 3D rotation wrapper */}
      <div
        style={{
          width: cfg.width,
          height: cfg.height,
          transform: hasAssetModel ? 'none' : `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transition: 'transform 1s ease',
          transformStyle: 'preserve-3d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activeGuidance && (
          <>
            <div style={markerStyle(targetView === 'front' || targetView === 'front_left' || targetView === 'front_right', {
              left: 4,
              top: '50%',
              width: 22,
              height: 54,
              transform: 'translateY(-50%)',
            })} />
            <div style={markerStyle(targetView === 'rear' || targetView === 'rear_left' || targetView === 'rear_right', {
              right: 4,
              top: '50%',
              width: 22,
              height: 54,
              transform: 'translateY(-50%)',
            })} />
            <div style={markerStyle(targetView === 'top', {
              left: '50%',
              top: 4,
              width: 110,
              height: 18,
              transform: 'translateX(-50%)',
            })} />
            <div style={markerStyle(targetView === 'underbody', {
              left: '50%',
              bottom: 2,
              width: 118,
              height: 16,
              transform: 'translateX(-50%)',
            })} />
            <div style={markerStyle(targetView === 'left' || targetView === 'right' || targetView === 'wheel_closeup', {
              left: '50%',
              top: '50%',
              width: cfg.width * 0.7,
              height: cfg.height * 0.45,
              transform: 'translate(-50%, -50%)',
            })} />
          </>
        )}

        {hasAssetModel ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              filter: isAlert ? 'drop-shadow(0 0 20px rgba(239,68,68,0.4))' : `drop-shadow(0 0 20px ${glowColor})`,
            }}
          >
            <ThreeCarAssetModel
              type={type}
              modelAsset={modelAsset}
              width={cfg.width}
              height={cfg.height}
              rotateY={rotateY}
              rotateX={rotateX}
              guidance={activeGuidance}
              isAlert={isAlert}
              onError={() => setAssetErrorKey(assetKey)}
            />
          </div>
        ) : model3d ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              filter: isAlert ? 'drop-shadow(0 0 20px rgba(239,68,68,0.4))' : `drop-shadow(0 0 20px ${glowColor})`,
            }}
          >
            <ThreeCarModel
              model3d={model3d}
              width={cfg.width}
              height={cfg.height}
              rotateY={rotateY}
              rotateX={rotateX}
              isAnimated={isAnimated}
              isAlert={isAlert}
            />
          </div>
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: safeSvg }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0,
              filter: isAlert ? 'drop-shadow(0 0 20px rgba(239,68,68,0.4))' : `drop-shadow(0 0 20px ${glowColor})`,
            }}
          />
        )}
      </div>

      {/* Ground shadow */}
      {showGlow && (
        <div
          style={{
            width: cfg.width * 0.6,
            height: 16,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)`,
            marginTop: -4,
            transform: `rotateY(${rotateY}deg)`,
            transition: 'transform 1s ease',
            opacity: 0.6,
          }}
        />
      )}

      {showReflection && (
        <div
          aria-hidden="true"
          style={{
            width: cfg.width * 0.72,
            height: 18,
            marginTop: 6,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)',
            filter: 'blur(10px)',
            opacity: 0.3,
          }}
        />
      )}

      {activeGuidance?.focusArea && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-secondary)',
            fontSize: 11,
          }}
        >
          Focus: {activeGuidance.focusArea}
        </div>
      )}
    </div>
  );
}
