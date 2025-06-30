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

const MASTER_GROUPS = [
  ['TRAVEL', 'Travel'],
  ['OFFICE_SUPPLIES', 'Office Supplies'],
  ['UTILITIES', 'Utilities'],
];

const CURRENCIES = [
  ['USD', 'USD'],
  ['EUR', 'EUR'],
  ['GBP', 'GBP'],
  ['INR', 'INR'],
  ['CAD', 'CAD'],
];

const SUBGROUPS = {
  'TRAVEL': [
    ['TICKET', 'Ticket Expense'],
    ['FOOD', 'Food Expense'],
    ['HOSPITALITY', 'Hospitality Expense'],
  ],
  'OFFICE_SUPPLIES': [
    ['EQUIPMENT', 'Equipment'],
    ['STATIONERY', 'Stationery'],
  ],
  'UTILITIES': [
    ['INTERNET', 'Internet'],
    ['ELECTRICITY', 'Electricity'],
  ],
};

const ExpenseForm = ({ titleId, isAdmin, onClose, existingAttachments: initialAttachments = [], expenses }) => {
  const [formData, setFormData] = useState({
    master_group: 'TRAVEL',
    subgroup: 'TICKET',
    currency: 'USD',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState(initialAttachments || []);
  const [showOneDriveErrorModal, setShowOneDriveErrorModal] = useState(false);
  const [oneDriveErrorMessage, setOneDriveErrorMessage] = useState('');
  const [duplicateAttachmentError, setDuplicateAttachmentError] = useState('');

  const validateAmount = (value) => {
    if (value === '') {
      setAmountError('Amount is required');
      return false;
    }
    if (isNaN(value)) {
      setAmountError('Please enter a valid number');
      return false;
    }
    if (Number(value) <= 0) {
      setAmountError('Amount must be greater than 0');
      return false;
    }
    const decimalPlaces = value.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > 2) {
      setAmountError('Only two decimal places are allowed');
      return false;
    }
    setAmountError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) {
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    let duplicateFound = false;

    const normalize = name => name?.trim().toLowerCase();

    // Get all existing names: current + already saved on server
    const existingNames = new Set([
      ...attachments.map(f => normalize(f.name)),
      ...existingAttachments.map(att => normalize(att.name || (att.url ? att.url.split('/').pop() : '')))
    ]);

    const newFiles = [];

    for (let file of files) {
      const fileName = normalize(file.name);
      if (existingNames.has(fileName)) {
        duplicateFound = true;
      } else {
        newFiles.push(file);
        existingNames.add(fileName);
      }
    }

    if (duplicateFound) {
      setDuplicateAttachmentError('❌ Duplicate attachment detected. Please do not add the same file again.');
      e.target.value = null; // Reset the file input
    } else {
      setDuplicateAttachmentError('');
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = async (attachmentId) => {
    try {
      const csrftoken = getCookie('csrftoken');
      const token = localStorage.getItem('token');
      
      // Find the expense form that contains this attachment
      const expenseForm = expenses.find(exp => 
        exp.attachments && exp.attachments.some(att => att.id === attachmentId)
      );
      
      if (!expenseForm) {
        setError('Expense form not found for this attachment.');
        return;
      }
      
      // Call the backend API to hard delete the attachment
      const url = `/api/expense-forms/${expenseForm.id}/delete_attachment/`.trim();
      await axios.delete(
        url,
        {
          data: { attachment_id: attachmentId },
          headers: {
            'X-CSRFToken': csrftoken,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Remove the attachment from the existingAttachments list
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
      setError('');
    } catch (error) {
      console.error('Error deleting attachment:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to delete attachment. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    if (!validateAmount(formData.amount)) {
      setLoading(false);
      return;
    }
    if (!titleId) {
      setError('Expense title is required.');
      setLoading(false);
      return;
    }
    try {
      const csrftoken = getCookie('csrftoken');
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add expense title ID and status
      submitData.append('expense_title_id', titleId);
      submitData.append('status', 'PENDING');
      submitData.append('comments', '');
      
      // Add attachments
      attachments.forEach(file => {
        submitData.append('attachments', file);
      });
      
      // DEBUG: Log all FormData keys and values
      for (let [key, value] of submitData.entries()) {
        console.log(`${key}:`, value);
      }
      
      // Submit the form
      const response = await axios.post('/api/expense-forms/', submitData, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update all forms under this title to PENDING status
      const updatePromises = expenses
        .filter(expense => expense.expense_title?.id === titleId)
        .map(expense => 
          axios.patch(
            `/api/expense-forms/${expense.id}/update_status/`,
            {
              status: 'PENDING',
              comments: ''
            },
            {
              headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          )
        );

      await Promise.all(updatePromises);

      setSuccess(true);
      setFormData({
        master_group: 'TRAVEL',
        subgroup: 'TICKET',
        currency: 'USD',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      setAttachments([]);
      // Close the form after successful submission
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Failed to submit expense. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to get file name from URL
  const getAttachmentName = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return decodeURIComponent(filename);
    } catch (error) {
      return 'Unknown file';
    }
  };

  // Subgroup options update on master_group change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      subgroup: SUBGROUPS[formData.master_group]?.[0]?.[0] || ''
    }));
    // eslint-disable-next-line
  }, [formData.master_group]);

  // Function to check if error is OneDrive authentication related
  const isOneDriveAuthError = (errorMessage) => {
    return errorMessage && (
      errorMessage.includes('InvalidAuthenticationToken') ||
      errorMessage.includes('token is expired') ||
      errorMessage.includes('Upload to OneDrive failed') ||
      errorMessage.includes('Lifetime validation failed')
    );
  };

  // Function to handle OneDrive authentication errors
  const handleOneDriveAuthError = (errorMessage) => {
    setOneDriveErrorMessage(errorMessage);
    setShowOneDriveErrorModal(true);
  };

  // Function to close OneDrive error modal
  const closeOneDriveErrorModal = () => {
    setShowOneDriveErrorModal(false);
    setOneDriveErrorMessage('');
  };

  // Function to retry OneDrive authentication
  const retryOneDriveAuth = () => {
    closeOneDriveErrorModal();
    // Refresh the page to trigger new authentication
    window.location.reload();
  };

  return (
    <div className="expense-form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="master_group">MASTER GROUP</label>
            <select
              id="master_group"
              name="master_group"
              value={formData.master_group}
              onChange={handleChange}
              required
            >
              {MASTER_GROUPS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="subgroup">SUBGROUP</label>
            <select
              id="subgroup"
              name="subgroup"
              value={formData.subgroup}
              onChange={handleChange}
              required
            >
              {SUBGROUPS[formData.master_group]?.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="currency">CURR</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              required
            >
              {CURRENCIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="amount">AMOUNT</label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              placeholder="0.00"
            />
            {amountError && <div className="amount-error-callout">{amountError}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="date">DATE</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="attachments-section">
          <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '1rem 0' }}>Attachments</div>
          
          {/* Existing attachments list */}
          {existingAttachments && existingAttachments.length > 0 && (
            <div className="existing-attachments">
              {existingAttachments.map((att, idx) => (
                <div key={att.id || idx} className="current-attachment">
                  <a href={att.url || att} target="_blank" rel="noopener noreferrer" style={{ color: '#00b4d8' }}>
                    {getAttachmentName(att.url || att)}
                  </a>
                  <button type="button" className="view-btn" onClick={() => window.open(att.url || att, '_blank', 'noopener,noreferrer')}>
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-delete"
                    onClick={() => handleDeleteExistingAttachment(att.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New attachments list */}
          {attachments.length > 0 && (
            <div className="new-attachments">
              {attachments.map((file, index) => (
                <div key={index} className="attachment-item">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="remove-attachment-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File upload input - Updated section */}
          <div className="form-group">
            <label htmlFor="attachments">ATTACHMENTS</label>
              <input
                type="file"
              id="attachments"
              multiple
                onChange={handleFileChange}
              className={duplicateAttachmentError ? 'input-error-shake' : ''}
              />
          {duplicateAttachmentError && (
            <div className="error-message">{duplicateAttachmentError}</div>
          )}
          </div>
        </div>

        <div className="expense-form-actions">
          <button type="submit" className="btn btn-save" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="btn btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Expense submitted successfully!</div>}
      </form>
      
      {showOneDriveErrorModal && (
        <div className="delete-confirmation-callout">
          <div className="callout-content onedrive-error-content">
            <div className="onedrive-error-header">
              <h3>⚠️ OneDrive Authentication Error</h3>
            </div>
            <div className="onedrive-error-message">
              <p>The OneDrive connection has expired or failed. This is needed to upload and manage your expense attachments.</p>
              <p className="error-details">{oneDriveErrorMessage}</p>
            </div>
            <div className="callout-actions">
              <button onClick={retryOneDriveAuth} className="btn btn-primary">
                🔄 Retry OneDrive Login
              </button>
              <button onClick={closeOneDriveErrorModal} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;