// src/ordering/components/admin/StaffReports.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/apiClient';
import toastUtils from '../../../shared/utils/toastUtils';
import { useStaffFilters } from './StaffFilterContext';

interface StaffMember {
  id: number;
  name: string;
  position: string;
  house_account_balance: number;
  active: boolean;
}

interface StaffOrder {
  id: number;
  staff_member_id: number;
  staff_member_name: string;
  staff_on_duty: boolean;
  pre_discount_total: number;
  total: number;
  discount_amount: number;
  discount_percentage: number;
  use_house_account: boolean;
  created_at: string;
}

interface DiscountSummary {
  total_retail_value: number;
  total_discounted_value: number;
  total_discount_amount: number;
  by_staff_member: {
    staff_id: number;
    staff_name: string;
    on_duty_count: number;
    off_duty_count: number;
    on_duty_discount: number;
    off_duty_discount: number;
    total_discount: number;
  }[];
}

export function StaffReports() {
  const { filters } = useStaffFilters();
  const [activeReport, setActiveReport] = useState<'house_accounts' | 'discounts'>('house_accounts');
  const [staffOrders, setStaffOrders] = useState<StaffOrder[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [discountSummary, setDiscountSummary] = useState<DiscountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'payment' | 'details' | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Payment tracking form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSource, setPaymentSource] = useState<'payroll_deduction' | 'cash_payment' | 'other'>('payroll_deduction');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Fetch staff members
  useEffect(() => {
    fetchStaffMembers();
  }, []);

  // Fetch report data when parameters change
  useEffect(() => {
    if (activeReport === 'house_accounts') {
      fetchStaffOrders();
      fetchStaffMembers(); // Fetch balance data for combined view
    } else if (activeReport === 'discounts') {
      fetchDiscountSummary();
    }
  }, [activeReport, filters.dateRange, filters.staffMemberId]);

  const fetchStaffMembers = async () => {
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
          toastUtils.error('Unexpected API response format');
        }
      } else {
        console.error('Invalid response data:', response.data);
        setStaffMembers([]);
        toastUtils.error('Invalid API response');
      }
    } catch (err: any) {
      console.error('Error fetching staff members:', err);
      toastUtils.error('Failed to fetch staff members');
      setStaffMembers([]);
    }
  };

  const fetchStaffOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date_from: filters.dateRange.from,
        date_to: filters.dateRange.to,
        ...(filters.staffMemberId !== 'all' && { staff_member_id: filters.staffMemberId.toString() })
      });
      
      const response = await apiClient.get(`/reports/staff_orders?${params.toString()}`);
      // Handle different response formats
      if (Array.isArray(response.data)) {
        setStaffOrders(response.data);
      } else if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.staff_orders)) {
          setStaffOrders(response.data.staff_orders);
        } else if (Array.isArray(response.data.orders)) {
          // Handle the actual response format from the backend
          setStaffOrders(response.data.orders);
        } else {
          console.error('Unexpected staff orders response format:', response.data);
          setStaffOrders([]);
          setError('Unexpected API response format');
        }
      } else {
        console.error('Invalid staff orders response data:', response.data);
        setStaffOrders([]);
        setError('Invalid API response');
      }
    } catch (err: any) {
      console.error('Error fetching staff orders:', err);
      setError(err.message || 'Failed to fetch staff orders');
      toastUtils.error('Failed to fetch staff orders');
      setStaffOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date_from: filters.dateRange.from,
        date_to: filters.dateRange.to,
        ...(filters.staffMemberId !== 'all' && { staff_member_id: filters.staffMemberId.toString() })
      });
      
      const response = await apiClient.get(`/reports/discount_summary?${params.toString()}`);
      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        let summaryData;
        
        if (response.data.discount_summary) {
          summaryData = response.data.discount_summary;
        } else {
          // If it's already in the expected format
          summaryData = response.data;
        }
        
        // Ensure all numeric values are properly converted to numbers
        const processedData = {
          ...summaryData,
          total_retail_value: Number(summaryData.total_retail_value || 0),
          total_discounted_value: Number(summaryData.total_discounted_value || 0),
          total_discount_amount: Number(summaryData.total_discount_amount || 0),
          discount_percentage: Number(summaryData.discount_percentage || 0),
          by_staff_member: Array.isArray(summaryData.by_staff_member) 
            ? summaryData.by_staff_member.map((staff: any) => ({
                ...staff,
                on_duty_discount: Number(staff.on_duty_discount || 0),
                off_duty_discount: Number(staff.off_duty_discount || 0),
                total_discount: Number(staff.total_discount || 0),
                on_duty_count: Number(staff.on_duty_count || 0),
                off_duty_count: Number(staff.off_duty_count || 0)
              }))
            : []
        };
        
        setDiscountSummary(processedData);
      } else {
        console.error('Invalid discount summary response data:', response.data);
        setDiscountSummary(null);
        setError('Invalid API response');
      }
    } catch (err: any) {
      console.error('Error fetching discount summary:', err);
      setError(err.message || 'Failed to fetch discount summary');
      toastUtils.error('Failed to fetch discount summary');
      setDiscountSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Date changes are now handled by the filter context

  // Handler for recording payments
  const handleRecordPayment = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setModalType('payment');
    // Initialize with full balance amount
    setPaymentAmount(Math.abs(staff.house_account_balance).toFixed(2));
    setModalOpen(true);
  };

  // Handler for viewing staff details
  const handleViewDetails = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setModalType('details');
    setModalOpen(true);
  };

  // Record payment API call
  const recordPayment = async () => {
    if (!selectedStaff || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      return;
    }

    setIsRecordingPayment(true);
    try {
      const transactionData = {
        transaction: {
          amount: parseFloat(paymentAmount),
          transaction_type: 'payment',
          description: `Payment received - ${paymentSource === 'payroll_deduction' ? 'Payroll Deduction' : 
                       paymentSource === 'cash_payment' ? 'Cash Payment' : 'Other'}`,
          reference: paymentNotes || `Recorded by admin on ${new Date().toLocaleDateString()}`
        }
      };

      const response = await apiClient.post(`/staff_members/${selectedStaff.id}/transactions`, transactionData);
      
      console.log('Payment response:', response.data); // Debug logging
      
      if (response.data) {
        // Success! Let's refresh the staff data from the server to get updated balance
        toastUtils.success(`Payment of $${parseFloat(paymentAmount).toFixed(2)} recorded successfully!`);
        closeModal();
        
        // Refresh staff data to get updated balances
        await fetchStaffMembers();
      }
    } catch (err: any) {
      console.error('Error recording payment:', err);
      toastUtils.error(err.response?.data?.errors?.join(', ') || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setSelectedStaff(null);
    // Reset payment form
    setPaymentAmount('');
    setPaymentSource('payroll_deduction');
    setPaymentNotes('');
    setIsRecordingPayment(false);
  };

  const handleExportCSV = async () => {
    try {
      let endpoint = '';
      let filename = '';
      
      if (activeReport === 'house_accounts') {
        endpoint = '/reports/staff_orders/export';
        filename = 'house_accounts.csv';
      } else if (activeReport === 'discounts') {
        endpoint = '/reports/discount_summary/export';
        filename = 'discount_summary.csv';
      }
      
      const params = new URLSearchParams({
        date_from: filters.dateRange.from,
        date_to: filters.dateRange.to,
        ...(filters.staffMemberId !== 'all' && { staff_member_id: filters.staffMemberId.toString() })
      });
      
      const response = await apiClient.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toastUtils.success('Export successful');
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      toastUtils.error('Failed to export CSV');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Reports</h1>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="mb-6">
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveReport('house_accounts')}
            className={`py-2 px-4 font-medium text-base md:text-sm ${
              activeReport === 'house_accounts'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            House Accounts
          </button>
          <button
            onClick={() => setActiveReport('discounts')}
            className={`py-2 px-4 font-medium text-base md:text-sm ${
              activeReport === 'discounts'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Discount Summary
          </button>
        </div>
      </div>

      {/* Filters are now handled by the unified StaffFilterBar */}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#c1902f]"></div>
        </div>
      ) : (
        <>
          {/* House Accounts - Combined View */}
          {activeReport === 'house_accounts' && (
            <div className="space-y-6">
              {/* House Account Balances Section */}
              <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">House Account Balances</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffMembers.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                      No staff members found
                    </div>
                  ) : (
                    staffMembers.map((staff) => (
                      <div key={staff.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{staff.name}</h3>
                            <p className="text-sm text-gray-500">{staff.position}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            staff.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {staff.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          <div className={`text-lg font-semibold ${
                            staff.house_account_balance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ${Math.abs(staff.house_account_balance).toFixed(2)}
                            <span className="text-sm font-normal ml-1">
                              {staff.house_account_balance > 0 ? '(owed)' : staff.house_account_balance < 0 ? '(credit)' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {/* Quick Action Buttons */}
                        <div className="flex gap-2">
                          {staff.house_account_balance > 0 && (
                            <button 
                              onClick={() => handleRecordPayment(staff)}
                              className="flex-1 bg-[#c1902f] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#a67b28] transition-colors"
                            >
                              Record Payment
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewDetails(staff)}
                            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Orders Section */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Recent House Account Orders</h2>
                  <p className="text-sm text-gray-600 mt-1">Orders charged to house accounts in the selected period</p>
                </div>
                
                {/* Mobile-friendly order cards */}
                <div className="md:hidden">
                  {staffOrders.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      No house account orders found for the selected period
                    </div>
                  ) : (
                    staffOrders.filter(order => order.use_house_account).map((order) => (
                      <div key={order.id} className="border-b border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{order.staff_member_name}</h3>
                            <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            order.staff_on_duty ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.staff_on_duty ? 'On Duty' : 'Off Duty'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Pre-Discount:</span>
                            <span className="ml-1 font-medium">${order.pre_discount_total.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Final Total:</span>
                            <span className="ml-1 font-medium text-[#c1902f]">${order.total.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Discount:</span>
                            <span className="ml-1 font-medium">${order.discount_amount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Rate:</span>
                            <span className="ml-1 font-medium">{order.staff_on_duty ? '50%' : '30%'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Staff Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duty Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pre-Discount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Final Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staffOrders.filter(order => order.use_house_account).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            No house account orders found for the selected period
                          </td>
                        </tr>
                      ) : (
                        staffOrders.filter(order => order.use_house_account).map((order) => (
                          <tr key={order.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {order.staff_member_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.staff_on_duty ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.staff_on_duty ? 'On Duty' : 'Off Duty'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ${order.pre_discount_total.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ${order.discount_amount.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {order.staff_on_duty ? '50%' : '30%'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-[#c1902f]">
                                ${order.total.toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Discount Summary */}
          {activeReport === 'discounts' && discountSummary && (
            <div className="space-y-6">
              <div className="bg-white rounded-md shadow-md p-4">
                <h2 className="text-xl font-semibold mb-4">Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-md group relative cursor-help">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-500">Original Price (Before Discount)</div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${(discountSummary.total_retail_value || 0).toFixed(2)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition duration-300 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-800 text-white text-xs rounded w-64 mb-2 shadow-lg">
                      The full price that would have been charged to regular customers (no staff discount).
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md group relative cursor-help">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-500">Amount Paid (After Discount)</div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${(discountSummary.total_discounted_value || 0).toFixed(2)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition duration-300 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-800 text-white text-xs rounded w-64 mb-2 shadow-lg">
                      The actual amount paid by staff members after applying the staff discount (50% for on-duty, 30% for off-duty).
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md group relative cursor-help">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-500">Discount Savings</div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-[#c1902f]">
                      ${(discountSummary.total_discount_amount || 0).toFixed(2)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition duration-300 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-800 text-white text-xs rounded w-64 mb-2 shadow-lg">
                      The total amount saved through staff discounts (Original Price - Amount Paid).
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 italic">
                  <span className="font-medium">Note:</span> Hover over each card for more details. Staff discounts are 50% for on-duty staff and 30% for off-duty staff.
                </div>
              </div>

              <div className="bg-white rounded-md shadow-md overflow-hidden">
                <h2 className="text-xl font-semibold p-4 border-b border-gray-200">
                  Breakdown by Staff Member
                </h2>
                <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
                  This table shows the discount breakdown for each staff member, including the number of orders and discount amounts for both on-duty (50% discount) and off-duty (30% discount) orders.
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Staff Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          On Duty Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Off Duty Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          On Duty Savings (50%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Off Duty Savings (30%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Savings
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {!discountSummary.by_staff_member || discountSummary.by_staff_member.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            No discount data found for the selected period
                          </td>
                        </tr>
                      ) : (
                        discountSummary.by_staff_member.map((staff) => (
                          <tr key={staff.staff_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {staff.staff_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{staff.on_duty_count}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{staff.off_duty_count}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ${(staff.on_duty_discount || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ${(staff.off_duty_discount || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-[#c1902f]">
                                ${(staff.total_discount || 0).toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Modal */}
      {modalOpen && selectedStaff && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {modalType === 'payment' && (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Record Payment Received</h3>
                  <p className="text-sm text-gray-600 mt-1">Track payments deducted from paycheck or received directly</p>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="text-center">
                    <h4 className="text-xl font-medium text-gray-900">{selectedStaff.name}</h4>
                    <p className="text-gray-500">{selectedStaff.position}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Current Balance Owed</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${Math.abs(selectedStaff.house_account_balance).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        id="paymentAmount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                        placeholder="0.00"
                        min="0"
                        max={Math.abs(selectedStaff.house_account_balance).toFixed(2)}
                        step="0.01"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.abs(selectedStaff.house_account_balance).toFixed(2))}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        Full Amount
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount((Math.abs(selectedStaff.house_account_balance) / 2).toFixed(2))}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        Half Amount
                      </button>
                    </div>
                  </div>

                  {/* Payment Source */}
                  <div>
                    <label htmlFor="paymentSource" className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Source
                    </label>
                    <select
                      id="paymentSource"
                      value={paymentSource}
                      onChange={(e) => setPaymentSource(e.target.value as 'payroll_deduction' | 'cash_payment' | 'other')}
                      className="block w-full border-gray-300 rounded-md focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                    >
                      <option value="payroll_deduction">Payroll Deduction (Most Common)</option>
                      <option value="cash_payment">Cash Payment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="paymentNotes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      className="block w-full border-gray-300 rounded-md focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm"
                      placeholder="Add any notes about this payment..."
                    />
                  </div>

                  {/* Payment Summary */}
                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Payment Summary</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-700">Payment Amount:</span>
                          <span className="font-medium text-green-900">${parseFloat(paymentAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Remaining Balance:</span>
                          <span className="font-medium text-green-900">
                            ${(Math.abs(selectedStaff.house_account_balance) - parseFloat(paymentAmount)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Payment Source:</span>
                          <span className="font-medium text-green-900 capitalize">
                            {paymentSource === 'payroll_deduction' ? 'Payroll Deduction' : 
                             paymentSource === 'cash_payment' ? 'Cash Payment' : 'Other'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isRecordingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={recordPayment}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > Math.abs(selectedStaff.house_account_balance) || isRecordingPayment}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#c1902f] rounded-md hover:bg-[#a67b28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRecordingPayment ? 'Recording...' : 'Record Payment Received'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'details' && (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Staff Details</h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="text-center">
                    <h4 className="text-xl font-medium text-gray-900">{selectedStaff.name}</h4>
                    <p className="text-gray-500">{selectedStaff.position}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedStaff.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedStaff.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Account Balance</p>
                      <p className={`font-semibold ${
                        selectedStaff.house_account_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${Math.abs(selectedStaff.house_account_balance).toFixed(2)}
                        <span className="text-sm font-normal ml-1">
                          {selectedStaff.house_account_balance > 0 ? '(owed)' : selectedStaff.house_account_balance < 0 ? '(credit)' : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-800">
                          <strong>Phase 3 Feature:</strong> Detailed staff information including order history, payment records, and account management tools will be available in the next phase.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
