import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

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
    const csrftoken = getCookie('csrftoken');

    const formDataToSend = new FormData();
    
    Object.keys(formData).forEach(key => {
      if (key !== 'attachment' && formData[key] !== null) {
        formDataToSend.append(key, formData[key]);
      }
    });

    if (formData.attachment) {
      formDataToSend.append('attachment', formData.attachment);
    }

    formDataToSend.append('expense_title_id', titleId);
    formDataToSend.append('status', formData.status.toUpperCase());

    try {
      const response = await axios.post('/api/expense-forms/', formDataToSend, {
        headers: {
          'X-CSRFToken': csrftoken,
        },
      });

      if (response.data) {
        onClose();
      } else {
        setError('Failed to create expense form. Server returned no data.');
      }
    } catch (error) {
      console.error('Error submitting form:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to create expense form. Please try again.');
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