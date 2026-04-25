import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CarFront, Check, Truck } from 'lucide-react';
import CarModel from '../components/CarModel';

const CAR_OPTIONS = [
  {
    type: 'sedan',
    label: 'Sedan',
    description: 'Street profile',
    icon: CarFront,
    color: '#3b82f6',
    asset: '/sedan.glb',
  },
  {
    type: 'suv',
    label: 'SUV',
    description: 'Utility stance',
    icon: Truck,
    color: '#10b981',
    asset: '/suv.glb',
  },
];

export default function AddCarPage({ onAddCar }) {
  const navigate = useNavigate();
  const [carName, setCarName] = useState('');
  const [selectedType, setSelectedType] = useState('sedan');
  const [isDone, setIsDone] = useState(false);

  const selectedOption = CAR_OPTIONS.find((option) => option.type === selectedType) || CAR_OPTIONS[0];

  const handleSave = async () => {
    if (!carName.trim()) return;

    const newCar = {
      name: carName.trim(),
      label: selectedOption.label,
      type: selectedOption.type,
      color: selectedOption.color,
      modelAsset: selectedOption.asset,
      createdAt: new Date().toISOString(),
    };

    setIsDone(true);
    try {
      await onAddCar(newCar);
      setTimeout(() => {
        navigate('/');
      }, 600);
    } catch (error) {
      console.error(error);
      setIsDone(false);
    }
  };

  return (
    <div className="page-enter" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px',
        paddingTop: 'calc(14px + var(--safe-top))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
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
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, margin: 0 }}>
          Add Car
        </h1>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '8px 18px calc(16px + var(--safe-bottom))', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {isDone ? (
            <Motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Check size={32} color="white" />
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600 }}>
                {carName} added!
              </div>
              <CarModel
                modelAsset={selectedOption.asset}
                type={selectedOption.type}
                color={selectedOption.color}
                size="small"
              />
            </Motion.div>
          ) : (
            <Motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                }}>
                  Garage Setup
                </div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(22px, 5vw, 28px)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  Pick your car
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 420 }}>
                  Choose the base model and give it a name. This 3D view will be used for diagnostics and guidance.
                </div>
              </div>

              <div style={{
                flex: '0 0 auto',
                minHeight: 'clamp(180px, 28vh, 230px)',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                background: 'radial-gradient(circle at top, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 55%, rgba(255,255,255,0.01) 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 14px 10px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  padding: '5px 9px',
                  borderRadius: 999,
                  border: `1px solid ${selectedOption.color}33`,
                  background: `${selectedOption.color}12`,
                  color: selectedOption.color,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {selectedOption.label}
                </div>
                <CarModel
                  modelAsset={selectedOption.asset}
                  type={selectedOption.type}
                  color={selectedOption.color}
                  size="medium"
                  showReflection={false}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {CAR_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.type === selectedType;

                  return (
                    <button
                      key={option.type}
                      onClick={() => setSelectedType(option.type)}
                      style={{
                        width: '100%',
                        padding: '14px 14px',
                        borderRadius: '18px',
                        border: `1px solid ${isSelected ? option.color : 'var(--border-subtle)'}`,
                        background: isSelected ? `${option.color}16` : 'rgba(255,255,255,0.025)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 10,
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        minHeight: 112,
                      }}
                    >
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: isSelected ? `${option.color}22` : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={20} color={isSelected ? option.color : 'var(--text-secondary)'} />
                      </div>
                      <div style={{ flex: 1, width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600 }}>
                            {option.label}
                          </div>
                          {isSelected && (
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: option.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Check size={12} color="white" />
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  padding: 10,
                  borderRadius: '18px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.025)',
                }}
              >
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 6,
                  }}>
                    Car Name
                  </label>
                  <input
                    type="text"
                    value={carName}
                    onChange={(event) => setCarName(event.target.value)}
                    placeholder="e.g. Daily Sedan"
                    style={{
                      width: '100%',
                      height: 48,
                      padding: '0 14px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '14px',
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={!carName.trim()}
                  style={{
                    alignSelf: 'end',
                    height: 48,
                    minWidth: 128,
                    padding: '0 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: carName.trim() ? selectedOption.color : 'var(--bg-elevated)',
                    color: carName.trim() ? 'white' : 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: carName.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                >
                  Save
                </button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
