import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DetailsScreen from './components/DetailsScreen';
import ExpenseForm from './components/ExpenseForm';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/details"
          element={
            <PrivateRoute>
              <DetailsScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit-form/:formId"
          element={
            <PrivateRoute>
              <ExpenseForm />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App; 