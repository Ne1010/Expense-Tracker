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
  ['SEND_FOR_APPROVAL', 'Sent for Approval'],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitleId, setSelectedTitleId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [copyModalForTitle, setCopyModalForTitle] = useState(null);
  const [copyNewTitle, setCopyNewTitle] = useState('');
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  // Helper function to determine the overall status of an expense title
  const getOverallExpenseTitleStatus = (titleId) => {
    const titleExpenses = expenses.filter(expense =>
      expense.expense_title?.id === titleId
    );

    if (titleExpenses.length === 0) {
      return 'PENDING'; // Default for titles with no expenses
    }

    // Prioritize SEND_FOR_APPROVAL > PENDING > REJECTED > APPROVED
    if (titleExpenses.some(expense => expense.status === 'SEND_FOR_APPROVAL')) {
      return 'SEND_FOR_APPROVAL';
    }
    if (titleExpenses.some(expense => expense.status === 'PENDING')) {
      return 'PENDING';
    }
    if (titleExpenses.some(expense => expense.status === 'REJECTED')) {
      return 'REJECTED';
    }
    return 'APPROVED'; // If no PENDING or REJECTED, all are APPROVED
  };

  // Unified function to refresh all relevant data
  const refreshAllData = async () => {
    await fetchExpenseTitles();
    await fetchExpenses();
  };

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
      const token = localStorage.getItem('token');
      const csrftoken = getCookie('csrftoken');
      const headers = {
        'X-CSRFToken': csrftoken,
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };
      const titleResponse = await axios.post('/api/expense-titles/', {
        title: expenseTitle
      }, { headers });

      if (!titleResponse.data || !titleResponse.data.id) {
        throw new Error('Failed to create expense title');
      }

      const newTitleId = titleResponse.data.id;

      setExpenseTitle('');
      // Immediately navigate to DetailsScreen with the new title ID
      navigate('/details', { state: { selectedTitleId: newTitleId } });
    } catch (error) {
      console.error('Error creating expense:', error.response?.data || error);
      setError(error.response?.data?.detail || 'Failed to create expense. Please try again.');
    }
  };

  const handleAddForm = (titleId) => {
    setActiveFormId(titleId);
  };

  const handleCloseForm = async () => {
    setActiveFormId(null);
    await refreshAllData();
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

  const handleImportFile = async () => {
    if (!importTitle.trim() || !importFile) {
      setImportError('Please provide a title and select a file.');
      return;
    }

    setImporting(true);
    setImportError('');

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileContent = event.target.result;
        const fileType = importFile.name.split('.').pop().toLowerCase();
        let rawExpenses = [];

        if (fileType === 'json') {
          const data = JSON.parse(fileContent);
          if (!data.expenses || !Array.isArray(data.expenses)) {
            throw new Error('Invalid JSON format. Expected an object with an "expenses" array.');
          }
          rawExpenses = data.expenses.map(exp => ({
            'Master Group': exp.master_group,
            'Subgroup': exp.subgroup,
            'Currency': exp.currency,
            'Amount': exp.amount,
            'Date': exp.date,
          }));
        } else if (fileType === 'xml') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(fileContent, "application/xml");
          const expenseNodes = xmlDoc.getElementsByTagName('expense');
          rawExpenses = Array.from(expenseNodes).map(node => {
            const getTagValue = (tagName) => node.getElementsByTagName(tagName)[0]?.textContent || '';
            return {
              'Master Group': getTagValue('master_group'),
              'Subgroup': getTagValue('subgroup'),
              'Currency': getTagValue('currency'),
              'Amount': getTagValue('amount'),
              'Date': getTagValue('date'),
            };
          });
        } else if (fileType === 'csv' || fileType === 'xlsx') {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(fileContent, { type: fileType === 'csv' ? 'string' : 'binary' });
          const sheetName = workbook.SheetNames[0];
          rawExpenses = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
          throw new Error('Unsupported file type.');
        }

        const transformImportedData = (data) => {
          return data.map(item => {
            const masterGroupValue = MASTER_GROUPS.find(g => g[1] === item['Master Group'])?.[0];
            if (!masterGroupValue) return null;

            const subgroupValue = SUBGROUPS[masterGroupValue]?.find(sg => sg[1] === item['Subgroup'])?.[0];
            if (!subgroupValue) return null;
            
            return {
              master_group: masterGroupValue,
              subgroup: subgroupValue,
              currency: item['Currency'] || item['currency'],
              amount: item['Amount'] || item['amount'],
              date: item['Date'] ? new Date(item['Date']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            };
          }).filter(Boolean);
        };

        const transformedExpenses = transformImportedData(rawExpenses);

        if (transformedExpenses.length === 0) {
          throw new Error('No valid expense data found in the file or data is malformed.');
        }

        const token = localStorage.getItem('token');
        const csrftoken = getCookie('csrftoken');
        const headers = {
          'X-CSRFToken': csrftoken,
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        };

        const titleResponse = await axios.post('/api/expense-titles/', { title: importTitle.trim() }, { headers });
        const newTitleId = titleResponse.data.id;

        const creationPromises = transformedExpenses.map(expenseData => {
          const payload = {
            ...expenseData,
            expense_title_id: newTitleId,
            status: 'PENDING',
            comments: ''
          };
          return axios.post('/api/expense-forms/', payload, { headers });
        });

        await Promise.all(creationPromises);

        setShowImportModal(false);
        setImportTitle('');
        setImportFile(null);
        navigate('/details', { state: { selectedTitleId: newTitleId } });

      } catch (error) {
        console.error('Import error:', error);
        setImportError(error.message || 'Failed to import expenses.');
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read the file.');
      setImporting(false);
    };

    const fileType = importFile.name.split('.').pop().toLowerCase();
    if (fileType === 'csv' || fileType === 'json' || fileType === 'xml') {
      reader.readAsText(importFile);
    } else if (fileType === 'xlsx') {
      reader.readAsBinaryString(importFile);
    } else {
      setImportError('Unsupported file type.');
      setImporting(false);
    }
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
              <button
                type="button"
                className="btn btn-import"
                onClick={() => setShowImportModal(true)}
              >
                Import
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="expense-titles-container">
        <div className="card">
          <h3>Expense Titles</h3>
          {expenseTitles
            .sort((a, b) => {
              const statusA = getOverallExpenseTitleStatus(a.id);
              const statusB = getOverallExpenseTitleStatus(b.id);
              const statusOrder = { 'PENDING': 1, 'REJECTED': 2, 'APPROVED': 3 };
              if (statusOrder[statusA] !== statusOrder[statusB]) {
                return statusOrder[statusA] - statusOrder[statusB];
              } else {
                return new Date(b.created_at) - new Date(a.created_at);
              }
            })
            .map((title) => (
            <div
              key={title.id}
              className={`expense-item ${selectedTitleId === title.id ? 'selected' : ''}`}
              onClick={() => handleTitleSelect(title.id)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <p>{title.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="status-badge" data-status={getOverallExpenseTitleStatus(title.id)}>
                  {STATUS_OPTIONS.find(([value]) => value === getOverallExpenseTitleStatus(title.id))?.[1]}
                </div>
                {!isAdmin && getOverallExpenseTitleStatus(title.id) === 'PENDING' && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginLeft: '0.5rem', background: '#888', color: '#fff' }}
                    onClick={async e => {
                      e.stopPropagation();
                      try {
                        const token = localStorage.getItem('token');
                        const csrftoken = getCookie('csrftoken');
                        // Find the first expense form for this title
                        const expenseForm = expenses.find(exp => exp.expense_title?.id === title.id);
                        if (!expenseForm) {
                          setError('No expense form found to send for approval.');
                          return;
                        }
                        await axios.post(`/api/expense-forms/${expenseForm.id}/send_for_approval/`, {}, {
                          headers: {
                            'X-CSRFToken': csrftoken,
                            'Authorization': `Token ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        await refreshAllData();
                      } catch (err) {
                        setError('Failed to send for approval. Please try again.');
                      }
                    }}
                  >
                    Send for Approval
                  </button>
                )}
                {!isAdmin && (
                  <button
                    className="btn btn-copy"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={e => {
                      e.stopPropagation();
                      setCopyModalForTitle(title.id);
                      setCopyNewTitle('');
                      setCopyError('');
                    }}
                  >
                    📋 Copy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {copyModalForTitle && (
        <div className="status-message-callout">
          <div className="callout-content">
            <h3>Copy Expense</h3>
            <div className="form-group" style={{ width: '100%' }}>
              <label>New Expense Title</label>
              <input
                type="text"
                value={copyNewTitle}
                onChange={e => setCopyNewTitle(e.target.value)}
                placeholder="Enter new expense title"
              />
            </div>
            {copyError && <div className="error-message">{copyError}</div>}
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!copyNewTitle.trim()) {
                    setCopyError('Please enter a new title');
                    return;
                  }
                  setCopying(true);
                  setCopyError('');
                  let failedForms = [];
                  try {
                    const token = localStorage.getItem('token');
                    const csrftoken = getCookie('csrftoken');
                    // 1. Create new title
                    const titleResponse = await axios.post('/api/expense-titles/', {
                      title: copyNewTitle.trim()
                    }, {
                      headers: {
                        'X-CSRFToken': csrftoken,
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    const newTitleId = titleResponse.data.id;
                    // 2. Get all forms from source title
                    const sourceForms = expenses.filter(exp => exp.expense_title?.id === copyModalForTitle);
                    // 3. Copy all forms to new title, including attachments
                    await Promise.all(sourceForms.map(async (form) => {
                      const formData = new FormData();
                      formData.append('master_group', form.master_group);
                      formData.append('subgroup', form.subgroup);
                      formData.append('amount', form.amount);
                      formData.append('currency', form.currency);
                      formData.append('date', form.date);
                      formData.append('expense_title_id', newTitleId);
                      formData.append('status', 'PENDING');
                      formData.append('comments', '');
                      let attachmentSuccess = 0;
                      if (form.attachments && form.attachments.length > 0) {
                        await Promise.all(form.attachments.map(async (att) => {
                          try {
                            // Use backend proxy endpoint instead of direct OneDrive URL
                            const originalFileName = att.url.split('/').pop();
                            const safeFilename = encodeURIComponent(originalFileName);
                            const safeTitle = encodeURIComponent(form.expense_title.title || '');
                            const downloadUrl = `/api/attachments/${safeTitle}/${safeFilename}`;
                            const response = await fetch(downloadUrl, {
                              method: 'GET',
                              headers: {
                                Authorization: `Token ${token}`,
                              },
                              credentials: 'include',
                            });
                            if (!response.ok) throw new Error('Attachment download failed from backend');
                            const blob = await response.blob();
                            formData.append('attachments', blob, originalFileName);
                            attachmentSuccess++;
                          } catch (err) {
                            console.error('Failed to copy attachment:', err);
                          }
                        }));
                      }
                      // If there were attachments but all failed, record this form
                      if ((form.attachments && form.attachments.length > 0) && attachmentSuccess === 0) {
                        failedForms.push(form);
                      }
                      // Submit the form with (possibly partial) attachments
                      await axios.post('/api/expense-forms/', formData, {
                        headers: {
                          'X-CSRFToken': csrftoken,
                          'Authorization': `Token ${token}`,
                          'Content-Type': 'multipart/form-data'
                        }
                      });
                    }));
                    setCopyModalForTitle(null);
                    setCopyNewTitle('');
                    setCopyError(failedForms.length > 0 ? `Some forms were copied without attachments due to download errors. (${failedForms.length} forms affected)` : '');
                    setCopying(false);
                    navigate('/details', { state: { selectedTitleId: newTitleId } });
                  } catch (error) {
                    console.error('Copy error:', error);
                    setCopyError('Failed to copy expense. Please try again.');
                    setCopying(false);
                  }
                }}
                disabled={copying || !copyNewTitle.trim()}
              >
                {copying ? 'Copying...' : 'Copy Expense'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setCopyModalForTitle(null);
                  setCopyNewTitle('');
                  setCopyError('');
                }}
                disabled={copying}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Import Expenses from File</h3>
            {importError && <div className="error-message">{importError}</div>}
            <div className="form-group">
              <label>New Expense Title</label>
              <input
                type="text"
                value={importTitle}
                onChange={e => setImportTitle(e.target.value)}
                placeholder="Enter title for imported expenses"
              />
            </div>
            <div className="form-group">
              <label>Select File to Import</label>
              <input
                type="file"
                className="file-input"
                accept=".csv,.xlsx,.json,.xml"
                onChange={e => setImportFile(e.target.files[0])}
              />
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleImportFile}
                disabled={importing || !importTitle.trim() || !importFile}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportTitle('');
                  setImportFile(null);
                  setImportError('');
                }}
                disabled={importing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;