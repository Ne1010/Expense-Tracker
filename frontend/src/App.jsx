import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DetailsScreen from './components/DetailsScreen';
import CreateExpense from './components/CreateExpense';
import Reports from './components/Reports';
import './components/styles.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/expense/:id"
          element={
            <PrivateRoute>
              <DetailsScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-expense"
          element={
            <PrivateRoute>
              <CreateExpense />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App; 