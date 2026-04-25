import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Lock, UserRound } from 'lucide-react';

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

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      setLocalError('Use 3-24 letters, numbers, or underscores.');
      return;
    }

    if (password.length < 10) {
      setLocalError('Password must be at least 10 characters.');
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
    <div className="page-enter" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: 'min(100%, 420px)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Pit Stop
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, margin: 0, lineHeight: 1.2 }}>
            {isRegister ? 'Create account' : 'Sign in'}
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 4, background: 'rgba(255,255,255,0.035)', borderRadius: 'var(--radius-md)' }}>
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
                borderRadius: '10px',
                border: 'none',
                background: mode === value ? 'var(--accent-blue)' : 'transparent',
                color: mode === value ? 'white' : 'var(--text-secondary)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
            <UserRound size={18} color="var(--text-tertiary)" />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              spellCheck={false}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 15 }}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Password
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
            <Lock size={18} color="var(--text-tertiary)" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 15 }}
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
            borderRadius: 'var(--radius-md)',
            background: isSubmitting ? 'var(--bg-elevated)' : 'var(--accent-blue)',
            color: 'white',
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
