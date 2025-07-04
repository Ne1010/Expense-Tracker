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
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState([]);
  const [showStatusCallout, setShowStatusCallout] = useState(false);
  const [statusCalloutMessage, setStatusCalloutMessage] = useState('');
  const [showCommentsError, setShowCommentsError] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [commentPromptMessage, setCommentPromptMessage] = useState('');
  const [amountError, setAmountError] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [showStatusChangeCallout, setShowStatusChangeCallout] = useState(false);
  const [showStatusMessage, setShowStatusMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [pendingNewAttachments, setPendingNewAttachments] = useState({});
  const [pendingRemoveAttachments, setPendingRemoveAttachments] = useState({});
  const [showAttachmentDeleteModal, setShowAttachmentDeleteModal] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [expenseIdToDeleteAll, setExpenseIdToDeleteAll] = useState(null);
  const [showOneDriveErrorModal, setShowOneDriveErrorModal] = useState(false);
  const [oneDriveErrorMessage, setOneDriveErrorMessage] = useState('');
  const [showOneDriveSessionExpiredModal, setShowOneDriveSessionExpiredModal] = useState(false);
  const [oneDriveSessionExpiredMessage, setOneDriveSessionExpiredMessage] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportingFormat, setExportingFormat] = useState('');
  const [attachmentError, setAttachmentError] = useState({});

  useEffect(() => {
    const isUserAdmin = localStorage.getItem('username') === 'admin';
    setIsAdmin(isUserAdmin);
    localStorage.setItem('isAdmin', isUserAdmin);
    fetchData(selectedTitleId);
  }, [selectedTitleId]);

  // Automatically open add form if there are no expenses for the selected title
  useEffect(() => {
    if (
      selectedTitleId &&
      !isAdmin &&
      !loading &&
      expenses.filter(e => e.expense_title?.id === selectedTitleId).length === 0
    ) {
      setShowExpenseForm(true);
    }
    // Only run when expenses or selectedTitleId changes
    // eslint-disable-next-line
  }, [expenses, selectedTitleId, loading, isAdmin]);

  // Handle clicking outside export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

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
          'Authorization': `Token ${token}`
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
            comments: firstExpense.status === 'PENDING' ? '' : firstExpense.comments || ''
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
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to fetch data';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(errorMessage);
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

  const handleViewAttachment = (expense, attachmentNumber) => {
    const attachment = attachmentNumber === 1 ? expense.attachment1 : expense.attachment2;
    if (!attachment) {
      setError('Attachment URL is missing.');
      return;
    }

    try {
      // Use the attachment URL directly
      const url = attachment.trim();

      if (!/^https?:\/\//i.test(url)) {
        throw new Error('Invalid attachment URL format');
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening attachment:', error);
      setError('Failed to open attachment. Please contact admin.');
    }
  };

  // Add new function to get filename from URL
  const getAttachmentName = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return decodeURIComponent(filename);
    } catch (error) {
      console.error('Error parsing attachment URL:', error);
      return 'Unknown file';
    }
  };

  const username = localStorage.getItem('username');
  const showCopyButton = true;
  
  const handleTitleSelect = (titleId) => {
    setSelectedTitleId(titleId);
    setPendingEdits({});
    setExpandedExpenses([]);
    setIsAllExpanded(false);
    fetchData(titleId);
  };

  const getExpenseTitleStatus = (titleId) => {
    const titleExpense = expenses.find(e => e.expense_title?.id === titleId);
    return titleExpense ? titleExpense.status : 'PENDING';
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
    setExpandedExpenses([]);
    setIsAllExpanded(false);
  };

  const handleTitleStatusUpdate = async (newStatus) => {
    if (!selectedTitleId) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('Authentication token not found. Please log in again.');
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
              comments: newStatus === 'PENDING' ? '' : titleStatus.comments
            },
            {
              headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': `Token ${token}`,
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
      setShowStatusChangeCallout(false);
    } catch (error) {
      console.error('Error updating expenses:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to update expenses. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense.id);
    setPendingEdits({
      [expense.id]: {
        amount: expense.amount,
        date: expense.date,
        master_group: expense.master_group,
        subgroup: expense.subgroup,
        currency: expense.currency,
        status: 'PENDING',
        comments: ''
      }
    });
    setPendingNewAttachments((prev) => ({ ...prev, [expense.id]: [] }));
    setPendingRemoveAttachments((prev) => ({ ...prev, [expense.id]: [] }));
    setAttachmentError(prev => ({ ...prev, [expense.id]: '' }));
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
    setAttachmentError({});
  };

  const handleRevokeApproval = async () => {
    if (!selectedTitleId) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Find the first expense form for this title
      const expenseForm = expenses.find(expense => 
        expense.expense_title?.id === selectedTitleId
      );
      
      if (!expenseForm) {
        setError('No expense form found to revoke.');
        return;
      }

      const response = await axios.post(
        `/api/expense-forms/${expenseForm.id}/revoke_approval/`,
        {},
        {
          headers: {
            'X-CSRFToken': csrftoken,
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      // Update state with backend response
      setExpenses(prev => 
        prev.map(expense => {
          if (expense.expense_title?.id === selectedTitleId) {
            return { ...expense, status: 'PENDING', comments: '' };
          }
          return expense;
        })
      );

      // Update title status
      setTitleStatus(prev => ({
        ...prev,
        status: 'PENDING',
        comments: ''
      }));

      setError('');
    } catch (error) {
      console.error('Error revoking approval:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to revoke approval. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(errorMessage);
      }
    }
  };

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

  const handleSaveEdit = async (expenseId) => {
    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    try {
      const formData = new FormData();
      const edits = pendingEdits[expenseId];
      // Validate amount before saving
      if (edits.amount === '' || isNaN(edits.amount) || Number(edits.amount) <= 0) {
        setAmountError('Amount must be greater than 0');
        return;
      }
      if (!validateAmount(edits.amount)) {
        return;
      }
      if (edits.amount) {
        formData.append('amount', edits.amount.toString());
      }
      // Add other fields (excluding expense_title_id for PATCH requests)
      Object.keys(edits).forEach(key => {
        if (key !== 'amount' && key !== 'attachment' && key !== 'expense_title_id') {
          formData.append(key, edits[key]);
        }
      });
      // Set status to PENDING
      formData.append('status', 'PENDING');
      formData.append('comments', '');
      // Handle new attachments
      (pendingNewAttachments[expenseId] || []).forEach(file => {
        formData.append('attachments', file);
      });
      // Handle removed attachments (send IDs to backend)
      (pendingRemoveAttachments[expenseId] || []).forEach(id => {
        formData.append('remove_attachments', id);
      });
      // PATCH request
      const response = await axios.patch(
        `/api/expense-forms/${expenseId}/`,
        formData,
        {
          headers: {
            'X-CSRFToken': csrftoken,
            'Authorization': `Token ${token}`,
            'Content-Type': 'multipart/form-data'
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
      setAmountError('');
      setPendingNewAttachments(prev => ({ ...prev, [expenseId]: [] }));
      setPendingRemoveAttachments(prev => ({ ...prev, [expenseId]: [] }));
      setAttachmentError(prev => ({ ...prev, [expenseId]: '' }));
      // Update title status to PENDING
      setTitleStatus(prev => ({
        ...prev,
        status: 'PENDING',
        comments: ''
      }));
    } catch (error) {
      console.error('Error updating expense:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.amount?.[0] || error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to update expense. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleAddForm = () => {
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    fetchData(selectedTitleId);
    setExpandedExpenses([]);
    setIsAllExpanded(false);
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

  const toggleAllExpenses = () => {
    if (isAllExpanded) {
      setExpandedExpenses([]);
    } else {
      const allExpenseIds = filteredExpenses.map(expense => expense.id);
      setExpandedExpenses(allExpenseIds);
    }
    setIsAllExpanded(!isAllExpanded);
  };

  const handleStatusButtonClick = async (newStatus) => {
    const currentStatus = titleStatus.status;

    // Clear any previous messages
    setShowStatusMessage(false);
    setStatusMessage('');

    // Handle Double Approve/Reject case from the screenshot
    if (currentStatus === newStatus) {
      setStatusMessage(`This expense is already ${newStatus.toLowerCase()}.`);
      setShowStatusMessage(true);
      return;
    }

    // For all other transitions (e.g., Pending -> Approved, Approved -> Rejected),
    // the screenshot requires comments.
    setPendingStatusChange(newStatus);
    setTitleStatus(prev => ({ ...prev, comments: '' })); // Clear previous comments
    setShowStatusChangeCallout(true);
    setStatusCalloutMessage(`Add comments to ${newStatus.toLowerCase()}`);
  };

  const cancelStatusChange = () => {
    setPendingStatusChange(null);
    setTitleStatus(prev => ({ ...prev, comments: '' }));
    setShowStatusChangeCallout(false);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;

    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    try {
      // First delete all expense forms under this title
      const formsToDelete = expenses.filter(expense => 
        expense.expense_title?.id === expenseToDelete
      );

      await Promise.all(
        formsToDelete.map(form => 
          axios.delete(`/api/expense-forms/${form.id}/`, {
            headers: {
              'X-CSRFToken': csrftoken,
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          })
        )
      );

      // Then delete the expense title
      await axios.delete(`/api/expense-titles/${expenseToDelete}/`, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update state
      setExpenses(prevExpenses => 
        prevExpenses.filter(expense => expense.expense_title?.id !== expenseToDelete)
      );
      setExpenseTitles(prevTitles => 
        prevTitles.filter(title => title.id !== expenseToDelete)
      );
      setSelectedTitleId(null);
      setError('');
    } catch (error) {
      console.error('Error deleting expense:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to delete expense. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setShowDeleteConfirmation(false);
      setExpenseToDelete(null);
    }
  };

  const handleAddNewAttachments = (e, expenseId) => {
    const files = Array.from(e.target.files);
    let duplicateFound = false;
    const normalize = name => name?.trim().toLowerCase();

    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) return;

    // Combine all known attachment names for this expense
    const existingNames = new Set([
      ...(expense.attachments || []).map(att => normalize(getAttachmentName(att.url))),
      ...(pendingNewAttachments[expenseId] || []).map(f => normalize(f.name))
    ]);

    const newFiles = [];
    for (const file of files) {
        const fileName = normalize(file.name);
        if (existingNames.has(fileName)) {
            duplicateFound = true;
        } else {
            newFiles.push(file);
            existingNames.add(fileName); // Check for duplicates within the same selection
        }
    }

    if (duplicateFound) {
        setAttachmentError(prev => ({
            ...prev,
            [expenseId]: '❌ Duplicate attachment detected. Please do not add the same file again.'
        }));
        e.target.value = null; // Reset file input
    } else {
        setAttachmentError(prev => ({ ...prev, [expenseId]: '' }));
        setPendingNewAttachments(prev => ({
            ...prev,
            [expenseId]: [...(prev[expenseId] || []), ...newFiles]
        }));
    }
  };

  const handleRemoveNewAttachment = (expenseId, index) => {
    setPendingNewAttachments(prev => ({
      ...prev,
      [expenseId]: prev[expenseId].filter((_, i) => i !== index)
    }));
  };

  const handleRequestRemoveExistingAttachment = (expenseId, attachment) => {
    setAttachmentToDelete({ expenseId, attachment });
    setShowAttachmentDeleteModal(true);
  };

  const handleConfirmRemoveExistingAttachment = async () => {
    if (!attachmentToDelete) return;
    const { expenseId, attachment } = attachmentToDelete;
    
    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    
    try {
      // Call the backend API to hard delete the attachment
      await axios.delete(
        `/api/expense-forms/${expenseId}/delete_attachment/`,
        {
          data: { attachment_id: attachment.id },
          headers: {
            'X-CSRFToken': csrftoken,
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update the expenses state to reflect the deletion
      setExpenses(prev => prev.map(exp =>
        exp.id === expenseId
          ? { ...exp, attachments: exp.attachments.filter(att => att.id !== attachment.id) }
          : exp
      ));
      
      setShowAttachmentDeleteModal(false);
      setAttachmentToDelete(null);
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
      setShowAttachmentDeleteModal(false);
      setAttachmentToDelete(null);
    }
  };

  const handleCancelRemoveExistingAttachment = () => {
    setShowAttachmentDeleteModal(false);
    setAttachmentToDelete(null);
  };

  // Function to delete all attachments for an expense
  const handleDeleteAllAttachments = async () => {
    if (!expenseIdToDeleteAll) return;
    const expense = expenses.find(e => e.id === expenseIdToDeleteAll);
    if (!expense || !expense.attachments || expense.attachments.length === 0) {
      setShowDeleteAllModal(false);
      setExpenseIdToDeleteAll(null);
      return;
    }
    const csrftoken = getCookie('csrftoken');
    const token = localStorage.getItem('token');
    try {
      // Delete each attachment
      await Promise.all(
        expense.attachments.map(att =>
          axios.delete(
            `/api/expense-forms/${expenseIdToDeleteAll}/delete_attachment/`,
            {
              data: { attachment_id: att.id },
              headers: {
                'X-CSRFToken': csrftoken,
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
              }
            }
          )
        )
      );
      // Update UI
      setExpenses(prev => prev.map(exp =>
        exp.id === expenseIdToDeleteAll
          ? { ...exp, attachments: [] }
          : exp
      ));
      setShowDeleteAllModal(false);
      setExpenseIdToDeleteAll(null);
      setError('');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to delete all attachments. Please try again.';
      
      // Check if it's a OneDrive authentication error
      if (isOneDriveAuthError(errorMessage)) {
        handleOneDriveAuthError(errorMessage);
      } else {
        setError(errorMessage);
      }
      setShowDeleteAllModal(false);
      setExpenseIdToDeleteAll(null);
    }
  };

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

  const handleOneDriveSessionExpired = (errorMessage) => {
    setOneDriveSessionExpiredMessage(errorMessage);
    setShowOneDriveSessionExpiredModal(true);
  };

  // Export functions
  const exportToCSV = (expenses, title) => {
    const headers = ['Master Group', 'Subgroup', 'Currency', 'Amount', 'Date', 'Status', 'Comments'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(expense => [
        MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group,
        SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1] || expense.subgroup,
        expense.currency,
        expense.amount,
        expense.date,
        STATUS_OPTIONS.find(([value]) => value === expense.status)?.[1] || expense.status,
        expense.comments || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_expenses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXML = (expenses, title) => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<expenses title="${title}">
${expenses.map(expense => `  <expense>
    <master_group>${MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group}</master_group>
    <subgroup>${SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1] || expense.subgroup}</subgroup>
    <currency>${expense.currency}</currency>
    <amount>${expense.amount}</amount>
    <date>${expense.date}</date>
    <status>${STATUS_OPTIONS.find(([value]) => value === expense.status)?.[1] || expense.status}</status>
    <comments>${expense.comments || ''}</comments>
  </expense>`).join('\n')}
</expenses>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_expenses.xml`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (expenses, title) => {
    const jsonData = {
      title: title,
      exportDate: new Date().toISOString(),
      expenses: expenses.map(expense => ({
        master_group: MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group,
        subgroup: SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1] || expense.subgroup,
        currency: expense.currency,
        amount: expense.amount,
        date: expense.date,
        status: STATUS_OPTIONS.find(([value]) => value === expense.status)?.[1] || expense.status,
        comments: expense.comments || ''
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_expenses.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXLSX = async (expenses, title) => {
    try {
      // Dynamic import for XLSX library
      const XLSX = await import('xlsx');
      
      const data = expenses.map(expense => ({
        'Master Group': MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group,
        'Subgroup': SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1] || expense.subgroup,
        'Currency': expense.currency,
        'Amount': expense.amount,
        'Date': expense.date,
        'Status': STATUS_OPTIONS.find(([value]) => value === expense.status)?.[1] || expense.status,
        'Comments': expense.comments || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
      
      XLSX.writeFile(wb, `${title}_expenses.xlsx`);
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      setError('Failed to export to XLSX. Please try another format.');
    }
  };

  const handleExport = async (format) => {
    if (!selectedTitleId) return;
    
    const titleExpenses = expenses.filter(expense => 
      expense.expense_title?.id === selectedTitleId
    );
    
    if (titleExpenses.length === 0) {
      setError('No expenses found to export.');
      return;
    }

    const title = expenseTitles.find(t => t.id === selectedTitleId)?.title || 'Unknown';
    setExportingFormat(format);
    setShowExportDropdown(false);

    try {
      switch (format) {
        case 'csv':
          exportToCSV(titleExpenses, title);
          break;
        case 'xml':
          exportToXML(titleExpenses, title);
          break;
        case 'json':
          exportToJSON(titleExpenses, title);
          break;
        case 'xlsx':
          await exportToXLSX(titleExpenses, title);
          break;
        default:
          setError('Unsupported export format.');
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setExportingFormat('');
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
                {(titleStatus.comments && titleStatus.status !== 'PENDING' && titleStatus.status !== 'SEND_FOR_APPROVAL') && (
                  <div className="title-comments">
                    {titleStatus.comments}
                  </div>
                )}
              </div>
            </div>

            <div className="expense-forms-container">
              <div className="card">
                {isAdmin && (
                  <div className="title-status-section">
                    <div className="form-row">
                      <div className="form-group">
                        <div>Status</div>
                        <div className="status-buttons">
                          {titleStatus.status === 'PENDING' && (
                            <>
                              <button
                                className={`btn-accept ${isUpdatingStatus ? 'disabled' : ''}`}
                                onClick={() => handleStatusButtonClick('APPROVED')}
                                disabled={isUpdatingStatus}
                              >
                                {isUpdatingStatus ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                className={`btn-reject ${isUpdatingStatus ? 'disabled' : ''}`}
                                onClick={() => handleStatusButtonClick('REJECTED')}
                                disabled={isUpdatingStatus}
                              >
                                {isUpdatingStatus ? 'Processing...' : 'Reject'}
                              </button>
                            </>
                          )}
                          <div className="export-container">
                            <button
                              className={`btn-export ${showExportDropdown ? 'active' : ''}`}
                              onClick={() => setShowExportDropdown(!showExportDropdown)}
                              disabled={isUpdatingStatus}
                            >
                              {exportingFormat ? `Exporting ${exportingFormat.toUpperCase()}...` : 'Export'}
                              <span className="dropdown-arrow">▼</span>
                            </button>
                            {showExportDropdown && (
                              <div className="export-dropdown">
                                <button
                                  className="export-option"
                                  onClick={() => handleExport('csv')}
                                  disabled={exportingFormat}
                                >
                                  📄 Download as CSV
                                </button>
                                <button
                                  className="export-option"
                                  onClick={() => handleExport('xml')}
                                  disabled={exportingFormat}
                                >
                                  📄 Download as XML
                                </button>
                                <button
                                  className="export-option"
                                  onClick={() => handleExport('json')}
                                  disabled={exportingFormat}
                                >
                                  📄 Download as JSON
                                </button>
                                <button
                                  className="export-option"
                                  onClick={() => handleExport('xlsx')}
                                  disabled={exportingFormat}
                                >
                                  📄 Download as XLSX
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {showStatusChangeCallout && (
                        <div className="form-group">
                          {statusCalloutMessage && (
                            <div className="status-callout-above-comments">
                              {statusCalloutMessage}
                            </div>
                          )}
                          <div className="status-comment-popup">
                            <h4>Enter comments to {pendingStatusChange?.toLowerCase()}:</h4>
                            <textarea
                              className="popup-comment-box"
                              placeholder="Enter your comments"
                              value={titleStatus.comments}
                              onChange={(e) =>
                                setTitleStatus(prev => ({ ...prev, comments: e.target.value }))
                              }
                            />
                            <div className="form-actions">
                              <button
                                className="btn btn-primary"
                                onClick={() => handleTitleStatusUpdate(pendingStatusChange)}
                                disabled={!titleStatus.comments.trim() || isUpdatingStatus}
                              >
                                Confirm {pendingStatusChange?.toLowerCase()}
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={cancelStatusChange}
                                disabled={isUpdatingStatus}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Only show add form button if status is not APPROVED */}
                {!isAdmin && (expenses.find(e => e.expense_title?.id === selectedTitleId)?.status !== 'APPROVED') && (
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
                      expenses={expenses}
                      existingAttachments={[]}
                    />
                  </div>
                )}

                {/* Add expand/collapse all button */}
                <div className="expense-actions-row">
                  <button
                    onClick={toggleAllExpenses}
                    className="btn expand-all-button"
                  >
                    {isAllExpanded ? 'Collapse All' : 'Expand All'}
                  </button>
                  {/* Only show delete button for non-admin and if status is PENDING or REJECTED */}
                  {!isAdmin && (titleStatus.status === 'PENDING' || titleStatus.status === 'REJECTED') && (
                    <button
                      className="btn btn-delete"
                      onClick={() => {
                        setShowDeleteConfirmation(true);
                        setExpenseToDelete(selectedTitleId);
                      }}
                    >
                      Delete Expense
                    </button>
                  )}
                </div>

                {filteredExpenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className={`expense-item ${expandedExpenses.includes(expense.id) ? 'expanded' : 'collapsed'}`}
                  >
                    {/* Summary for collapsed state */}
                    {!expandedExpenses.includes(expense.id) && (
                      <div
                        className="expense-summary"
                        onClick={() => toggleExpandExpense(expense.id)}
                      >
                        <div className="summary-row">
                          <div className="category-group">
                            <span className="master-group">
                              {MASTER_GROUPS.find(([value]) => value === expense.master_group)?.[1] || expense.master_group}
                            </span>
                            <span className="subgroup">
                              {SUBGROUPS[expense.master_group]?.find(([value]) => value === expense.subgroup)?.[1] || expense.subgroup}
                            </span>
                          </div>
                          <span className="amount">
                            {expense.amount} {expense.currency}
                          </span>
                          <span className="date">{expense.date}</span>
                          <span className="summary-arrow">▼</span> {/* Down arrow for collapsed state */}
                        </div>
                        {expense.status === 'SEND_FOR_APPROVAL' && !isAdmin && (
                          <div className="status-message" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            ⚠️ Sent for approval - Click to expand and revoke for changes
                          </div>
                        )}
                      </div>
                    )}

                    <div className="expense-details">
                      {/* Collapse trigger for expanded state */}
                      {expandedExpenses.includes(expense.id) && (
                        <div
                          className="expense-collapse-trigger"
                          onClick={() => toggleExpandExpense(expense.id)}
                        >
                          <span className="collapse-arrow">▲</span>
                        </div>
                      )}
                      <table className="expense-details-table">
                        <thead>
                          <tr>
                            <th>Master Group</th>
                            <th>Subgroup</th>
                            <th>CURR</th>
                            <th>Amount</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
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
                            </td>
                            <td>
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
                            </td>
                            <td>
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
                            </td>
                            <td>
                              {editingExpense === expense.id ? (
                                <input
                                  type="text"
                                  value={pendingEdits[expense.id]?.amount || ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d.]/g, '');
                                    const parts = value.split('.');
                                    const sanitizedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                                    
                                    setPendingEdits(prev => ({
                                      ...prev,
                                      [expense.id]: {
                                        ...prev[expense.id],
                                        amount: sanitizedValue
                                      }
                                    }));
                                    validateAmount(sanitizedValue);
                                  }}
                                  placeholder="Enter amount (max 2 decimal places)"
                                />
                              ) : (
                                <div>{expense.amount}</div>
                              )}
                              {editingExpense === expense.id && amountError && (
                                <div className="amount-error-callout">
                                  {amountError}
                                </div>
                              )}
                            </td>
                            <td>
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
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {editingExpense === expense.id && (
                        <div className="attachment-group">
                          <div className="attachment-header">
                            <label>Attachments</label>
                            {expense.attachments && expense.attachments.length > 0 && (
                              <button
                                className="btn btn-delete-all"
                                type="button"
                                onClick={() => {
                                  setShowDeleteAllModal(true);
                                  setExpenseIdToDeleteAll(expense.id);
                                }}
                                style={{ marginBottom: '1rem', float: 'right' }}
                              >
                                Delete All
                              </button>
                            )}
                            {expense.attachments && expense.attachments.length > 0 && (
                              expense.attachments.map((att, idx) => (
                                <div className="current-attachment" key={att.id || idx}>
                                  <span>{getAttachmentName(att.url)}</span>
                                  <button
                                    onClick={() => window.open(att.url, '_blank', 'noopener,noreferrer')}
                                    className="view-btn"
                                  >
                                    View
                                  </button>
                                  <button
                                    className="btn btn-delete"
                                    onClick={() => handleRequestRemoveExistingAttachment(expense.id, att)}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                          {(pendingNewAttachments[expense.id]||[]).length > 0 && (
                            <div className="new-attachments">
                              {pendingNewAttachments[expense.id].map((file, index) => (
                                <div key={index} className="attachment-item">
                                  <span>{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNewAttachment(expense.id, index)}
                                    className="btn btn-delete"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="new-attachment">
                            <input
                              type="file"
                              multiple
                              onChange={e => handleAddNewAttachments(e, expense.id)}
                              className={`file-input ${attachmentError[expense.id] ? 'input-error-shake' : ''}`}
                            />
                             {attachmentError[expense.id] && (
                                <div className="error-message">{attachmentError[expense.id]}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {!editingExpense && (expense.attachments && expense.attachments.length > 0) && (
                        <div className="attachment-group">
                          <div className="attachment-header">
                            <label>Attachments</label>
                            {expense.attachments.map((att, idx) => (
                              <div className="current-attachment" key={att.id || idx}>
                                <span>{getAttachmentName(att.url)}</span>
                                <button
                                  onClick={() => window.open(att.url, '_blank', 'noopener,noreferrer')}
                                  className="view-btn"
                                >
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
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
                            <>
                              {expense.status === 'SEND_FOR_APPROVAL' && (
                                <>
                                  <div className="status-message">
                                    ⚠️ This expense is sent for approval. Click "Revoke" to make changes.
                                  </div>
                                  <button
                                    className="btn btn-revoke"
                                    onClick={handleRevokeApproval}
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                              {expense.status !== 'APPROVED' && expense.status !== 'SEND_FOR_APPROVAL' && (
                                <button
                                  className="btn"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  Edit Form
                                </button>
                              )}
                            </>
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
            {expenseTitles
              .sort((a, b) => {
                if (!isAdmin) return 0; // No sorting for non-admin

                const statusA = getExpenseTitleStatus(a.id);
                const statusB = getExpenseTitleStatus(b.id);

                const order = { 'PENDING': 1, 'REJECTED': 2, 'APPROVED': 3 };

                if (order[statusA] < order[statusB]) {
                  return -1;
                } else if (order[statusA] > order[statusB]) {
                  return 1;
                } else {
                  // If statuses are the same, sort by ID descending (most recent first)
                  return b.id - a.id;
                }
              })
              .map((title) => (
              <div key={title.id} className="expense-title-section">
                <div className="expense-title-header" onClick={() => handleTitleSelect(title.id)}>
                  <h2>{title.title}</h2>
                  <div className="title-status-display">
                    <div className="status-badge" data-status={getExpenseTitleStatus(title.id)}>
                      {STATUS_OPTIONS.find(([value]) => value === getExpenseTitleStatus(title.id))?.[1]}
                    </div>
                    {(expenses.find(e => e.expense_title?.id === title.id)?.comments && getExpenseTitleStatus(title.id) !== 'PENDING' && getExpenseTitleStatus(title.id) !== 'SEND_FOR_APPROVAL') && (
                      <div className="title-comments">
                        {expenses.find(e => e.expense_title?.id === title.id)?.comments}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {showDeleteConfirmation && (
        <div className="delete-confirmation-callout">
          <div className="callout-content">
            <p>Are you sure you want to delete this entire expense and all its forms? This action cannot be undone.</p>
            <div className="callout-actions">
              <button onClick={confirmDeleteExpense} className="btn btn-delete">
                Yes, Delete
              </button>
              <button onClick={() => setShowDeleteConfirmation(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusMessage && (
        <div className="status-message-callout">
          <div className="callout-content">
            <p>{statusMessage}</p>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowStatusMessage(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showAttachmentDeleteModal && (
        <div className="delete-confirmation-callout">
          <div className="callout-content">
            <p>Are you sure you want to delete this attachment? This action cannot be undone.</p>
            <div className="callout-actions">
              <button onClick={handleConfirmRemoveExistingAttachment} className="btn btn-delete">
                Yes, Delete
              </button>
              <button onClick={handleCancelRemoveExistingAttachment} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Are you sure to delete all expense attachments?</p>
            <div className="callout-actions">
              <button className="btn btn-delete" onClick={handleDeleteAllAttachments}>Yes, Delete All</button>
              <button className="btn btn-secondary" onClick={() => setShowDeleteAllModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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

      {showOneDriveSessionExpiredModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            color: '#222',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            textAlign: 'center',
            maxWidth: '90vw',
            minWidth: '320px',
          }}>
            <h2 style={{color: '#111', marginBottom: '1.5rem'}}>🔒 OneDrive Session Expired</h2>
            <p style={{marginBottom: '2rem'}}>{oneDriveSessionExpiredMessage || 'Your OneDrive session has expired. Please reconnect to continue using attachments.'}</p>
            <button
              className="btn btn-primary"
              style={{minWidth: '180px', fontWeight: 600, fontSize: '1.1rem'}}
              onClick={() => window.location.reload()}
            >
              Reconnect to OneDrive
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailsScreen;