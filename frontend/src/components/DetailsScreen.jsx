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

const STATUS_OPTIONS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected']
];

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
  const [titleStatus, setTitleStatus] = useState({
    status: '',
    comments: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [copySourceTitleId, setCopySourceTitleId] = useState(null);
  const [copyForms, setCopyForms] = useState(true);

  useEffect(() => {
    // Check if user is admin by checking the username
    const isUserAdmin = localStorage.getItem('username') === 'admin';
    setIsAdmin(isUserAdmin);
    localStorage.setItem('isAdmin', isUserAdmin);
    fetchData(selectedTitleId);
  }, [selectedTitleId]);

  const fetchData = async (titleId = null) => {
    try {
      setLoading(true);
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

      if (titleId && expensesResponse.data.length > 0) {
        const firstExpense = expensesResponse.data[0];
        setTitleStatus({
          status: firstExpense.status || '',
          comments: firstExpense.comments || ''
        });
      } else {
        setTitleStatus({
          status: '',
          comments: ''
        });
      }

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

  const username = localStorage.getItem('username');
  // Show copy button for both admin and regular users
  const showCopyButton = true;
  
  // Debug logs
  console.log('Username:', username);
  console.log('Is Admin:', isAdmin);
  console.log('Show Copy Button:', showCopyButton);
  console.log('LocalStorage isAdmin:', localStorage.getItem('isAdmin'));

  const handleTitleSelect = (titleId) => {
    setSelectedTitleId(titleId);
    setPendingEdits({});
    fetchData(titleId);
  };

  const selectedTitle = expenseTitles.find(title => title.id === selectedTitleId);
  const filteredExpenses = selectedTitleId
    ? expenses.filter(expense => expense.expense_title && expense.expense_title.id === selectedTitleId)
    : expenses;

  const filteredTitles = expenseTitles.filter(title =>
    title.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (titleId) => {
    setSelectedTitleId(titleId);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleAdminUpdate = async (expenseId, updatedFields) => {
    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    try {
      const response = await axios.patch(`/api/expense-forms/${expenseId}/update_status/`, updatedFields, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
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

  const handleTitleStatusUpdate = async () => {
    if (!selectedTitleId || !titleStatus.status) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    try {
      const formsToUpdate = expenses.filter(expense => 
        expense.expense_title?.id === selectedTitleId
      );

      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.expense_title?.id === selectedTitleId
            ? { 
                ...expense, 
                status: titleStatus.status,
                comments: titleStatus.comments
              }
            : expense
        )
      );

      const promises = formsToUpdate.map(expense => 
        axios.patch(`/api/expense-forms/${expense.id}/update_status/`, {
          status: titleStatus.status,
          comments: titleStatus.comments
        }, {
          headers: {
            'X-CSRFToken': csrftoken,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        })
      );

      await Promise.all(promises);
      
      const expensesUrl = `/api/expense-forms/?title_id=${selectedTitleId}`;
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      const response = await axios.get(expensesUrl, config);
      setExpenses(response.data);
      
      setError('');
    } catch (error) {
      console.error('Error updating expenses:', error.response?.data || error.message);
      setError('Failed to update expenses. Please try again.');
      fetchData(selectedTitleId);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense.id);
    setPendingEdits({
      [expense.id]: {
        amount: expense.amount,
        date: expense.date,
        master_group: expense.master_group,
        subgroup: expense.subgroup
      }
    });
  };

  const handleMasterGroupChange = (expenseId, value) => {
    setPendingEdits(prev => ({
      ...prev,
      [expenseId]: {
        ...prev[expenseId],
        master_group: value,
        subgroup: ''
      }
    }));
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setPendingEdits({});
  };

  const handleSaveEdit = async (expenseId) => {
    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.patch(`/api/expense-forms/${expenseId}/`, 
        pendingEdits[expenseId],
        {
          headers: {
            'X-CSRFToken': csrftoken,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.id === expenseId 
            ? { ...expense, ...response.data }
            : expense
        )
      );

      setEditingExpense(null);
      setPendingEdits({});
      setError('');
    } catch (error) {
      console.error('Error updating expense:', error.response?.data || error.message);
      setError('Failed to update expense. Please try again.');
    }
  };

  const handleAddTitle = async () => {
    if (!newTitle.trim()) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post('/api/expense-titles/', {
        title: newTitle
      }, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setExpenseTitles(prev => [...prev, response.data]);
      setNewTitle('');
      setError('');
    } catch (error) {
      console.error('Error adding title:', error.response?.data || error.message);
      setError('Failed to add title. Please try again.');
    }
  };

  const handleCopyExpense = async () => {
    if (!newTitle.trim() || !copySourceTitleId) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    try {
      // Create new title
      const titleResponse = await axios.post('/api/expense-titles/', {
        title: newTitle
      }, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const newTitleId = titleResponse.data.id;

      if (copyForms) {
        // Get all forms from source title
        const sourceForms = expenses.filter(expense => 
          expense.expense_title?.id === copySourceTitleId
        );

        // Create copies of all forms for the new title
        const formPromises = sourceForms.map(form => 
          axios.post('/api/expense-forms/', {
            ...form,
            expense_title: newTitleId,
            id: undefined // Remove ID to create new record
          }, {
            headers: {
              'X-CSRFToken': csrftoken,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );

        await Promise.all(formPromises);
      }

      // Refresh data
      setExpenseTitles(prev => [...prev, titleResponse.data]);
      setNewTitle('');
      setCopySourceTitleId(null);
      setShowCopyOptions(false);
      setError('');
    } catch (error) {
      console.error('Error copying expense:', error.response?.data || error.message);
      setError('Failed to copy expense. Please try again.');
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
        <div className="search-wrapper">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search expense titles..."
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => setShowSuggestions(true)}
              onBlur={handleSearchBlur}
              className="search-input"
            />
            {showSuggestions && searchQuery && (
              <div className="search-suggestions">
                {filteredTitles.length > 0 ? (
                  filteredTitles.map((title) => (
                    <div
                      key={title.id}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(title.id)}
                    >
                      {title.title}
                    </div>
                  ))
                ) : (
                  <div className="no-results">No matching titles found</div>
                )}
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="btn">Logout</button>
        </div>
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
              
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="expense-item">
                  <div className="form-row">
                    <div className="form-group">
                      <div>Master Group</div>
                      {editingExpense === expense.id ? (
                        <select
                          value={pendingEdits[expense.id]?.master_group || expense.master_group}
                          onChange={(e) => handleMasterGroupChange(expense.id, e.target.value)}
                        >
                          {MASTER_GROUPS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <div>{MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group}</div>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <div>Subgroup</div>
                      {editingExpense === expense.id ? (
                        <select
                          value={pendingEdits[expense.id]?.subgroup || expense.subgroup}
                          onChange={(e) => setPendingEdits(prev => ({
                            ...prev,
                            [expense.id]: {
                              ...prev[expense.id],
                              subgroup: e.target.value
                            }
                          }))}
                        >
                          {SUBGROUPS[pendingEdits[expense.id]?.master_group || expense.master_group]?.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <div>{SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1] || expense.subgroup}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <div>CURR</div>
                      {editingExpense === expense.id ? (
                        <select
                          value={pendingEdits[expense.id]?.currency || expense.currency}
                          onChange={(e) => setPendingEdits(prev => ({
                            ...prev,
                            [expense.id]: {
                              ...prev[expense.id],
                              currency: e.target.value
                            }
                          }))}
                        >
                          {CURRENCIES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <div>{expense.currency}</div>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <div>Amount</div>
                      {editingExpense === expense.id ? (
                        <input
                          type="number"
                          value={pendingEdits[expense.id]?.amount || expense.amount}
                          onChange={(e) => setPendingEdits(prev => ({
                            ...prev,
                            [expense.id]: {
                              ...prev[expense.id],
                              amount: e.target.value
                            }
                          }))}
                        />
                      ) : (
                        <div>{expense.amount}</div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <div>Date</div>
                      {editingExpense === expense.id ? (
                        <input
                          type="date"
                          value={pendingEdits[expense.id]?.date || expense.date}
                          onChange={(e) => setPendingEdits(prev => ({
                            ...prev,
                            [expense.id]: {
                              ...prev[expense.id],
                              date: e.target.value
                            }
                          }))}
                        />
                      ) : (
                        <div>{expense.date}</div>
                      )}
                    </div>
                  </div>

                  {expense.attachment && (
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

                  {/* Add status and comments display for all users */}
                  <div className="form-group">
                    <div>Status</div>
                    <div className="status-display">
                      {expense.status || 'Pending'}
                    </div>
                  </div>
                  <div className="form-group">
                    <div>Comments</div>
                    <div className="comments-display">
                      {expense.comments || 'No comments'}
                    </div>
                  </div>

                  <div className="form-actions">
                    {editingExpense === expense.id ? (
                      <>
                        <button
                          className="btn"
                          onClick={() => handleSaveEdit(expense.id)}
                        >
                          Save Changes
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn"
                        onClick={() => handleEditExpense(expense)}
                      >
                        Edit Form
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isAdmin && selectedTitleId && (
                <div className="title-status-section">
                  <h4>Status and Comments</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <div className="status-buttons">
                        <button
                          className="btn-accept"
                          onClick={() => {
                            setTitleStatus(prev => ({
                              ...prev,
                              status: 'APPROVED'
                            }));
                            handleTitleStatusUpdate();
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => {
                            setTitleStatus(prev => ({
                              ...prev,
                              status: 'REJECTED'
                            }));
                            handleTitleStatusUpdate();
                          }}
                        >
                          Reject
                        </button>
                      </div>
                      <div>Comments</div>
                      <textarea
                        value={titleStatus.comments}
                        onChange={(e) => setTitleStatus(prev => ({
                          ...prev,
                          comments: e.target.value
                        }))}
                        placeholder="Enter comments for all forms"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsScreen;