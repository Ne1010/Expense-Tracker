import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExpenseForm from './ExpenseForm';
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

const HomeScreen = () => {
  const navigate = useNavigate();
  const [expenseTitle, setExpenseTitle] = useState('');
  const [error, setError] = useState('');
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFormId, setActiveFormId] = useState(null);
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [copySourceTitleId, setCopySourceTitleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitleId, setSelectedTitleId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    fetchExpenseTitles();
    fetchExpenses();
  }, []);

  const fetchExpenseTitles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/expense-titles/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setExpenseTitles(response.data);
    } catch (error) {
      console.error('Error fetching expense titles:', error);
      setError('Failed to fetch expense titles. Please refresh the page.');
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/expense-forms/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

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
    navigate('/details', { state: { selectedTitleId: result.type === 'title' ? result.id : result.titleId } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!expenseTitle.trim()) {
      setError('Please fill in the expense title');
      return;
    }

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    try {
      const titleResponse = await axios.post('/api/expense-titles/', {
        title: expenseTitle
      }, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!titleResponse.data || !titleResponse.data.id) {
        throw new Error('Failed to create expense title');
      }

      const newTitleId = titleResponse.data.id;

      if (copySourceTitleId) {
        try {
          const sourceFormsResponse = await axios.get(`/api/expense-forms/?expense_title_id=${copySourceTitleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const sourceForms = sourceFormsResponse.data;

          for (const form of sourceForms) {
            const newForm = {
              expense_title_id: newTitleId,
              master_group: form.master_group,
              subgroup: form.subgroup,
              amount: form.amount,
              currency: form.currency || 'CAD',
              date: form.date,
              status: 'PENDING',
              comments: ''
            };

            await axios.post('/api/expense-forms/', newForm, {
              headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          }

          await fetchExpenseTitles();
          setError('Successfully created new title with copied forms.');
        } catch (copyError) {
          console.error('Error copying forms:', copyError.response?.data || copyError);
          setError('Created new title but failed to copy forms. Please try copying forms manually.');
        }
      } else {
        await fetchExpenseTitles();
        setError('Successfully created new title.');
      }
      
      setExpenseTitle('');
      setCopySourceTitleId(null);
      setShowCopyOptions(false);
    } catch (error) { 
      console.error('Error creating expense:', error.response?.data || error);
      setError(error.response?.data?.detail || 'Failed to create expense. Please try again.');
    }
  };

  const handleAddForm = (titleId) => {
    setActiveFormId(titleId);
  };

  const handleCloseForm = () => {
    setActiveFormId(null);
    fetchExpenseTitles();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleTitleSelect = (titleId) => {
    setSelectedTitleId(titleId);
    navigate('/details', { state: { selectedTitleId: titleId } });
  };

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

      <div className="card">
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="expenseTitle">New Expense Title</label>
            <input
              type="text"
              id="expenseTitle"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              required
              placeholder="Enter new expense title"
            />
          </div>
          <div className="form-group">
            <div className="title-action-buttons">
              <button 
                type="submit" 
                className="btn btn-add"
                disabled={!expenseTitle.trim()}
              >
                Add Title
              </button>
              {!isAdmin && (
                <button 
                  type="button"
                  className="btn btn-copy"
                  onClick={() => setShowCopyOptions(!showCopyOptions)}
                >
                  Copy Expense
                </button>
              )}
            </div>
            {showCopyOptions && !isAdmin && (
              <div className="copy-options">
                <select
                  value={copySourceTitleId || ''}
                  onChange={(e) => setCopySourceTitleId(e.target.value)}
                  className="copy-select"
                >
                  <option value="">Select title to copy</option>
                  {expenseTitles.map(title => (
                    <option key={title.id} value={title.id}>{title.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="expense-titles-container">
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
    </div>
  );
};

export default HomeScreen;