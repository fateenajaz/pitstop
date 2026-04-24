import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CarFront, Check, Truck } from 'lucide-react';
import CarModel from '../components/CarModel';

const CAR_OPTIONS = [
  {
    type: 'sedan',
    label: 'Sedan',
    description: 'Lower ride height, compact cabin, street-focused profile',
    icon: CarFront,
    color: '#3b82f6',
    asset: '/sedan.glb',
  },
  {
    type: 'suv',
    label: 'SUV',
    description: 'Taller stance, larger cabin, utility-focused profile',
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

  const handleSave = () => {
    if (!carName.trim()) return;

    const newCar = {
      id: `car-${Date.now()}`,
      name: carName.trim(),
      label: selectedOption.label,
      type: selectedOption.type,
      color: selectedOption.color,
      modelAsset: selectedOption.asset,
      createdAt: new Date().toISOString(),
    };

    setIsDone(true);
    setTimeout(() => {
      onAddCar(newCar);
      navigate('/');
    }, 900);
  };

  return (
    <div className="page-enter" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 20px',
        paddingTop: 'calc(16px + var(--safe-top))',
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
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, margin: 0 }}>
          Add Car
        </h1>
      </div>

      <div style={{ flex: 1, padding: '12px 24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <AnimatePresence mode="wait">
          {isDone ? (
            <Motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Check size={32} color="white" />
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600 }}>
                {carName} added!
              </div>
              <CarModel
                modelAsset={selectedOption.asset}
                type={selectedOption.type}
                color={selectedOption.color}
                size="medium"
              />
            </Motion.div>
          ) : (
            <Motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  Pick your base model
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Choose the car type that best matches your vehicle. The app will use this 3D model for guidance and future diagnostic highlights.
                </div>
              </div>

              <div style={{
                minHeight: 260,
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-subtle)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
              }}>
                <CarModel
                  modelAsset={selectedOption.asset}
                  type={selectedOption.type}
                  color={selectedOption.color}
                  size="large"
                  showReflection={false}
                />
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {CAR_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.type === selectedType;

                  return (
                    <button
                      key={option.type}
                      onClick={() => setSelectedType(option.type)}
                      style={{
                        width: '100%',
                        padding: '16px 18px',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${isSelected ? option.color : 'var(--border-subtle)'}`,
                        background: isSelected ? `${option.color}18` : 'rgba(255,255,255,0.03)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: isSelected ? `${option.color}22` : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={20} color={isSelected ? option.color : 'var(--text-secondary)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
                          {option.label}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {option.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: option.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Check size={14} color="white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 8,
                }}>
                  Car Name
                </label>
                <input
                  type="text"
                  value={carName}
                  onChange={(event) => setCarName(event.target.value)}
                  placeholder="e.g. Family SUV"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    outline: 'none',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!carName.trim()}
                style={{
                  width: '100%',
                  padding: '16px 0',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: carName.trim() ? selectedOption.color : 'var(--bg-elevated)',
                  color: carName.trim() ? 'white' : 'var(--text-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: carName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  marginTop: 'auto',
                  marginBottom: 'calc(8px + var(--safe-bottom))',
                }}
              >
                Save to Garage
              </button>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
