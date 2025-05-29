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
    master_group: '',
    subgroup: '',
    amount: '',
    currency: '',
    date: '',
    status: 'pending',
    comments: '',
    attachment: null
  });

  const [subgroups, setSubgroups] = useState([]);
  const [error, setError] = useState('');

  const masterGroups = {
    TRAVEL: ['TICKET', 'FOOD', 'HOSPITALITY'],
    OFFICE_SUPPLIES: ['EQUIPMENT', 'STATIONERY'],
    UTILITIES: ['INTERNET', 'ELECTRICITY']
  };

  const currencies = ['USD', 'EUR', 'GBP', 'INR'];

  useEffect(() => {
    if (formData.master_group) {
      setSubgroups(masterGroups[formData.master_group]);
    }
  }, [formData.master_group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    
    const csrftoken = getCookie('csrftoken');
    if (!csrftoken) {
      setError('CSRF token not found. Please refresh the page and try again.');
      return;
    }

    const formDataToSend = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      if (key !== 'attachment' && formData[key] !== null && formData[key] !== '') {
        formDataToSend.append(key, formData[key]);
      }
    });

    // Add attachment if exists
    if (formData.attachment) {
      formDataToSend.append('attachment', formData.attachment);
    }

    // Add expense title ID and status
    formDataToSend.append('expense_title_id', titleId);
    formDataToSend.append('status', formData.status.toUpperCase());

    // Log the form data being sent
    console.log('Sending form data:', {
      master_group: formData.master_group,
      subgroup: formData.subgroup,
      amount: formData.amount,
      currency: formData.currency,
      date: formData.date,
      status: formData.status,
      expense_title_id: titleId
    });

    try {
      const response = await axios.post('/api/expense-forms/', formDataToSend, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        console.log('Form submitted successfully:', response.data);
        onClose();
      } else {
        setError('Failed to create expense form. Server returned no data.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        setError(error.response.data.detail || 'Failed to create expense form. Please try again.');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        setError('Error setting up request. Please try again.');
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-row">
          <div className="form-group">
            <label>Master Group</label>
            <select
              name="master_group"
              value={formData.master_group}
              onChange={handleChange}
              required
              disabled={isAdmin}
            >
              <option value="">Select Master Group</option>
              {Object.keys(masterGroups).map(group => (
                <option key={group} value={group}>{group.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subgroup</label>
            <select
              name="subgroup"
              value={formData.subgroup}
              onChange={handleChange}
              required
              disabled={!formData.master_group || isAdmin}
            >
              <option value="">Select Subgroup</option>
              {subgroups.map(subgroup => (
                <option key={subgroup} value={subgroup}>{subgroup.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              disabled={isAdmin}
            />
          </div>

          <div className="form-group">
            <label>Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              required
              disabled={isAdmin}
            >
              <option value="">Select Currency</option>
              {currencies.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              disabled={isAdmin}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={!isAdmin}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Comments</label>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            disabled={!isAdmin}
          />
        </div>

        <div className="form-group">
          <label>Attachment</label>
          <input
            type="file"
            name="attachment"
            onChange={handleChange}
            disabled={isAdmin}
          />
        </div>

        <div className="form-group">
          <button type="submit">
            {isAdmin ? 'Update' : 'Submit'}
          </button>
          <button 
            type="button" 
            onClick={onClose} 
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;