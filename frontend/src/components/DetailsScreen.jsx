import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './styles.css';
import logoImage from '../logo.jpg';
import ExpenseForm from './ExpenseForm';

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
    status: 'PENDING',
    comments: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [copySourceTitleId, setCopySourceTitleId] = useState(null);
  const [copyForms, setCopyForms] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState([]);
  const [showStatusCallout, setShowStatusCallout] = useState(false);
  const [statusCalloutMessage, setStatusCalloutMessage] = useState('');
  const [showCommentsError, setShowCommentsError] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const isUserAdmin = localStorage.getItem('username') === 'admin';
    setIsAdmin(isUserAdmin);
    localStorage.setItem('isAdmin', isUserAdmin);
    fetchData(selectedTitleId);
  }, [selectedTitleId]);

  const fetchData = async (titleId = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        navigate('/login');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      };

      // Fetch expenses
      const expensesUrl = titleId ? `/api/expense-forms/?title_id=${titleId}` : '/api/expense-forms/';
      const expensesResponse = await axios.get(expensesUrl, config);
      setExpenses(expensesResponse.data);

      // Fetch titles
      const titlesResponse = await axios.get('/api/expense-titles/', config);
      setExpenseTitles(titlesResponse.data);

      // If a title is selected, get status from its expense forms
      if (titleId && expensesResponse.data.length > 0) {
        // Get the most recent status and comments from the expense forms
        const titleExpenses = expensesResponse.data.filter(expense => 
          expense.expense_title?.id === titleId
        );
        
        if (titleExpenses.length > 0) {
          // Use the status and comments from the first expense form
          const firstExpense = titleExpenses[0];
          setTitleStatus({
            status: firstExpense.status || 'PENDING',
            comments: firstExpense.comments || ''
          });
        } else {
          setTitleStatus({
            status: 'PENDING',
            comments: ''
          });
        }
      } else {
        setTitleStatus({
          status: 'PENDING',
          comments: ''
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError('Failed to fetch data');
      }
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleViewAttachment = async (expense) => {
    if (!expense.attachment) return;

    try {
      // Base OneDrive folder URL
      const baseOneDriveUrl = 'https://appglide-my.sharepoint.com/:f:/g/personal/nehas_appglide_io/EuH_826LZ8BPuCr3EQWdilEB1zKyzbc86cJiIO-G6EgjJg?e=T6IYng';
      
      // Extract expense title from the attachment path
      // The path format is "expense_title/filename"
      const pathParts = expense.attachment.split('/');
      if (pathParts.length < 2) {
        throw new Error('Invalid attachment path format');
      }
      
      const expenseTitle = pathParts[0];
      
      // Sanitize the expense title for URL
      const sanitizedTitle = expenseTitle
        .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
        .trim()
        .replace(/\s+/g, '_'); // Replace spaces with underscores
      
      // Construct the full URL with the expense title as a subfolder
      const oneDriveUrl = `${baseOneDriveUrl}/${sanitizedTitle}`;
      
      // Open in new tab
      window.open(oneDriveUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening OneDrive folder:', error);
      setError('Failed to open OneDrive folder. Please try again.');
    }
  };

  const username = localStorage.getItem('username');
  const showCopyButton = true;
  
  const handleTitleSelect = (titleId) => {
    setSelectedTitleId(titleId);
    setPendingEdits({});
    setExpandedExpenses([]);
    fetchData(titleId);
  };

  const selectedTitle = expenseTitles.find(title => title.id === selectedTitleId);
  const filteredExpenses = selectedTitleId
    ? expenses.filter(expense => expense.expense_title && expense.expense_title.id === selectedTitleId)
    : expenses;

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase().trim();
    setSearchQuery(query);
    
    if (!query) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    // Search in expense titles
    const titleResults = expenseTitles.filter(title =>
      title.title.toLowerCase().includes(query)
    ).map(title => ({
      type: 'title',
      id: title.id,
      title: title.title,
      displayText: `Title: ${title.title}`
    }));

    // Search in expenses for status, master group, and subgroup
    const expenseResults = expenses.filter(expense => {
      const masterGroupMatch = MASTER_GROUPS.find(([value]) => 
        value === expense.master_group
      )?.[1].toLowerCase().includes(query);
      
      const subgroupMatch = SUBGROUPS[expense.master_group]?.find(([value]) => 
        value === expense.subgroup
      )?.[1].toLowerCase().includes(query);
      
      const statusMatch = STATUS_OPTIONS.find(([value]) => 
        value === expense.status
      )?.[1].toLowerCase().includes(query);

      const amountMatch = expense.amount?.toString().includes(query);
      const dateMatch = expense.date?.toLowerCase().includes(query);
      const currencyMatch = expense.currency?.toLowerCase().includes(query);

      return masterGroupMatch || subgroupMatch || statusMatch || amountMatch || dateMatch || currencyMatch;
    }).map(expense => {
      const title = expenseTitles.find(t => t.id === expense.expense_title?.id);
      const statusLabel = STATUS_OPTIONS.find(([value]) => value === expense.status)?.[1];
      const masterGroupLabel = MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1];
      const subgroupLabel = SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1];
      
      return {
        type: 'expense',
        id: expense.id,
        titleId: expense.expense_title?.id,
        displayText: `${title?.title || 'Unknown Title'} - ${masterGroupLabel} - ${subgroupLabel} (${statusLabel}) - ${expense.amount} ${expense.currency}`
      };
    });

    // Combine and deduplicate results
    const combinedResults = [...titleResults, ...expenseResults];
    const uniqueResults = Array.from(
      new Map(combinedResults.map(item => [item.id, item])).values()
    );

    setSearchResults(uniqueResults);
    setShowSuggestions(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleSuggestionClick = (result) => {
    if (result.type === 'title') {
      setSelectedTitleId(result.id);
    } else {
      setSelectedTitleId(result.titleId);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleTitleStatusUpdate = async (newStatus) => {
    if (!selectedTitleId) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('Authentication token not found. Please log in again.');
      return;
    }

    // Check if comments are provided
    if (!titleStatus.comments.trim()) {
      setShowCommentsError(true);
      return;
    }

    // Check if trying to update to same status
    const currentStatus = expenses.find(e => e.expense_title?.id === selectedTitleId)?.status;
    if (currentStatus === newStatus) {
      setStatusCalloutMessage(`This expense is already ${newStatus.toLowerCase()} and no update has to be made`);
      setShowStatusCallout(true);
      setTimeout(() => setShowStatusCallout(false), 3000);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      // Update all related expense forms
      const formsToUpdate = expenses.filter(expense => 
        expense.expense_title?.id === selectedTitleId
      );

      const updatedExpenses = await Promise.all(
        formsToUpdate.map(async (expense) => {
          const response = await axios.patch(
            `/api/expense-forms/${expense.id}/update_status/`,
            {
              status: newStatus,
              comments: titleStatus.comments
            },
            {
              headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            }
          );
          return response.data;
        })
      );

      // Update state with backend response
      setExpenses(prev => 
        prev.map(expense => {
          const updated = updatedExpenses.find(e => e.id === expense.id);
          return updated || expense;
        })
      );

      // Update title status
      setTitleStatus(prev => ({
        ...prev,
        status: newStatus
      }));

      setShowCommentsError(false);
    } catch (error) {
      console.error('Error updating expenses:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError('Failed to update expenses. Please try again.');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense.id);
    setPendingEdits({
      [expense.id]: {
        amount: parseFloat(expense.amount),
        date: expense.date,
        master_group: expense.master_group,
        subgroup: expense.subgroup,
        status: 'PENDING',
        comments: ''
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
        {
          ...pendingEdits[expenseId],
          status: 'PENDING',
          comments: ''
        },
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
        const sourceForms = expenses.filter(expense => 
          expense.expense_title?.id === copySourceTitleId
        );

        const formPromises = sourceForms.map(form => 
          axios.post('/api/expense-forms/', {
            ...form,
            expense_title: newTitleId,
            id: undefined
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

  const handleAddForm = () => {
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    fetchData(selectedTitleId);
  };

  const toggleExpandExpense = (expenseId) => {
    setExpandedExpenses(prev => {
      if (prev.includes(expenseId)) {
        return prev.filter(id => id !== expenseId);
      } else {
        return [...prev, expenseId];
      }
    });
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
              placeholder="Search by title, status, master group, subgroup, amount, date, or currency..."
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              onBlur={handleSearchBlur}
              className="search-input"
            />
            {showSuggestions && searchQuery.trim() && (
              <div className="search-suggestions">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(result)}
                    >
                      {result.displayText}
                    </div>
                  ))
                ) : (
                  <div className="no-results">No matching results found</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="logout-btn-wrapper">
          <button onClick={handleLogout} className="btn">Logout</button>
        </div>
      </div>

      <div className="expense-forms-full-width">
        {selectedTitleId ? (
          // Show only the selected title
          <div className="expense-title-section">
            <div className="expense-title-header">
              <h2>{expenseTitles.find(t => t.id === selectedTitleId)?.title}</h2>
              <div className="title-status-display">
                <div className="status-badge" data-status={titleStatus.status}>
                  {STATUS_OPTIONS.find(([value]) => value === titleStatus.status)?.[1]}
                </div>
                <div className="title-comments">
                  {titleStatus.comments || 'No comments'}
                </div>
              </div>
            </div>

            <div className="expense-forms-container">
              <div className="card">
                {isAdmin && (
                  <div className="title-status-section">
                    <div className="form-row">
                      <div className="form-group">
                        <div>Status</div>
                        {showStatusCallout && (
                          <div className="status-callout">
                            {statusCalloutMessage}
                          </div>
                        )}
                        <div className="status-buttons">
                          <button
                            className={`btn-accept ${isUpdatingStatus ? 'disabled' : ''}`}
                            onClick={() => handleTitleStatusUpdate('APPROVED')}
                            disabled={isUpdatingStatus}
                          >
                            {isUpdatingStatus ? 'Processing...' : 'Accept'}
                          </button>
                          <button
                            className={`btn-reject ${isUpdatingStatus ? 'disabled' : ''}`}
                            onClick={() => handleTitleStatusUpdate('REJECTED')}
                            disabled={isUpdatingStatus}
                          >
                            {isUpdatingStatus ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <div>Comments</div>
                        {showCommentsError && (
                          <div className="comments-error-callout">
                            Please add comments before accepting/rejecting
                          </div>
                        )}
                        <textarea
                          value={titleStatus.comments}
                          onChange={(e) => {
                            setTitleStatus(prev => ({
                              ...prev,
                              comments: e.target.value
                            }));
                            if (e.target.value.trim()) {
                              setShowCommentsError(false);
                            }
                          }}
                          placeholder="Enter comments for all forms"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Only show add form button if status is not APPROVED */}
                {expenses.find(e => e.expense_title?.id === selectedTitleId)?.status !== 'APPROVED' && (
                  <button
                    onClick={handleAddForm}
                    className="btn add-form-button"
                  >
                    ➕ Add Form
                  </button>
                )}

                {showExpenseForm && selectedTitleId && (
                  <div className="expense-form-container">
                    <ExpenseForm
                      titleId={selectedTitleId}
                      isAdmin={isAdmin}
                      onClose={handleCloseForm}
                    />
                  </div>
                )}

                {filteredExpenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className={`expense-item ${expandedExpenses.includes(expense.id) ? 'expanded' : 'collapsed'}`}
                  >
                    <div 
                      className="expense-summary" 
                      onClick={() => toggleExpandExpense(expense.id)}
                    >
                      <div className="summary-row">
                        <span className="master-group">
                          {MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group}
                        </span>
                        <span className="amount">{expense.amount} {expense.currency}</span>
                        <span className="date">{expense.date}</span>
                      </div>
                    </div>
                    <div className="expense-details">
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
                              step="0.01"
                              min="0"
                              value={pendingEdits[expense.id]?.amount || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                                setPendingEdits(prev => ({
                                  ...prev,
                                  [expense.id]: {
                                    ...prev[expense.id],
                                    amount: value
                                  }
                                }));
                              }}
                            />
                          ) : (
                            <div>{parseFloat(expense.amount).toFixed(2)}</div>
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
                          <button
                            onClick={() => handleViewAttachment(expense)}
                            className="attachment-link"
                          >
                            View Attachment
                          </button>
                        </div>
                      )}

                      {!isAdmin && (
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
                            expense.status !== 'APPROVED' && (
                              <button
                                className="btn"
                                onClick={() => handleEditExpense(expense)}
                              >
                                Edit Form
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Show all titles when none is selected
          <>
            {!isAdmin && (
              <button
                onClick={handleAddTitle}
                className="btn add-title-button"
              >
                ➕ Add Title
              </button>
            )}
            {expenseTitles.map((title) => (
              <div key={title.id} className="expense-title-section">
                <div className="expense-title-header" onClick={() => handleTitleSelect(title.id)}>
                  <h2>{title.title}</h2>
                  <div className="title-status-display">
                    <div className="status-badge" data-status={expenses.find(e => e.expense_title?.id === title.id)?.status || 'PENDING'}>
                      {STATUS_OPTIONS.find(([value]) => value === (expenses.find(e => e.expense_title?.id === title.id)?.status || 'PENDING'))?.[1]}
                    </div>
                    <div className="title-comments">
                      {expenses.find(e => e.expense_title?.id === title.id)?.comments || 'No comments'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DetailsScreen;