import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import GaragePage from './pages/GaragePage';
import AddCarPage from './pages/AddCarPage';
import CarDetailPage from './pages/CarDetailPage';
import './App.css';

const DEFAULT_CARS = [
  {
    id: 'demo-vehicle-1',
    name: 'Daily Driver',
    label: '2019 Toyota Camry',
    type: 'sedan',
    color: '#3b82f6',
    photos: [],
    createdAt: new Date().toISOString(),
  }
];

function loadCars() {
  try {
    const saved = localStorage.getItem('pitstop-cars');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_CARS;
}

function saveCars(cars) {
  try {
    localStorage.setItem('pitstop-cars', JSON.stringify(cars));
  } catch (e) { /* ignore */ }
}

export default function App() {
  const [cars, setCars] = useState(loadCars);

  useEffect(() => {
    saveCars(cars);
  }, [cars]);

  const handleAddCar = (newCar) => {
    setCars(prev => [...prev, newCar]);
  };

  return (
    <Routes>
      <Route path="/" element={<GaragePage cars={cars} />} />
      <Route path="/add-car" element={<AddCarPage onAddCar={handleAddCar} />} />
      <Route path="/car/:id" element={<CarDetailPage cars={cars} />} />
    </Routes>
  );
}
