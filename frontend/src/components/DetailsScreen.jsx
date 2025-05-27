import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './styles.css';
import logoImage from '../logo.jpg';

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

const DetailsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [selectedTitleId, setSelectedTitleId] = useState(location.state?.selectedTitleId || null);
  const [pendingEdits, setPendingEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [bulkUpdate, setBulkUpdate] = useState({
    status: '',
    comments: ''
  });

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    console.log('Is Admin:', adminStatus);
    fetchData(selectedTitleId);
  }, [selectedTitleId]);

  const fetchData = async (titleId = null) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const expensesUrl = titleId ? `/api/expense-forms/?title_id=${titleId}` : '/api/expense-forms/';
      const expensesResponse = await axios.get(expensesUrl, config);
      setExpenses(expensesResponse.data);

      const titlesResponse = await axios.get('/api/expense-titles/', config);
      setExpenseTitles(titlesResponse.data);

      setLoading(false);
    } catch (error) {
      setError('Failed to fetch data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleTitleSelect = (titleId) => {
    setSelectedTitleId(titleId);
    setPendingEdits({});
  };

  const selectedTitle = expenseTitles.find(title => title.id === selectedTitleId);
  const filteredExpenses = selectedTitleId
    ? expenses.filter(expense => expense.expense_title && expense.expense_title.id === selectedTitleId)
    : expenses;

  const handleAdminUpdate = async (expenseId, updatedFields) => {
    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    console.log('Attempting to update expense:', expenseId, updatedFields);
    try {
      const response = await axios.patch(`/api/expense-forms/${expenseId}/update_status/`, updatedFields, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Update successful:', response.data);
      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.id === expenseId 
            ? { ...expense, ...updatedFields }
            : expense
        )
      );
      setPendingEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[expenseId];
        return newEdits;
      });
    } catch (error) {
      console.error('Error updating expense:', error.response?.data || error.message);
      setError('Failed to update expense. Please try again.');
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedTitleId || !bulkUpdate.status) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    const formsToUpdate = filteredExpenses.map(expense => expense.id);

    try {
      const response = await axios.post('/api/expense-forms/bulk_update/', {
        expense_ids: formsToUpdate,
        status: bulkUpdate.status.toUpperCase(),
        comments: bulkUpdate.comments
      }, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      // Update local state
      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          formsToUpdate.includes(expense.id)
            ? { 
                ...expense, 
                status: bulkUpdate.status.toUpperCase(),
                comments: bulkUpdate.comments
              }
            : expense
        )
      );

      // Clear bulk update form
      setBulkUpdate({ status: '', comments: '' });
      setError('');
    } catch (error) {
      console.error('Error updating expenses:', error.response?.data || error.message);
      setError('Failed to update expenses. Please try again.');
    }
  };

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container error-message">{error}</div>;

  return (
    <div className="container">
      <div className="app-title-bar">
        <div className="logo-container">
          <img src={logoImage} alt="Logo" className="logo-img" />
          <span className="title">Expense Details</span>
        </div>
        <button onClick={handleLogout} className="btn">Logout</button>
      </div>

      <div className="expense-details-container">
        <div className="expense-titles-sidebar">
          <div className="card">
            <h3>Expense Titles</h3>
            {expenseTitles.map((title) => (
              <div
                key={title.id}
                className={`expense-item ${selectedTitleId === title.id ? 'selected' : ''}`}
                onClick={() => handleTitleSelect(title.id)}
                style={{ cursor: 'pointer' }}
              >
                <p>{title.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="expense-forms-main">
          <div className="expense-forms-container">
            <div className="card">
              <h3>Expense Forms</h3>
              {selectedTitle && <h2>{selectedTitle.title}</h2>}
              
              {isAdmin && selectedTitleId && (
                <div className="bulk-update-section">
                  <h4>Bulk Update All Forms</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <div>Status</div>
                      <select
                        value={bulkUpdate.status}
                        onChange={(e) => setBulkUpdate(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="">Select Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <div>Comments</div>
                      <textarea
                        value={bulkUpdate.comments}
                        onChange={(e) => setBulkUpdate(prev => ({ ...prev, comments: e.target.value }))}
                        placeholder="Enter comments for all forms"
                      />
                    </div>
                    <button
                      className="btn"
                      onClick={handleBulkUpdate}
                      disabled={!bulkUpdate.status}
                    >
                      Update All Forms
                    </button>
                  </div>
                </div>
              )}

              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="expense-item">
                  <div className="form-row">
                    <div className="form-group">
                      <div>Master Group</div>
                      <div>{expense.master_group}</div>
                    </div>
                    
                    <div className="form-group">
                      <div>Subgroup</div>
                      <div>{expense.subgroup}</div>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <div>Amount</div>
                      <input
                        type="number"
                        name="amount"
                        value={pendingEdits[expense.id]?.amount || expense.amount}
                        onChange={(e) => setPendingEdits(prev => ({ ...prev, [expense.id]: { ...prev[expense.id], amount: e.target.value } }))}
                        disabled={!isAdmin}
                      />
                      <div>{expense.currency}</div>
                    </div>
                    
                    <div className="form-group">
                      <div>Date</div>
                      <input
                        type="date"
                        name="date"
                        value={pendingEdits[expense.id]?.date || expense.date}
                        onChange={(e) => setPendingEdits(prev => ({ ...prev, [expense.id]: { ...prev[expense.id], date: e.target.value } }))}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  {isAdmin && expense.attachment && (
                    <div className="form-group">
                      <div>Attachment</div>
                      <a
                        href={expense.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}

                  <div className="form-group">
                    <div>Status</div>
                    {isAdmin ? (
                      <select
                        value={pendingEdits[expense.id]?.status?.toLowerCase() || expense.status.toLowerCase()}
                        onChange={(e) => {
                          const newStatus = e.target.value.toUpperCase();
                          setPendingEdits(prev => ({
                            ...prev,
                            [expense.id]: {
                              ...prev[expense.id],
                              status: newStatus
                            }
                          }));
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    ) : (
                      <div>
                        {expense.status}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <div>Comments</div>
                    {isAdmin ? (
                      <textarea
                        value={pendingEdits[expense.id]?.comments || expense.comments || ''}
                        onChange={(e) => {
                          setPendingEdits(prev => ({
                            ...prev,
                            [expense.id]: {
                              ...prev[expense.id],
                              comments: e.target.value
                            }
                          }));
                        }}
                      />
                    ) : (
                      <div>{expense.comments || 'N/A'}</div>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      className="btn"
                      onClick={() => handleAdminUpdate(expense.id, {
                        status: pendingEdits[expense.id]?.status || expense.status,
                        comments: pendingEdits[expense.id]?.comments || expense.comments || '',
                        amount: pendingEdits[expense.id]?.amount || expense.amount,
                        date: pendingEdits[expense.id]?.date || expense.date
                      })}
                      disabled={!pendingEdits[expense.id]}
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsScreen;