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

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    fetchExpenseTitles();
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
      // First create the new title
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

      // If copying is selected, copy only forms from the selected title
      if (copySourceTitleId) {
        try {
          // Get forms only from the selected source title
          const sourceFormsResponse = await axios.get(`/api/expense-forms/?expense_title_id=${copySourceTitleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const sourceForms = sourceFormsResponse.data;
          console.log('Source forms to copy:', sourceForms);

          // Create copies of forms for the new title
          for (const form of sourceForms) {
            // Create a new form with all the original values
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

            console.log('Creating new form with data:', newForm);

            const formResponse = await axios.post('/api/expense-forms/', newForm, {
              headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!formResponse.data) {
              throw new Error('Failed to create form copy');
            }

            console.log('Form created successfully:', formResponse.data);
          }

          // After copying forms, fetch the updated list
          await fetchExpenseTitles();
          setError('Successfully created new title with copied forms.');
        } catch (copyError) {
          console.error('Error copying forms:', copyError.response?.data || copyError);
          setError('Created new title but failed to copy forms. Please try copying forms manually.');
        }
      } else {
        // If not copying, just refresh the list
        await fetchExpenseTitles();
        setError('Successfully created new title.');
      }
      
      // Reset form
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

  return (
    <div className="container">
      <div className="app-title-bar">
        <div className="logo-container">
          <img src={logoImage} alt="Logo" className="logo-img" />
          <span className="title">Expense Management</span>
        </div>
        <button onClick={handleLogout} className="btn">Logout</button>
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

      <div>
        {expenseTitles.map((title) => (
          <div key={title.id} className="card expense-title-card">
            <h3 className="expense-title-heading"
              onClick={() => navigate('/details', { state: { selectedTitleId: title.id } })}
              style={{ cursor: 'pointer' }}
            >
              {title.title}
            </h3>
            <button
              onClick={() => handleAddForm(title.id)}
              className="btn add-form-button"
            >
              ➕ Add Form
            </button>
            {activeFormId === title.id && (
              <div className="expense-form-container">
                <ExpenseForm
                  titleId={title.id}
                  isAdmin={isAdmin}
                  onClose={handleCloseForm}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;