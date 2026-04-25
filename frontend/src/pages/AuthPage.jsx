import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Lock, UserRound, Gauge } from 'lucide-react';

export default function AuthPage({ onSubmit, error }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!username.trim()) {
      setLocalError('Username is required.');
      return;
    }

    if (!password) {
      setLocalError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ mode, username: username.trim(), password });
    } catch (submitError) {
      setLocalError(submitError.message || 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="page-enter"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#050505',
      }}
    >
      <Motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: 'min(100%, 420px)',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
          borderRadius: 8,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <Gauge size={21} color="#f5f5f5" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', color: '#777', textTransform: 'uppercase', marginBottom: 5 }}>
              Pit Stop
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, margin: 0, lineHeight: 1.1, color: '#f5f5f5', letterSpacing: 0 }}>
              {isRegister ? 'Create account' : 'Sign in'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
          {[
            ['login', 'Sign in'],
            ['register', 'Create'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setMode(value); setLocalError(''); }}
              style={{
                height: 38,
                borderRadius: 6,
                border: 'none',
                background: mode === value ? '#f4f4f4' : 'transparent',
                color: mode === value ? '#050505' : '#9b9b9b',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Username
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 13px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: '#0d0d0d' }}>
            <UserRound size={18} color="#777" />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              spellCheck={false}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#f5f5f5', fontSize: 15 }}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Password
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 13px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: '#0d0d0d' }}>
            <Lock size={18} color="#777" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#f5f5f5', fontSize: 15 }}
            />
          </div>
        </label>

        {(localError || error) && (
          <div style={{ color: 'var(--accent-red)', fontSize: 13, lineHeight: 1.5 }}>
            {localError || error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            height: 48,
            border: 'none',
            borderRadius: 8,
            background: isSubmitting ? '#2a2a2a' : '#f4f4f4',
            color: isSubmitting ? '#777' : '#050505',
            cursor: isSubmitting ? 'wait' : 'pointer',
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {isSubmitting ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </Motion.form>
    </div>
  );
}
