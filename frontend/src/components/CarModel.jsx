import React, { useCallback, useState } from 'react';
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
  const handleAssetError = useCallback(() => {
    setAssetErrorKey(assetKey);
  }, [assetKey]);

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
  const hotspotScreenPositions = {
    engine_bay: { left: '58%', top: '34%' },
    battery_area: { left: '62%', top: '32%' },
    coolant_reservoir: { left: '55%', top: '31%' },
    oil_dipstick: { left: '57%', top: '35%' },
    engine_oil_cap: { left: '56%', top: '30%' },
    air_filter_box: { left: '64%', top: '37%' },
    radiator_front: { left: '75%', top: '48%' },
    front_bumper: { left: '79%', top: '55%' },
    rear_bumper: { left: '21%', top: '55%' },
    left_body_panel: { left: '48%', top: '51%' },
    right_body_panel: { left: '52%', top: '51%' },
    driver_door: { left: '50%', top: '46%' },
    passenger_door: { left: '50%', top: '46%' },
    windshield: { left: '62%', top: '26%' },
    roof_center: { left: '50%', top: '18%' },
    trunk_area: { left: '27%', top: '42%' },
    exhaust_rear: { left: '17%', top: '62%' },
    underbody_front: { left: '65%', top: '76%' },
    underbody_mid: { left: '50%', top: '78%' },
    underbody_rear: { left: '35%', top: '76%' },
    front_left_tire: { left: '70%', top: '66%' },
    front_right_tire: { left: '70%', top: '66%' },
    rear_left_tire: { left: '31%', top: '66%' },
    rear_right_tire: { left: '31%', top: '66%' },
    front_left_brake: { left: '70%', top: '65%' },
    front_right_brake: { left: '70%', top: '65%' },
    rear_left_brake: { left: '31%', top: '65%' },
    rear_right_brake: { left: '31%', top: '65%' },
    front_left_suspension: { left: '68%', top: '58%' },
    front_right_suspension: { left: '68%', top: '58%' },
    rear_left_suspension: { left: '33%', top: '58%' },
    rear_right_suspension: { left: '33%', top: '58%' },
  };
  const viewScreenPositions = {
    front: { left: '76%', top: '50%' },
    rear: { left: '24%', top: '50%' },
    left: { left: '50%', top: '48%' },
    right: { left: '50%', top: '48%' },
    top: { left: '50%', top: '20%' },
    underbody: { left: '50%', top: '78%' },
    wheel_closeup: { left: '70%', top: '65%' },
    front_left: { left: '70%', top: '64%' },
    front_right: { left: '70%', top: '64%' },
    rear_left: { left: '31%', top: '64%' },
    rear_right: { left: '31%', top: '64%' },
  };
  const activeScreenHotspot =
    hotspotScreenPositions[activeGuidance?.hotspotId] || viewScreenPositions[activeGuidance?.targetView] || null;

  const markerStyle = (baseStyle) => ({
    position: 'absolute',
    borderRadius: 999,
    width: 16,
    height: 16,
    border: '2px solid rgba(147,197,253,0.92)',
    background: 'rgba(59,130,246,0.7)',
    boxShadow: '0 0 0 8px rgba(59,130,246,0.14), 0 0 24px rgba(59,130,246,0.38)',
    transition: 'all 0.35s ease',
    zIndex: 4,
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
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
        {activeScreenHotspot && <div style={markerStyle(activeScreenHotspot)} />}

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
              onError={handleAssetError}
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

      {activeGuidance && (activeGuidance.headline || activeGuidance.captureHint) && (
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            maxWidth: Math.round(cfg.width * 0.96),
            pointerEvents: 'none',
          }}
        >
          {activeGuidance.headline && (
            <div
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(15,23,42,0.76)',
                border: '1px solid rgba(96,165,250,0.28)',
                color: 'var(--text-primary)',
                fontSize: 12,
                lineHeight: 1.2,
                textAlign: 'center',
              }}
            >
              {activeGuidance.headline}
            </div>
          )}
          {activeGuidance.captureHint && (
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.25,
                color: 'var(--text-tertiary)',
                textAlign: 'center',
              }}
            >
              {activeGuidance.captureHint}
            </div>
          )}
        </div>
      )}

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
