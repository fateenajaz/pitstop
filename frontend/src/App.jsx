import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import GaragePage from './pages/GaragePage';
import AddCarPage from './pages/AddCarPage';
import CarDetailPage from './pages/CarDetailPage';
import AuthPage from './pages/AuthPage';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const AUTH_TOKEN_KEY = 'pitstop-auth-token';

function loadAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch { /* ignore */ }
  return '';
}

export default function App() {
  const [authToken, setAuthToken] = useState(loadAuthToken);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(false);

  const apiFetch = useCallback((url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    return fetch(url, { ...options, headers });
  }, [authToken]);

  const persistAuth = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch { /* ignore */ }
  };

  const clearAuth = () => {
    setAuthToken('');
    setAuthUser(null);
    setCars([]);
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch { /* ignore */ }
  };

  const loadCars = useCallback(async (token = authToken) => {
    if (!token) {
      setCars([]);
      return;
    }

    setCarsLoading(true);
    try {
      const response = await fetch(`${API}/api/cars`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load cars.');
      const data = await response.json();
      setCars(Array.isArray(data.cars) ? data.cars : []);
    } catch (error) {
      console.error(error);
      setAuthError('Could not load your garage.');
    } finally {
      setCarsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (!authToken) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!response.ok) throw new Error('Session expired.');
        const data = await response.json();
        if (cancelled) return;
        setAuthUser(data.user);
        await loadCars(authToken);
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [authToken, loadCars]);

  const handleAuth = async ({ mode, username, password }) => {
    setAuthError('');
    const response = await fetch(`${API}/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed.');
    }

    persistAuth(data.token, data.user);
    await loadCars(data.token);
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await apiFetch(`${API}/api/auth/logout`, { method: 'POST' });
      } catch { /* ignore */ }
    }
    clearAuth();
  };

  const handleAddCar = async (newCar) => {
    const response = await apiFetch(`${API}/api/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCar),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to add car.');
    setCars(prev => [...prev, data.car]);
    return data.car;
  };

  const handleDeleteCar = async (carId) => {
    const response = await apiFetch(`${API}/api/cars/${encodeURIComponent(carId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete car.');
    setCars(prev => prev.filter(c => c.id !== carId));
  };

  const handleUpdateCar = async (carId, updates) => {
    const response = await apiFetch(`${API}/api/cars/${encodeURIComponent(carId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update car.');
    setCars(prev => prev.map(c => c.id === carId ? { ...c, ...updates } : c));
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    );
  }

  if (!authUser) {
    return <AuthPage onSubmit={handleAuth} error={authError} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <GaragePage cars={cars} onDeleteCar={handleDeleteCar} onLogout={handleLogout} user={authUser} isLoading={carsLoading} />
      } />
      <Route path="/add-car" element={
        <AddCarPage onAddCar={handleAddCar} />
      } />
      <Route path="/car/:id" element={
        <CarDetailPage cars={cars} onDeleteCar={handleDeleteCar} onUpdateCar={handleUpdateCar} apiFetch={apiFetch} authUser={authUser} />
      } />
    </Routes>
  );
}
