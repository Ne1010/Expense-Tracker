import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';  // Update this to match your Django server port
axios.defaults.withCredentials = true;

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const ExpenseForm = ({ titleId, isAdmin, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: '',
    attachment1: null,
    attachment2: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState('');

  const validateAmount = (value) => {
    if (value === '') return true;
    
    // Check if it's a valid number
    if (isNaN(value)) {
      setAmountError('Please enter a valid number');
      return false;
    }

    // Check decimal places
    const decimalPlaces = value.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > 2) {
      setAmountError('Only two decimal places are allowed');
      return false;
    }

    setAmountError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment1' || name === 'attachment2') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else if (name === 'amount') {
      // Only allow numbers and one decimal point
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) {
        // If more than one decimal point, keep only the first one
        const newValue = parts[0] + '.' + parts.slice(1).join('');
        setFormData(prev => ({
          ...prev,
          [name]: newValue
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: sanitizedValue
        }));
      }
      validateAmount(sanitizedValue);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validate amount before submission
    if (!validateAmount(formData.amount)) {
      setLoading(false);
      return;
    }

    try {
      const csrftoken = getCookie('csrftoken');
      const token = localStorage.getItem('token');
      const submitData = new FormData();

      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          submitData.append(key, formData[key]);
        }
      });

      await axios.post('/api/expense-forms/', submitData, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        amount: '',
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: '',
        attachment1: null,
        attachment2: null
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expense-form-container">
      <h2>Submit New Expense</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Expense submitted successfully!</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            type="text"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            required
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            <option value="Travel">Travel</option>
            <option value="Meals">Meals</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="attachment1">Attachment 1</label>
          <input
            type="file"
            id="attachment1"
            name="attachment1"
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="attachment2">Attachment 2</label>
          <input
            type="file"
            id="attachment2"
            name="attachment2"
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Expense'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;