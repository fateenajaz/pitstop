import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Check, Loader2 } from 'lucide-react';
import CarSilhouette from '../components/CarSilhouette';

const PHOTO_STEPS = [
  { label: 'Front', instruction: 'Take a photo of the front of your car', icon: '⬆' },
  { label: 'Left Side', instruction: 'Take a photo from the left side', icon: '⬅' },
  { label: 'Rear', instruction: 'Take a photo of the rear', icon: '⬇' },
  { label: 'Right Side', instruction: 'Take a photo from the right side', icon: '➡' },
  { label: 'Top', instruction: 'Take a photo from the top/above', icon: '⊙' },
];

const CAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AddCarPage({ onAddCar }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState([null, null, null, null, null]);
  const [carName, setCarName] = useState('');
  const [carType, setCarType] = useState('sedan');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [selectedColor, setSelectedColor] = useState(CAR_COLORS[0]);
  const fileInputRef = useRef(null);

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const newPhotos = [...photos];
      newPhotos[currentStep] = { file, preview: ev.target.result };
      setPhotos(newPhotos);

      // Auto-advance to next step after short delay
      setTimeout(() => {
        if (currentStep < 4) {
          setCurrentStep(currentStep + 1);
        }
      }, 500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const allPhotosComplete = photos.filter(Boolean).length >= 3; // At least 3 photos required

  const handleGenerate = async () => {
    if (!carName.trim()) return;
    setIsGenerating(true);

    // Simulate generation
    await new Promise(r => setTimeout(r, 2500));

    setIsGenerating(false);
    setIsDone(true);

    // Save car
    const newCar = {
      id: `car-${Date.now()}`,
      name: carName.trim(),
      label: carType === 'suv' ? 'SUV' : 'Sedan',
      type: carType,
      color: selectedColor,
      photos: photos.filter(Boolean).map(p => p.preview),
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onAddCar(newCar);
      navigate('/');
    }, 1500);
  };

  const photosStep = currentStep < 5 || !allPhotosComplete;

  return (
    <div className="page-enter" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px',
        paddingTop: 'calc(16px + var(--safe-top))',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            padding: 8,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ 
          fontFamily: 'var(--font-heading)', 
          fontSize: 20, 
          fontWeight: 600,
          margin: 0 
        }}>
          Add Car
        </h1>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 24px' }}>
        <div className="progress-dots">
          {PHOTO_STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`progress-dot ${i === currentStep ? 'active' : ''} ${photos[i] ? 'done' : ''}`}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={40} color="var(--accent-blue)" />
              </motion.div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Generating your car...
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 260 }}>
                Creating a profile from your photos
              </div>
            </motion.div>
          ) : isDone ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Check size={32} color="white" />
              </motion.div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600 }}>
                {carName} added!
              </div>
              <CarSilhouette color={selectedColor} type={carType} size="medium" />
            </motion.div>
          ) : photosStep ? (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="photo-step"
            >
              {/* Current step info */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {PHOTO_STEPS[currentStep]?.icon}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, marginBottom: 6 }}>
                  {PHOTO_STEPS[currentStep]?.label}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {PHOTO_STEPS[currentStep]?.instruction}
                </div>
              </div>

              {/* Photo capture zone */}
              <div 
                className={`photo-capture-zone ${photos[currentStep] ? 'active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {photos[currentStep] ? (
                  <>
                    <img src={photos[currentStep].preview} alt={`Photo ${currentStep + 1}`} />
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2
                    }}>
                      <Check size={16} color="white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={32} color="var(--text-tertiary)" />
                    <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
                      Tap to take photo
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                )}
                {currentStep < 4 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!photos[currentStep]}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: photos[currentStep] ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                      color: photos[currentStep] ? 'white' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: photos[currentStep] ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    Next
                  </button>
                ) : allPhotosComplete && (
                  <button
                    onClick={() => setCurrentStep(5)}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--accent-blue)',
                      color: 'white',
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Continue
                  </button>
                )}
              </div>

              {/* Skip hint */}
              {!photos[currentStep] && (
                <button
                  onClick={() => {
                    if (currentStep < 4) setCurrentStep(currentStep + 1);
                    else if (allPhotosComplete) setCurrentStep(5);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    cursor: 'pointer',
                    padding: '4px 12px'
                  }}
                >
                  Skip this angle
                </button>
              )}
            </motion.div>
          ) : (
            /* Name & customize step */
            <motion.div
              key="customize"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              style={{ flex: 1, padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 32 }}
            >
              {/* Preview */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <CarSilhouette color={selectedColor} type={carType} size="large" />
              </div>

              {/* Car name input */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 12, 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 8 
                }}>
                  Car Name
                </label>
                <input
                  type="text"
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                  placeholder="e.g. My Daily Driver"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    outline: 'none',
                    fontFamily: 'var(--font-body)'
                  }}
                />
              </div>

              {/* Car type selector */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 12, 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 8 
                }}>
                  Type
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['sedan', 'suv'].map(t => (
                    <button
                      key={t}
                      onClick={() => setCarType(t)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${carType === t ? 'var(--accent-blue)' : 'var(--border-light)'}`,
                        background: carType === t ? 'var(--accent-blue-glow)' : 'var(--bg-surface)',
                        color: carType === t ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 12, 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 12 
                }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {CAR_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: c,
                        border: selectedColor === c ? '3px solid white' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: selectedColor === c ? `0 0 12px ${c}55` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!carName.trim()}
                style={{
                  width: '100%',
                  padding: '16px 0',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: carName.trim() ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: carName.trim() ? 'white' : 'var(--text-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: carName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  marginTop: 8,
                  marginBottom: 'calc(24px + var(--safe-bottom))'
                }}
              >
                Save to Garage
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
