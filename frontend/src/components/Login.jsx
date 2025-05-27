import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';
import logoImage from '../logo.jpg';
import Lottie from 'lottie-react';
import analyticsAnimation from './Analytics.json';


const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'USER'
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.username === 'admin' && formData.password === 'admin123') {
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('username', 'admin');
        navigate('/details');
      } else if (formData.username === 'user' && formData.password === 'user123') {
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('isAdmin', 'false');
        localStorage.setItem('username', 'user');
        navigate('/home');
      } else {
        setError('Invalid credentials');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-animation-container">
          <Lottie animationData={analyticsAnimation} loop={true} />
        </div>
      </div>
      <div className="login-right">
        <div className="logo">
          <img src={logoImage} alt="Expense Tracker Logo" />
          <h1>Expense Tracker</h1>
          <p>Track your expenses effortlessly</p>
        </div>

        <div className="card">
          <h2>Login to your account</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            
            <button type="submit" className="btn">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;