import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import CarSilhouette from '../components/CarSilhouette';

const CAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function GaragePage({ cars }) {
  const navigate = useNavigate();

  return (
    <div className="page-enter" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', paddingTop: 'calc(24px + var(--safe-top))' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
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
        </motion.div>
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
          {cars.map((car, idx) => (
            <motion.div
              key={car.id}
              className="car-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => navigate(`/car/${car.id}`)}
            >
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

              {/* Car silhouette */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <CarSilhouette 
                  color={car.color || CAR_COLORS[idx % CAR_COLORS.length]} 
                  type={car.type || 'sedan'}
                  size="medium"
                  showReflection={false}
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
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            </motion.div>
          ))}

          {/* Add car card */}
          <motion.div
            className="car-card car-card-add"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: cars.length * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => navigate('/add-car')}
          >
            <motion.div
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
            </motion.div>
            <div style={{ 
              fontFamily: 'var(--font-heading)', 
              fontSize: 15, 
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}>
              Add Car
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom branding */}
      <motion.div
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
      </motion.div>
    </div>
  );
}
