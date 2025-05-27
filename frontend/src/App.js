import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import HomeScreen from './components/HomeScreen';
import ExpenseForm from './components/ExpenseForm';
import DetailsScreen from './components/DetailsScreen';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/expense-form" element={<ExpenseForm />} />
        <Route path="/details" element={<DetailsScreen />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App; 