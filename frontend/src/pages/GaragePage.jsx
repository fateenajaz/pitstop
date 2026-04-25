import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronRight, Trash2, Pencil, LogOut } from 'lucide-react';
import CarModel from '../components/CarModel';

const CAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function GaragePage({ cars, onDeleteCar, onLogout, user, isLoading }) {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDeleteClick = async (e, carId) => {
    e.stopPropagation();
    if (confirmDelete === carId) {
      await onDeleteCar(carId);
      setConfirmDelete(null);
      if (cars.length <= 1) setEditMode(false);
    } else {
      setConfirmDelete(carId);
    }
  };

  return (
    <div className="page-enter" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', paddingTop: 'calc(24px + var(--safe-top))' }}>
        <Motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 13, 
                fontWeight: 500,
                color: 'var(--text-tertiary)', 
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 6
              }}>
                Pit Stop
              </div>
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 32, 
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2
              }}>
                Your Garage
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {cars.length > 0 && (
                <button
                  onClick={() => { setEditMode(!editMode); setConfirmDelete(null); }}
                  style={{
                    background: editMode ? 'var(--accent-blue-glow)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${editMode ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    color: editMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    marginTop: 4
                  }}
                >
                  <Pencil size={14} />
                  {editMode ? 'Done' : 'Edit'}
                </button>
              )}
              <button
                onClick={onLogout}
                title={user?.username ? `Sign out ${user.username}` : 'Sign out'}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </Motion.div>
      </div>

      {/* Car cards area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        padding: '40px 0'
      }}>
        <div 
          className="no-scrollbar"
          style={{ 
            display: 'flex', 
            gap: 20, 
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: '20px 32px',
          }}
        >
          {/* Existing cars */}
          <AnimatePresence>
            {cars.map((car, idx) => (
              <Motion.div
                key={car.id}
                className="car-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0, scale: editMode ? 0.97 : 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => !editMode && navigate(`/car/${car.id}`)}
                style={{ cursor: editMode ? 'default' : 'pointer' }}
              >
                {/* Delete button (edit mode) */}
                {editMode && (
                  <Motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={(e) => handleDeleteClick(e, car.id)}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 10,
                      width: confirmDelete === car.id ? 'auto' : 32,
                      height: 32,
                      borderRadius: confirmDelete === car.id ? 'var(--radius-md)' : '50%',
                      background: confirmDelete === car.id ? 'var(--accent-red)' : 'rgba(239,68,68,0.15)',
                      border: `1px solid ${confirmDelete === car.id ? 'var(--accent-red)' : 'rgba(239,68,68,0.3)'}`,
                      color: confirmDelete === car.id ? 'white' : 'var(--accent-red)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: confirmDelete === car.id ? '0 12px' : 0,
                      fontSize: 12,
                      fontFamily: 'var(--font-body)',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Trash2 size={14} />
                    {confirmDelete === car.id && 'Confirm'}
                  </Motion.button>
                )}

                {/* Wobble animation in edit mode */}
                <style>{editMode ? `
                  @keyframes wobble {
                    0%, 100% { transform: rotate(-0.5deg); }
                    50% { transform: rotate(0.5deg); }
                  }
                ` : ''}</style>

                {/* Ambient background gradient */}
                <div style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${car.color || CAR_COLORS[idx % CAR_COLORS.length]}15 0%, transparent 70%)`,
                  pointerEvents: 'none'
                }} />

                {/* Car model */}
                <div style={{ 
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                  animation: editMode ? 'wobble 0.3s ease-in-out infinite' : 'none'
                }}>
                  <CarModel
                    model3d={car.model3d}
                    svgString={car.svgModel}
                    color={car.color || CAR_COLORS[idx % CAR_COLORS.length]} 
                    type={car.type || 'sedan'}
                    size="medium"
                    showReflection={false}
                    isAnimated={!editMode}
                  />
                </div>

                {/* Car info */}
                <div style={{ 
                  padding: '0 20px 24px', 
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <div style={{ 
                      fontFamily: 'var(--font-heading)', 
                      fontSize: 17, 
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 4 
                    }}>
                      {car.name}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.05em'
                    }}>
                      {car.label || 'Vehicle'}
                    </div>
                  </div>
                  {!editMode && <ChevronRight size={18} color="var(--text-muted)" />}
                </div>
              </Motion.div>
            ))}
          </AnimatePresence>

          {/* Add car card */}
          {!editMode && (
            <Motion.div
              className="car-card car-card-add"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: cars.length * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => navigate('/add-car')}
            >
              <Motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: '2px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}
              >
                <Plus size={28} color="var(--text-secondary)" />
              </Motion.div>
              <div style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 15, 
                fontWeight: 500,
                color: 'var(--text-secondary)'
              }}>
                Add Car
              </div>
            </Motion.div>
          )}
        </div>
        {!isLoading && cars.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 12 }}>
            Your garage is empty.
          </div>
        )}
      </div>

      {/* Bottom branding */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{ 
          textAlign: 'center', 
          padding: '24px', 
          paddingBottom: 'calc(24px + var(--safe-bottom))',
        }}
      >
        <div style={{ 
          fontSize: 11, 
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase'
        }}>
          Powered by Claude Opus 4.7
        </div>
      </Motion.div>
    </div>
  );
}
