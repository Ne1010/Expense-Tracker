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
  const [filteredTitles, setFilteredTitles] = useState([]);

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    fetchExpenseTitles();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = expenseTitles.filter(title =>
        title.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTitles(filtered);
    } else {
      setFilteredTitles([]);
    }
  }, [searchQuery, expenseTitles]);

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

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleSuggestionClick = (titleId) => {
    setSelectedTitleId(titleId);
    setSearchQuery('');
    setShowSuggestions(false);
    navigate('/details', { state: { selectedTitleId: titleId } });
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