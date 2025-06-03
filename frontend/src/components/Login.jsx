import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './styles.css';
import logoImage from '../logo.jpg';
import Lottie from 'lottie-react';
import analyticsAnimation from './Analytics.json';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.withCredentials = true;  // Important for CSRF

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, get the CSRF token
      const csrfResponse = await axios.get('/api/csrf-token/');
      const csrfToken = csrfResponse.data.csrfToken;

      // Then authenticate with the backend
      const response = await axios.post('/api/token/', {
        username: formData.username,
        password: formData.password
      }, {
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.token) {
        // Store the token and user info
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', formData.username);
        localStorage.setItem('isAdmin', formData.username === 'admin' ? 'true' : 'false');

        // Set the default Authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        // Navigate based on user role
        if (formData.username === 'admin') {
          navigate('/details');
        } else {
          navigate('/home');
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(error.response.data.detail || 'Invalid credentials');
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Error setting up request. Please try again.');
      }
    } finally {
      setLoading(false);
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;