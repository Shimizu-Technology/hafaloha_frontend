// src/ordering/components/admin/StaffManagement.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/apiClient';
import toastUtils from '../../../shared/utils/toastUtils';
import { StaffFilterProvider } from './StaffFilterContext';
import { StaffFilterBar } from './StaffFilterBar';
import { StaffReports } from './StaffReports';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';

interface StaffMember {
  id: number;
  name: string;
  position: string;
  user_id: number | null;
  house_account_balance: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Activity {
  id: string;
  type: 'staff_created' | 'staff_updated' | 'transaction';
  description: string;
  timestamp: string;
  staff_name: string;
  icon: string;
  color: 'green' | 'blue' | 'yellow';
}

function StaffManagementContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'house-accounts' | 'reports'>('house-accounts');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffMember | null>(null);
  
  // House account quick filter
  const [houseAccountFilter, setHouseAccountFilter] = useState<'all' | 'outstanding' | 'credit'>('all');
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    sortBy: 'name' as 'name' | 'balance' | 'recent_activity',
    sortOrder: 'asc' as 'asc' | 'desc',
    activityFilter: 'all' as 'all' | 'active' | 'inactive',
    balanceRange: 'all' as 'all' | 'under_10' | '10_to_50' | 'over_50'
  });
  
  // Bulk selection state
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  
  // Bulk payment modal state
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    amount: '',
    type: 'payment' as 'payment' | 'charge',
    description: '',
    reference: '',
    useFullBalance: false
  });
  const [processingBulkPayment, setProcessingBulkPayment] = useState(false);
  
  // Dashboard state
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    topDebtors: [] as StaffMember[],
    recentPayments: [] as any[],
    creditBalances: [] as StaffMember[]
  });
  
  // Fetch staff members and users
  useEffect(() => {
    fetchStaffMembers();
    fetchUsers();
  }, []);

  // Fetch dashboard data when dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab, staffMembers]);

  // Fetch recent activities for dashboard
  const fetchRecentActivities = async () => {
    setLoadingActivities(true);
    try {
      // Get recent transactions across all staff members
      const activities: Activity[] = [];
      
      // Add recent staff member updates (last 7 days)
      const recentStaff = staffMembers
        .filter(staff => {
          const updatedAt = new Date(staff.updated_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return updatedAt > weekAgo;
        })
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);

      recentStaff.forEach(staff => {
        const createdAt = new Date(staff.created_at);
        const updatedAt = new Date(staff.updated_at);
        const isNewStaff = Math.abs(createdAt.getTime() - updatedAt.getTime()) < 60000; // Within 1 minute
        
        activities.push({
          id: `staff-${staff.id}`,
          type: isNewStaff ? 'staff_created' : 'staff_updated',
          description: isNewStaff ? `New staff member added: ${staff.name}` : `Staff member updated: ${staff.name}`,
          timestamp: staff.updated_at,
          staff_name: staff.name,
          icon: isNewStaff ? '👤' : '✏️',
          color: isNewStaff ? 'green' : 'blue'
        });
      });

      // Try to get recent transactions
      try {
        const response = await apiClient.get('/staff_members/recent_transactions?limit=10');
        const transactions = Array.isArray(response.data) ? response.data : response.data?.transactions || [];
        
        transactions.forEach((txn: any) => {
          activities.push({
            id: `txn-${txn.id}`,
            type: 'transaction',
            description: `${txn.transaction_type === 'payment' ? 'Payment received' : 'Charge added'}: $${Math.abs(txn.amount).toFixed(2)}`,
            timestamp: txn.created_at,
            staff_name: txn.staff_member_name || 'Unknown Staff',
            icon: txn.transaction_type === 'payment' ? '💰' : '📝',
            color: txn.transaction_type === 'payment' ? 'green' : 'yellow'
          });
        });
      } catch (txnError) {
        console.log('Recent transactions not available:', txnError);
      }

      // Sort all activities by timestamp and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Calculate dashboard statistics
  const fetchDashboardData = async () => {
    try {
      // Top debtors (highest positive balances)
      const topDebtors = staffMembers
        .filter(staff => staff.house_account_balance > 0)
        .sort((a, b) => b.house_account_balance - a.house_account_balance)
        .slice(0, 3);

      // Credit balances (negative balances)
      const creditBalances = staffMembers
        .filter(staff => staff.house_account_balance < 0)
        .sort((a, b) => a.house_account_balance - b.house_account_balance)
        .slice(0, 3);

      setDashboardStats({
        topDebtors,
        recentPayments: [], // We'll populate this from activities
        creditBalances
      });

      // Fetch recent activities
      await fetchRecentActivities();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };
  
  // Filter staff members based on house account balance
  const getFilteredStaffMembers = () => {
    if (!Array.isArray(staffMembers)) return [];
    
    let filtered = [...staffMembers];
    
    // Apply house account balance filter
    switch (houseAccountFilter) {
      case 'outstanding':
        filtered = filtered.filter(staff => staff.house_account_balance > 0);
        break;
      case 'credit':
        filtered = filtered.filter(staff => staff.house_account_balance < 0);
        break;
      case 'all':
      default:
        break;
    }
    
    // Apply activity filter
    switch (advancedFilters.activityFilter) {
      case 'active':
        filtered = filtered.filter(staff => staff.active);
        break;
      case 'inactive':
        filtered = filtered.filter(staff => !staff.active);
        break;
      case 'all':
      default:
        break;
    }
    
    // Apply balance range filter
    switch (advancedFilters.balanceRange) {
      case 'under_10':
        filtered = filtered.filter(staff => Math.abs(staff.house_account_balance) < 10);
        break;
      case '10_to_50':
        filtered = filtered.filter(staff => Math.abs(staff.house_account_balance) >= 10 && Math.abs(staff.house_account_balance) <= 50);
        break;
      case 'over_50':
        filtered = filtered.filter(staff => Math.abs(staff.house_account_balance) > 50);
        break;
      case 'all':
      default:
        break;
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (advancedFilters.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'balance':
          compareValue = Math.abs(a.house_account_balance) - Math.abs(b.house_account_balance);
          break;
        case 'recent_activity':
          // Sort by recent activity (using updated_at as proxy)
          compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        default:
          compareValue = a.name.localeCompare(b.name);
      }
      
      return advancedFilters.sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return filtered;
  };
  
  // Bulk selection functions
  const handleStaffSelection = (staffId: number, checked: boolean) => {
    setSelectedStaffIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(staffId);
      } else {
        newSet.delete(staffId);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredStaff = getFilteredStaffMembers();
      setSelectedStaffIds(new Set(filteredStaff.map(staff => staff.id)));
    } else {
      setSelectedStaffIds(new Set());
    }
  };
  
  const clearSelection = () => {
    setSelectedStaffIds(new Set());
  };
  
  // Advanced filter functions
  const updateAdvancedFilter = (key: keyof typeof advancedFilters, value: any) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const clearAllFilters = () => {
    setHouseAccountFilter('all');
    setAdvancedFilters({
      sortBy: 'name',
      sortOrder: 'asc',
      activityFilter: 'all',
      balanceRange: 'all'
    });
  };
  
  // Export functions
  const exportStaffData = () => {
    const filteredStaff = getFilteredStaffMembers();
    const csvData = [
      ['Name', 'Position', 'House Account Balance', 'Status'],
      ...filteredStaff.map(staff => [
        staff.name,
        staff.position,
        staff.house_account_balance.toFixed(2),
        staff.active ? 'Active' : 'Inactive'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `staff-balances-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toastUtils.success('Staff data exported successfully');
  };
  
  // Date formatting helper
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    
    // Format date with ordinal suffix
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${month} ${day}${getOrdinalSuffix(day)}, ${year} at ${time}`;
  };
  
  // Bulk payment functions
  const openBulkPaymentModal = () => {
    setShowBulkPaymentModal(true);
    // Reset form when opening
    setBulkPaymentForm({
      amount: '',
      type: 'payment',
      description: '',
      reference: '',
      useFullBalance: false
    });
  };
  
  const closeBulkPaymentModal = () => {
    setShowBulkPaymentModal(false);
    setBulkPaymentForm({
      amount: '',
      type: 'payment',
      description: '',
      reference: '',
      useFullBalance: false
    });
  };
  
  const updateBulkPaymentForm = (field: string, value: string | boolean) => {
    setBulkPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const processBulkPayment = async () => {
    if (!bulkPaymentForm.amount && !bulkPaymentForm.useFullBalance) {
      toastUtils.error('Please enter an amount or select "Pay Full Balance"');
      return;
    }
    
    const selectedStaff = staffMembers.filter(staff => selectedStaffIds.has(staff.id));
    if (selectedStaff.length === 0) {
      toastUtils.error('No staff members selected');
      return;
    }
    
    setProcessingBulkPayment(true);
    
    try {
      const promises = selectedStaff.map(async (staff) => {
        const amount = bulkPaymentForm.useFullBalance 
          ? staff.house_account_balance 
          : parseFloat(bulkPaymentForm.amount);
        
        const payload = {
          transaction: {
            amount: bulkPaymentForm.type === 'payment' ? -Math.abs(amount) : Math.abs(amount),
            transaction_type: bulkPaymentForm.type,
            description: bulkPaymentForm.description || 
                        (bulkPaymentForm.type === 'payment' ? 'Bulk payment received' : 'Bulk charge added'),
            reference: bulkPaymentForm.reference || ''
          }
        };
        
        return apiClient.post(`/staff_members/${staff.id}/transactions?restaurant_id=1`, payload);
      });
      
      await Promise.all(promises);
      
      toastUtils.success(`Successfully processed ${bulkPaymentForm.type} for ${selectedStaff.length} staff member${selectedStaff.length !== 1 ? 's' : ''}`);
      
      // Refresh staff data and clear selection
      await fetchStaffMembers();
      clearSelection();
      closeBulkPaymentModal();
      
    } catch (error: any) {
      console.error('Error processing bulk payment:', error);
      toastUtils.error('Some payments failed to process. Please check individual staff members.');
    } finally {
      setProcessingBulkPayment(false);
    }
  };
  
  const processBulkPayrollDeduction = async () => {
    const selectedStaff = staffMembers.filter(staff => 
      selectedStaffIds.has(staff.id) && staff.house_account_balance > 0
    );
    
    if (selectedStaff.length === 0) {
      toastUtils.error('No staff members with outstanding balances selected');
      return;
    }
    
    setProcessingBulkPayment(true);
    
    try {
      const currentDate = new Date().toLocaleDateString();
      const promises = selectedStaff.map(async (staff) => {
        const payload = {
          transaction: {
            amount: -staff.house_account_balance, // Full balance payment
            transaction_type: 'payment',
            description: 'Payroll deduction',
            reference: `Payroll deduction - ${currentDate}`
          }
        };
        
        return apiClient.post(`/staff_members/${staff.id}/transactions?restaurant_id=1`, payload);
      });
      
      await Promise.all(promises);
      
      toastUtils.success(`Payroll deduction processed for ${selectedStaff.length} staff member${selectedStaff.length !== 1 ? 's' : ''}`);
      
      // Refresh staff data and clear selection
      await fetchStaffMembers();
      clearSelection();
      
    } catch (error: any) {
      console.error('Error processing payroll deduction:', error);
      toastUtils.error('Some payroll deductions failed to process.');
    } finally {
      setProcessingBulkPayment(false);
    }
  };
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    user_id: '',
    active: true
  });

  // Enhanced house account state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [paymentForms, setPaymentForms] = useState<Record<number, {
    amount: string;
    type: 'payment' | 'charge';
    description: string;
    reference: string;
  }>>({});
  const [processingPayments, setProcessingPayments] = useState<Set<number>>(new Set());
  const [staffTransactions, setStaffTransactions] = useState<Record<number, any[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Set<number>>(new Set());

  const fetchStaffMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/staff_members');
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setStaffMembers(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object with staff_members inside
        if (Array.isArray(response.data.staff_members)) {
          setStaffMembers(response.data.staff_members);
        } else {
          // Log the response structure for debugging
          console.error('Unexpected response format:', response.data);
          setStaffMembers([]);
          setError('Unexpected API response format');
        }
      } else {
        console.error('Invalid response data:', response.data);
        setStaffMembers([]);
        setError('Invalid API response');
      }
    } catch (err: any) {
      console.error('Error fetching staff members:', err);
      setError(err.message || 'Failed to fetch staff members');
      toastUtils.error('Failed to fetch staff members');
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for the dropdown
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get users who aren't already assigned to staff members and aren't customers
      // Using exclude_customers=true as a custom parameter that can be implemented on the backend
      const response = await apiClient.get('/users?available_for_staff=true&exclude_role=customer');

      // Ensure response.data is an array or has a users property
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object with users inside
        if (Array.isArray(response.data.users)) {
          setUsers(response.data.users);
        } else {
          console.error('Unexpected users response format:', response.data);
          setUsers([]);
        }
      } else {
        console.error('Invalid users response data:', response.data);
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toastUtils.error('Failed to fetch available users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle transaction form input changes
  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      user_id: '',
      active: true
    });
    setEditingStaffMember(null);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        user_id: formData.user_id ? parseInt(formData.user_id) : null
      };

      if (editingStaffMember) {
        // Update existing staff member
        await apiClient.put(`/staff_members/${editingStaffMember.id}`, payload);
        toastUtils.success('Staff member updated successfully');
      } else {
        // Create new staff member
        await apiClient.post('/staff_members', payload);
        toastUtils.success('Staff member created successfully');
      }

      // Refresh staff members list
      fetchStaffMembers();
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Error saving staff member:', err);
      toastUtils.error(err.response?.data?.error || 'Failed to save staff member');
    }
  };

  // Edit staff member
  const handleEdit = async (staffMember: StaffMember) => {
    setFormData({
      name: staffMember.name,
      position: staffMember.position,
      user_id: staffMember.user_id?.toString() || '',
      active: staffMember.active
    });
    setEditingStaffMember(staffMember);
    setShowAddForm(true);

    // When editing, we need to fetch all available users plus the one already assigned to this staff member
    if (staffMember.user_id) {
      setLoadingUsers(true);
      try {
        // Get available users plus the specific user assigned to this staff member
        const response = await apiClient.get(`/users?available_for_staff=true&exclude_role=customer&include_user_id=${staffMember.user_id}`);
        if (response.data && response.data.users) {
          setUsers(response.data.users);
        } else if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (err) {
        console.error('Error fetching users for edit:', err);
        toastUtils.error('Failed to fetch users');
        // Fallback to just getting the specific user
        try {
          const userResponse = await apiClient.get(`/users/${staffMember.user_id}`);
          if (userResponse.data) {
            setUsers([userResponse.data]);
          }
        } catch (innerErr) {
          console.error('Error fetching specific user:', innerErr);
          setUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  // Toggle staff member active status
  const toggleActive = async (staffMember: StaffMember) => {
    try {
      await apiClient.put(`/staff_members/${staffMember.id}`, {
        active: !staffMember.active
      });
      toastUtils.success(`Staff member ${staffMember.active ? 'deactivated' : 'activated'} successfully`);
      fetchStaffMembers();
    } catch (err: any) {
      console.error('Error toggling staff member status:', err);
      toastUtils.error('Failed to update staff member status');
    }
  };

  // House Account Functions
  const toggleRowExpansion = (staffId: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(staffId)) {
      newExpanded.delete(staffId);
    } else {
      newExpanded.add(staffId);
      // Load transactions when expanding
      if (!staffTransactions[staffId]) {
        loadStaffTransactions(staffId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const loadStaffTransactions = async (staffId: number) => {
    setLoadingTransactions(prev => new Set([...prev, staffId]));
    try {
      const response = await apiClient.get(`/staff_members/${staffId}/transactions`);
      const transactions = Array.isArray(response.data) ? response.data : 
                          response.data?.transactions || [];
      setStaffTransactions(prev => ({ ...prev, [staffId]: transactions }));
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      toastUtils.error('Failed to load transaction history');
    } finally {
      setLoadingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffId);
        return newSet;
      });
    }
  };

  const initializePaymentForm = (staffId: number) => {
    if (!paymentForms[staffId]) {
      setPaymentForms(prev => ({
        ...prev,
        [staffId]: {
          amount: '',
          type: 'payment',
          description: '',
          reference: ''
        }
      }));
    }
  };

  const updatePaymentForm = (staffId: number, field: string, value: string) => {
    setPaymentForms(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  const setQuickAmount = (staffId: number, amount: number) => {
    updatePaymentForm(staffId, 'amount', amount.toFixed(2));
  };

  const submitPayment = async (staffId: number) => {
    // Ensure form is initialized before proceeding
    initializePaymentForm(staffId);
    
    const form = paymentForms[staffId];
    console.log('Current form state for staff', staffId, ':', JSON.stringify(form, null, 2));
    
    if (!form || !form.amount) {
      toastUtils.error('Please enter an amount');
      return;
    }

    // Additional validation to ensure transaction_type is set
    if (!form.type) {
      console.error('Form type is missing, defaulting to payment');
      updatePaymentForm(staffId, 'type', 'payment');
      // Re-get the form after update
      const updatedForm = { ...form, type: 'payment' };
      console.log('Updated form with default type:', JSON.stringify(updatedForm, null, 2));
    }

    setProcessingPayments(prev => new Set([...prev, staffId]));
    
    // Move transactionType to function scope so it's available in catch block
    const transactionType = form.type || 'payment'; // Fallback to payment
    
    try {
      const amount = parseFloat(form.amount);
      
      // Correct payload structure based on the backend requirements
      const payload = {
        transaction: {
          amount: transactionType === 'payment' ? -Math.abs(amount) : Math.abs(amount),
          transaction_type: transactionType,
          description: form.description || 
                      (transactionType === 'payment' ? 'Payment received' : 'Charge added'),
          reference: form.reference || ''
        }
      };

      console.log('Final form object used:', JSON.stringify(form, null, 2));
      console.log('Transaction type used:', transactionType);
      console.log('Submitting transaction payload:', JSON.stringify(payload, null, 2));
      console.log('API endpoint:', `/staff_members/${staffId}/transactions`);
      
      const response = await apiClient.post(`/staff_members/${staffId}/transactions`, payload);
      console.log('Transaction response:', response.data);
      
      toastUtils.success(`${transactionType === 'payment' ? 'Payment' : 'Charge'} recorded successfully`);
      
      // Reset form
      setPaymentForms(prev => ({
        ...prev,
        [staffId]: {
          amount: '',
          type: 'payment',
          description: '',
          reference: ''
        }
      }));

      // Refresh data
      fetchStaffMembers();
      if (expandedRows.has(staffId)) {
        loadStaffTransactions(staffId);
      }
    } catch (err: any) {
      console.error('Error processing payment:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      console.error('Error response headers:', err.response?.headers);
      
      // Try to extract more detailed error information
      const errorMessage = err.response?.data?.errors?.join(', ') || 
                           err.response?.data?.error || 
                           err.response?.data?.message ||
                           `Failed to record ${transactionType || 'transaction'}`;
      
      toastUtils.error(errorMessage);
    } finally {
      setProcessingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffId);
        return newSet;
      });
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Staff Management</h1>
        {activeTab === 'house-accounts' && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="px-3 sm:px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] transition-colors text-sm sm:text-base"
          >
            {showAddForm ? 'Cancel' : 'Add Staff Member'}
          </button>
        )}
      </div>

      {/* Mobile-Responsive Tab Navigation */}
      <div className="mb-6">
        {/* Mobile Tab Navigation (Dropdown) */}
        <div className="sm:hidden">
          <MobileSelect
            label="Select View:"
            options={[
              { value: 'dashboard', label: '📊 Dashboard' },
              { value: 'house-accounts', label: '💰 House Accounts' },
              { value: 'reports', label: '📈 House Account Reports' }
            ]}
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'dashboard' | 'house-accounts' | 'reports')}
          />
        </div>
        
        {/* Desktop Tab Navigation */}
        <div className="hidden sm:block">
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-4 font-medium flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>📊</span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('house-accounts')}
              className={`py-2 px-4 font-medium flex items-center space-x-2 ${
                activeTab === 'house-accounts'
                  ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>💰</span>
              <span>House Accounts</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-4 font-medium flex items-center space-x-2 ${
                activeTab === 'reports'
                  ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>📈</span>
              <span>House Account Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Enhanced Summary Cards */}
          <div className="bg-white rounded-md shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Staff Management Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-lg sm:text-xl">👥</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-xs sm:text-sm font-medium text-blue-800">Total Staff</h3>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{staffMembers.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-lg sm:text-xl">✅</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-xs sm:text-sm font-medium text-green-800">Active Staff</h3>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {staffMembers.filter(staff => staff.active).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-lg sm:text-xl">💸</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-xs sm:text-sm font-medium text-red-800">Outstanding Balance</h3>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      ${staffMembers.filter(s => s.house_account_balance > 0)
                        .reduce((total, staff) => total + staff.house_account_balance, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-lg sm:text-xl">💳</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-xs sm:text-sm font-medium text-purple-800">Credit Balances</h3>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      ${Math.abs(staffMembers.filter(s => s.house_account_balance < 0)
                        .reduce((total, staff) => total + staff.house_account_balance, 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Recent Activity Feed */}
            <div className="bg-white rounded-md shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-medium">Recent Activity</h3>
                <button
                  onClick={fetchRecentActivities}
                  className="text-sm text-[#c1902f] hover:text-[#a67b28] font-medium"
                >
                  Refresh
                </button>
              </div>
              
              {loadingActivities ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#c1902f]"></div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <span className="text-3xl sm:text-4xl">📋</span>
                  <p className="text-gray-500 mt-2 text-sm sm:text-base">No recent activity</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">Activity will appear here when staff members are added, updated, or make payments</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                        activity.color === 'green' ? 'bg-green-100' :
                        activity.color === 'blue' ? 'bg-blue-100' : 'bg-yellow-100'
                      }`}>
                        <span className="text-sm">{activity.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span className="font-medium">{activity.staff_name}</span>
                          <span className="mx-1">•</span>
                          <span>{formatDateTime(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Debtors */}
            <div className="bg-white rounded-md shadow-md p-6">
              <h3 className="text-lg font-medium mb-4">Highest Outstanding Balances</h3>
              {dashboardStats.topDebtors.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl">🎉</span>
                  <p className="text-gray-500 mt-2">No outstanding balances!</p>
                  <p className="text-sm text-gray-400">All staff accounts are current</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardStats.topDebtors.map((staff, index) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{staff.name}</p>
                          <p className="text-sm text-gray-500">{staff.position}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">${staff.house_account_balance.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">owed</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4">
                    <button
                      onClick={() => setActiveTab('house-accounts')}
                      className="w-full px-3 py-2 text-sm bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] transition-colors"
                    >
                      Manage House Accounts
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Credit Balances Section */}
          {dashboardStats.creditBalances.length > 0 && (
            <div className="bg-white rounded-md shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium mb-4">Staff with Credit Balances</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {dashboardStats.creditBalances.map((staff) => (
                  <div key={staff.id} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{staff.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{staff.position}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-green-600 text-sm sm:text-base">${Math.abs(staff.house_account_balance).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">credit</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-md shadow-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setActiveTab('house-accounts');
                  setShowAddForm(true);
                }}
                className="p-3 sm:p-4 border border-dashed border-gray-300 rounded-lg hover:border-[#c1902f] hover:bg-[#c1902f]/5 transition-colors group"
              >
                <div className="text-center">
                  <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform inline-block">👤</span>
                  <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Add New Staff</p>
                  <p className="text-xs sm:text-sm text-gray-500">Create a new staff member</p>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('reports')}
                className="p-3 sm:p-4 border border-dashed border-gray-300 rounded-lg hover:border-[#c1902f] hover:bg-[#c1902f]/5 transition-colors group"
              >
                <div className="text-center">
                  <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform inline-block">📊</span>
                  <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">View Reports</p>
                  <p className="text-xs sm:text-sm text-gray-500">House account analytics</p>
                </div>
              </button>
              
              <button
                onClick={exportStaffData}
                className="p-3 sm:p-4 border border-dashed border-gray-300 rounded-lg hover:border-[#c1902f] hover:bg-[#c1902f]/5 transition-colors group"
              >
                <div className="text-center">
                  <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform inline-block">📥</span>
                  <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Export Data</p>
                  <p className="text-xs sm:text-sm text-gray-500">Download CSV report</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'house-accounts' ? (
        <div>
          {/* House Accounts Content - This is the old "management" tab content */}
          {/* Add/Edit Form */}
          {showAddForm && (
        <div className="bg-white p-4 rounded-md shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingStaffMember ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to User (Optional)
                </label>
                <MobileSelect
                  options={[
                    { value: '', label: 'Select a user (optional)' },
                    ...users.map(user => ({
                      value: user.id.toString(),
                      label: `${user.first_name || ''} ${user.last_name || ''}${user.email ? ` (${user.email})` : ''}${user.role ? ` - ${user.role}` : ''}`
                    }))
                  ]}
                  value={formData.user_id}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, user_id: value }));
                  }}
                  placeholder="Select a user (optional)"
                />
                {loadingUsers && <p className="text-sm text-gray-500 mt-1">Loading users...</p>}
                {users.length === 0 && !loadingUsers && (
                  <p className="text-sm text-gray-500 mt-1">
                    {editingStaffMember?.user_id ?
                      "No available users found. The current user assignment will be maintained." :
                      "No available users found. All users may already be assigned to staff members."}
                  </p>
                )}
              </div>
              <div className="flex items-center">
                <div className="relative flex items-center group">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700 flex items-center">
                    Active
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 w-64 z-10">
                      Only active staff members can receive discounts (50% on-duty, 30% off-duty), appear in staff selection dropdowns, and use their house accounts.
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddForm(false);
                }}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] transition-colors"
              >
                {editingStaffMember ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
          )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
          )}

          {/* Staff Members List */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#c1902f]"></div>
            </div>
          ) : (
            <div className="bg-white rounded-md shadow-md overflow-hidden">
              {/* Quick Filter Controls */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="space-y-4">
                  {/* Primary Filter Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 max-w-xs">
                        <MobileSelect
                          label="Filter by Balance:"
                          options={[
                            { value: 'all', label: `All Staff (${staffMembers.length})` },
                            { value: 'outstanding', label: `Outstanding Balances (${staffMembers.filter(s => s.house_account_balance > 0).length})` },
                            { value: 'credit', label: `Credit Balances (${staffMembers.filter(s => s.house_account_balance < 0).length})` }
                          ]}
                          value={houseAccountFilter}
                          onChange={(value) => setHouseAccountFilter(value as 'all' | 'outstanding' | 'credit')}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={exportStaffData}
                        className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Export CSV
                      </button>
                      {(houseAccountFilter !== 'all' || advancedFilters.activityFilter !== 'all' || advancedFilters.balanceRange !== 'all' || advancedFilters.sortBy !== 'name') && (
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-[#c1902f] hover:text-[#a67b28] transition-colors underline"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Advanced Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Sort By */}
                    <div>
                      <MobileSelect
                        label="Sort by:"
                        options={[
                          { value: 'name', label: 'Name' },
                          { value: 'balance', label: 'Balance Amount' },
                          { value: 'recent_activity', label: 'Recent Activity' }
                        ]}
                        value={advancedFilters.sortBy}
                        onChange={(value) => updateAdvancedFilter('sortBy', value)}
                      />
                    </div>
                    
                    {/* Sort Order */}
                    <div>
                      <MobileSelect
                        label="Order:"
                        options={[
                          { value: 'asc', label: advancedFilters.sortBy === 'balance' ? 'Low to High' : 'A to Z' },
                          { value: 'desc', label: advancedFilters.sortBy === 'balance' ? 'High to Low' : 'Z to A' }
                        ]}
                        value={advancedFilters.sortOrder}
                        onChange={(value) => updateAdvancedFilter('sortOrder', value)}
                      />
                    </div>
                    
                    {/* Activity Filter */}
                    <div>
                      <MobileSelect
                        label="Activity Status:"
                        options={[
                          { value: 'all', label: `All (${staffMembers.length})` },
                          { value: 'active', label: `Active (${staffMembers.filter(s => s.active).length})` },
                          { value: 'inactive', label: `Inactive (${staffMembers.filter(s => !s.active).length})` }
                        ]}
                        value={advancedFilters.activityFilter}
                        onChange={(value) => updateAdvancedFilter('activityFilter', value)}
                      />
                    </div>
                    
                    {/* Balance Range Filter */}
                    <div>
                      <MobileSelect
                        label="Balance Range:"
                        options={[
                          { value: 'all', label: 'All Amounts' },
                          { value: 'under_10', label: 'Under $10' },
                          { value: '10_to_50', label: '$10 - $50' },
                          { value: 'over_50', label: 'Over $50' }
                        ]}
                        value={advancedFilters.balanceRange}
                        onChange={(value) => updateAdvancedFilter('balanceRange', value)}
                      />
                    </div>
                  </div>
                  
                  {/* Results Summary */}
                  <div className="text-sm text-gray-600">
                    Showing {getFilteredStaffMembers().length} of {staffMembers.length} staff members
                  </div>
                </div>
              </div>
              
              {/* Bulk Actions Bar */}
              {selectedStaffIds.size > 0 && (
                <div className="px-6 py-3 bg-[#c1902f] text-white border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">
                        {selectedStaffIds.size} staff member{selectedStaffIds.size !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={clearSelection}
                        className="text-sm text-[#f1d7a0] hover:text-white transition-colors underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={openBulkPaymentModal}
                        className="px-4 py-2 bg-white text-[#c1902f] rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Record Bulk Payment
                      </button>
                      <button
                        onClick={() => processBulkPayrollDeduction()}
                        disabled={processingBulkPayment || staffMembers.filter(staff => selectedStaffIds.has(staff.id) && staff.house_account_balance > 0).length === 0}
                        className="px-4 py-2 bg-[#a67b28] text-white rounded-md text-sm font-medium hover:bg-[#8a6522] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingBulkPayment ? 'Processing...' : 'Payroll Deduction'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.size > 0 && selectedStaffIds.size === getFilteredStaffMembers().length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        House Account Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredStaffMembers().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          {houseAccountFilter === 'all' ? 'No staff members found' : 
                           houseAccountFilter === 'outstanding' ? 'No staff with outstanding balances' :
                           'No staff with credit balances'}
                        </td>
                      </tr>
                    ) : (
                      getFilteredStaffMembers().map(staffMember => {
                        const isExpanded = expandedRows.has(staffMember.id);
                        const form = paymentForms[staffMember.id];
                        const isProcessing = processingPayments.has(staffMember.id);
                        const transactions = staffTransactions[staffMember.id] || [];
                        const isLoadingTxns = loadingTransactions.has(staffMember.id);
                        const isSelected = selectedStaffIds.has(staffMember.id);

                        return (
                          <React.Fragment key={staffMember.id}>
                            {/* Main staff row */}
                            <tr className={isExpanded ? 'bg-blue-50' : isSelected ? 'bg-blue-25' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleStaffSelection(staffMember.id, e.target.checked)}
                                  className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <button
                                    onClick={() => toggleRowExpansion(staffMember.id)}
                                    className="mr-2 text-gray-400 hover:text-gray-600"
                                  >
                                    {isExpanded ? '▼' : '▶'}
                                  </button>
                                  <div className="text-sm font-medium text-gray-900">{staffMember.name}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{staffMember.position}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${staffMember.house_account_balance > 0 ? 'text-red-600' : staffMember.house_account_balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                  ${Math.abs(staffMember.house_account_balance).toFixed(2)}
                                  {staffMember.house_account_balance > 0 ? ' (owed)' : 
                                   staffMember.house_account_balance < 0 ? ' (credit)' : ''}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  staffMember.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {staffMember.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleEdit(staffMember)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => toggleActive(staffMember)}
                                  className={`${
                                    staffMember.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                                  }`}
                                >
                                  {staffMember.active ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded row for payment interface and transactions */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="px-6 py-4 bg-gray-50 border-t">
                                  <div className="space-y-4">
                                    {/* Payment Interface */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                                      <h4 className="text-lg font-medium mb-3">Record Payment/Charge</h4>
                                      <div 
                                        onFocus={() => initializePaymentForm(staffMember.id)}
                                        className="grid grid-cols-1 md:grid-cols-4 gap-4"
                                      >
                                        {/* Payment Type */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                          <select
                                            value={form?.type || 'payment'}
                                            onChange={(e) => updatePaymentForm(staffMember.id, 'type', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                                          >
                                            <option value="payment">Payment Received</option>
                                            <option value="charge">Add Charge</option>
                                          </select>
                                        </div>

                                        {/* Amount */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={form?.amount || ''}
                                            onChange={(e) => updatePaymentForm(staffMember.id, 'amount', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                                            placeholder="0.00"
                                          />
                                        </div>

                                        {/* Description */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                          <input
                                            type="text"
                                            value={form?.description || ''}
                                            onChange={(e) => updatePaymentForm(staffMember.id, 'description', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                                            placeholder="Optional description"
                                          />
                                        </div>

                                        {/* Reference */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                                          <input
                                            type="text"
                                            value={form?.reference || ''}
                                            onChange={(e) => updatePaymentForm(staffMember.id, 'reference', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                                            placeholder="e.g., Payroll 06/09/2025"
                                          />
                                        </div>
                                      </div>

                                      {/* Quick Amount Buttons */}
                                      {staffMember.house_account_balance > 0 && (
                                        <div className="mt-3">
                                          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Amounts:</label>
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={() => setQuickAmount(staffMember.id, staffMember.house_account_balance)}
                                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                                            >
                                              Full Balance (${staffMember.house_account_balance.toFixed(2)})
                                            </button>
                                            <button
                                              onClick={() => setQuickAmount(staffMember.id, staffMember.house_account_balance / 2)}
                                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                            >
                                              Half (${(staffMember.house_account_balance / 2).toFixed(2)})
                                            </button>
                                            <button
                                              onClick={() => setQuickAmount(staffMember.id, 10)}
                                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                            >
                                              $10
                                            </button>
                                            <button
                                              onClick={() => setQuickAmount(staffMember.id, 25)}
                                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                            >
                                              $25
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Submit Button */}
                                      <div className="mt-4 flex justify-end">
                                        <button
                                          onClick={() => submitPayment(staffMember.id)}
                                          disabled={isProcessing || !form?.amount}
                                          className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {isProcessing ? 'Processing...' : 
                                           form?.type === 'payment' ? 'Record Payment' : 'Add Charge'}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Transaction History */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                                      <h4 className="text-lg font-medium mb-3">Transaction History</h4>
                                      {isLoadingTxns ? (
                                        <div className="text-center py-4">
                                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#c1902f] mx-auto"></div>
                                        </div>
                                      ) : transactions.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No transactions found</p>
                                      ) : (
                                        <div className="max-h-60 overflow-y-auto">
                                          <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                              {transactions.map((txn, idx) => (
                                                <tr key={txn.id || idx} className="hover:bg-gray-50">
                                                  <td className="px-3 py-2 text-gray-900 text-sm">
                                                    {formatDateTime(txn.created_at)}
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                                      txn.transaction_type === 'order' ? 'bg-blue-100 text-blue-800' :
                                                      txn.transaction_type === 'payment' ? 'bg-green-100 text-green-800' :
                                                      'bg-gray-100 text-gray-800'
                                                    }`}>
                                                      {txn.transaction_type}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`font-medium ${
                                                      txn.amount > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                      ${Math.abs(txn.amount).toFixed(2)}
                                                      {txn.amount > 0 ? ' (charge)' : ' (payment)'}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-gray-900">{txn.description}</td>
                                                  <td className="px-3 py-2 text-gray-500">{txn.reference}</td>
                                                  <td className="px-3 py-2 text-gray-500">
                                                    {txn.created_by_name || 'System'}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* House Account Reports Content */}
          <StaffFilterBar />
          <StaffReports />
        </div>
      )}
      
      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Record Bulk Payment ({selectedStaffIds.size} staff member{selectedStaffIds.size !== 1 ? 's' : ''})
              </h3>
              <button
                onClick={closeBulkPaymentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Selected Staff Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Staff Members:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {staffMembers
                    .filter(staff => selectedStaffIds.has(staff.id))
                    .map(staff => (
                      <div key={staff.id} className="flex justify-between text-sm">
                        <span className="text-gray-900">{staff.name}</span>
                        <span className={`font-medium ${
                          staff.house_account_balance > 0 ? 'text-red-600' : 
                          staff.house_account_balance < 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          ${Math.abs(staff.house_account_balance).toFixed(2)}
                          {staff.house_account_balance > 0 ? ' owed' : staff.house_account_balance < 0 ? ' credit' : ''}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Payment Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    value={bulkPaymentForm.type}
                    onChange={(e) => updateBulkPaymentForm('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f] focus:border-[#c1902f]"
                  >
                    <option value="payment">Payment Received</option>
                    <option value="charge">Add Charge</option>
                  </select>
                </div>
                
                {/* Amount or Full Balance Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkPaymentForm.amount}
                      onChange={(e) => updateBulkPaymentForm('amount', e.target.value)}
                      disabled={bulkPaymentForm.useFullBalance}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f] focus:border-[#c1902f] disabled:bg-gray-100"
                      placeholder="0.00"
                    />
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={bulkPaymentForm.useFullBalance}
                        onChange={(e) => updateBulkPaymentForm('useFullBalance', e.target.checked)}
                        className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded mr-2"
                      />
                      Pay each staff member's full balance
                    </label>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={bulkPaymentForm.description}
                    onChange={(e) => updateBulkPaymentForm('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    placeholder="Optional description"
                  />
                </div>
                
                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input
                    type="text"
                    value={bulkPaymentForm.reference}
                    onChange={(e) => updateBulkPaymentForm('reference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    placeholder="e.g., Payroll 06/09/2025"
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closeBulkPaymentModal}
                  disabled={processingBulkPayment}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processBulkPayment}
                  disabled={processingBulkPayment || (!bulkPaymentForm.amount && !bulkPaymentForm.useFullBalance)}
                  className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {processingBulkPayment ? 'Processing...' : `Record ${bulkPaymentForm.type === 'payment' ? 'Payment' : 'Charge'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the wrapped component with filter context
export function StaffManagement() {
  return (
    <StaffFilterProvider>
      <StaffManagementContent />
    </StaffFilterProvider>
  );
}
