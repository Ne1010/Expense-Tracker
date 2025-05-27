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

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    fetchExpenseTitles();
  }, []);

  const fetchExpenseTitles = async () => {
    try {
      const response = await axios.get('/api/expense-titles/');
      setExpenseTitles(response.data);
    } catch (error) {
      console.error('Error fetching expense titles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expenseTitle.trim()) {
      setError('Please fill in the expense title');
      return;
    }

    const csrftoken = getCookie('csrftoken');

    try {
      const titleResponse = await axios.post('/api/expense-titles/', {
        title: expenseTitle
      }, {
        headers: {
          'X-CSRFToken': csrftoken,
        },
      });

      setExpenseTitles([titleResponse.data, ...expenseTitles]);
      setExpenseTitle('');
      setError('');
    } catch (error) {
      setError('Failed to create expense. Please try again.');
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
            <button type="submit" className="btn">
              Add Title
            </button>
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