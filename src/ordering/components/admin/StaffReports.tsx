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

interface Transaction {
  id: number;
  amount: number;
  transaction_type: 'order' | 'payment' | 'adjustment' | 'charge';
  description: string;
  reference?: string;
  created_at: string;
  created_by_name?: string;
}

interface StaffOrder {
  id: number;
  staff_member_id: number;
  staff_member_name: string;
  staff_on_duty: boolean; // Keep for backward compatibility
  discount_type?: 'on_duty' | 'off_duty' | 'no_discount';
  discount_rate?: number;
  pre_discount_total: number;
  total: number;
  discount_amount: number;
  discount_percentage: number;
  use_house_account: boolean;
  created_at: string;
  staff_discount_configuration?: {
    name: string;
    discount_type: string;
    discount_percentage: number;
    code: string;
  };
}

interface DiscountSummary {
  total_retail_value: number;
  total_discounted_value: number;
  total_discount_amount: number;
  duty_breakdown?: {
    on_duty: {
      order_count: number;
      retail_value: number;
      discounted_value: number;
      discount_amount: number;
      discount_percentage: number;
    };
    off_duty: {
      order_count: number;
      retail_value: number;
      discounted_value: number;
      discount_amount: number;
      discount_percentage: number;
    };
    no_discount: {
      order_count: number;
      retail_value: number;
      discounted_value: number;
      discount_amount: number;
      discount_percentage: number;
    };
  };
  by_staff_member: {
    staff_id: number;
    staff_name: string;
    on_duty_count: number;
    off_duty_count: number;
    no_discount_count?: number;
    on_duty_discount: number;
    off_duty_discount: number;
    no_discount_discount?: number;
    total_discount: number;
  }[];
}

export function StaffReports() {
  const { filters } = useStaffFilters();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [staffOrders, setStaffOrders] = useState<StaffOrder[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [discountSummary, setDiscountSummary] = useState<DiscountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick Analysis Modal state
  const [showQuickAnalysisModal, setShowQuickAnalysisModal] = useState(false);
  const [quickAnalysisData, setQuickAnalysisData] = useState<{
    totalOrders: number;
    totalSpending: number;
    averageOrder: number;
    onDutyRate: number;
  } | null>(null);

  // Helper function to get discount display information
  const getDiscountInfo = (order: StaffOrder) => {
    // Check if order has staff discount configuration information
    if (order.staff_discount_configuration) {
      const config = order.staff_discount_configuration;
      return {
        label: config.name,
        percentage: config.discount_type === 'percentage' 
          ? `${config.discount_percentage}%` 
          : `$${config.discount_percentage}`,
        badgeClass: getBadgeClassForDiscount(config.code, config.discount_percentage),
        configurationName: config.name,
        configurationType: config.discount_type
      };
    }
    
    // Fallback: Use new discount_type if available, otherwise fall back to staff_on_duty
    const discountType = order.discount_type || (order.staff_on_duty ? 'on_duty' : 'off_duty');
    
    switch (discountType) {
      case 'on_duty':
        return {
          label: 'On Duty',
          percentage: '50%',
          badgeClass: 'bg-green-100 text-green-800',
          configurationName: 'On Duty',
          configurationType: 'percentage'
        };
      case 'off_duty':
        return {
          label: 'Off Duty',
          percentage: '30%',
          badgeClass: 'bg-yellow-100 text-yellow-800',
          configurationName: 'Off Duty',
          configurationType: 'percentage'
        };
      case 'no_discount':
        return {
          label: 'No Discount',
          percentage: '0%',
          badgeClass: 'bg-gray-100 text-gray-800',
          configurationName: 'No Discount',
          configurationType: 'percentage'
        };
      default:
        return {
          label: 'Off Duty',
          percentage: '30%',
          badgeClass: 'bg-yellow-100 text-yellow-800',
          configurationName: 'Off Duty',
          configurationType: 'percentage'
        };
    }
  };

  // Helper function to get badge class based on discount code and percentage
  const getBadgeClassForDiscount = (code: string, percentage: number) => {
    // Use specific colors for known discount codes
    switch (code) {
      case 'on_duty':
        return 'bg-green-100 text-green-800';
      case 'off_duty':
        return 'bg-yellow-100 text-yellow-800';
      case 'no_discount':
        return 'bg-gray-100 text-gray-800';
      default:
        // For custom discounts, use color based on percentage
        if (percentage >= 50) {
          return 'bg-green-100 text-green-800'; // High discount
        } else if (percentage >= 25) {
          return 'bg-yellow-100 text-yellow-800'; // Medium discount
        } else if (percentage > 0) {
          return 'bg-blue-100 text-blue-800'; // Low discount
        } else {
          return 'bg-gray-100 text-gray-800'; // No discount
        }
    }
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
  


  // Fetch staff members
  useEffect(() => {
    fetchStaffMembers();
  }, []);

  // Fetch report data when parameters change
  useEffect(() => {
    fetchStaffOrders();
    fetchDiscountSummary();
  }, [filters.dateRange, filters.staffMemberId]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isExportMenuOpen && !target.closest('.export-dropdown')) {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

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
      }
    } catch (err: any) {
      console.error('Error fetching discount summary:', err);
      toastUtils.error('Failed to fetch discount summary');
      setDiscountSummary(null);
    }
  };

  const handleExport = async (format: 'csv' | 'detailed_csv' | 'summary_pdf') => {
    try {
      setIsExportMenuOpen(false);
      setIsExporting(true);
      
      let endpoint = '/reports/staff_orders/export';
      let filename = 'house_accounts_report.csv';
      
      switch (format) {
        case 'csv':
          endpoint = '/reports/staff_orders/export';
          filename = 'house_accounts.csv';
          break;
        case 'detailed_csv':
          endpoint = '/reports/staff_orders/export';
          filename = 'house_accounts_detailed.csv';
          break;
        case 'summary_pdf':
          endpoint = '/reports/staff_orders/summary';
          filename = 'house_accounts_summary.pdf';
          break;
      }
      
      const params = new URLSearchParams({
        date_from: filters.dateRange.from,
        date_to: filters.dateRange.to,
        format: format,
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
      
      toastUtils.success(`${format.toUpperCase()} export successful`);
    } catch (err: any) {
      console.error('Error exporting:', err);
      toastUtils.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickAnalysis = () => {
    const houseAccountOrders = staffOrders.filter(order => order.use_house_account);
    
    // Calculate on-duty rate considering configurable discounts
    const onDutyCount = houseAccountOrders.filter(order => {
      if (order.staff_discount_configuration) {
        return order.staff_discount_configuration.code === 'on_duty';
      } else {
        const discountType = order.discount_type || (order.staff_on_duty ? 'on_duty' : 'off_duty');
        return discountType === 'on_duty';
      }
    }).length;
    
    const insights = {
      totalOrders: houseAccountOrders.length,
      totalSpending: houseAccountOrders.reduce((sum, order) => sum + order.total, 0),
      averageOrder: houseAccountOrders.length > 0 ? houseAccountOrders.reduce((sum, order) => sum + order.total, 0) / houseAccountOrders.length : 0,
      onDutyRate: houseAccountOrders.length > 0 ? (onDutyCount / houseAccountOrders.length) * 100 : 0,
    };
    
    setShowQuickAnalysisModal(true);
    setQuickAnalysisData(insights);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Reports</h1>
        
        {/* Enhanced Export & Actions Menu */}
        <div className="flex items-center space-x-3">
          {/* Quick Analysis Button */}
          <button
            onClick={handleQuickAnalysis}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors border border-gray-300 flex items-center space-x-2"
            title="Get quick insights about current data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Quick Analysis</span>
          </button>

          {/* Enhanced Export Dropdown */}
          <div className="relative export-dropdown">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                isExporting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#c1902f] hover:bg-[#a67b28]'
              } text-white`}
              aria-expanded={isExportMenuOpen}
            >
              {isExporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              {!isExporting && (
                <svg className={`w-4 h-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Export Dropdown Menu */}
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Export Options
                  </div>
                  
                  {/* CSV Export */}
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 text-left">
                      <div className="font-medium">Standard CSV</div>
                      <div className="text-xs text-gray-500">Basic data export for spreadsheets</div>
                    </div>
                  </button>

                  {/* Detailed CSV Export */}
                  <button
                    onClick={() => handleExport('detailed_csv')}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 text-left">
                      <div className="font-medium">Detailed CSV</div>
                      <div className="text-xs text-gray-500">Enhanced data with analytics & performance metrics</div>
                    </div>
                  </button>

                  {/* PDF Summary Export */}
                  <button
                    onClick={() => handleExport('summary_pdf')}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 text-left">
                      <div className="font-medium">Summary PDF</div>
                      <div className="text-xs text-gray-500">Professional report with charts & insights</div>
                    </div>
                  </button>

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <div className="px-4 py-2 text-xs text-gray-500">
                      House Accounts & Discounts • {filters.dateRange.from} to {filters.dateRange.to}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
        <div className="space-y-6">
          {/* Basic Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const houseAccountOrders = staffOrders.filter(order => order.use_house_account);
              const totalOrders = houseAccountOrders.length;
              const totalSpending = houseAccountOrders.reduce((sum, order) => sum + order.total, 0);
              const averageOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0;
              const totalSavings = discountSummary?.total_discount_amount || 0;
              
              return (
                <>
                  {/* Total Orders */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                          <dd className="text-2xl font-bold text-gray-900">{totalOrders}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  {/* Total Spending */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Spending</dt>
                          <dd className="text-2xl font-bold text-gray-900">${totalSpending.toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  {/* Average Order Value */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-[#c1902f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Average Order</dt>
                          <dd className="text-2xl font-bold text-gray-900">${averageOrderValue.toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  {/* Total Discount Savings */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Savings</dt>
                          <dd className="text-2xl font-bold text-gray-900">${totalSavings.toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Summary Section */}
          {discountSummary && (
            <div className="bg-white rounded-md shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm text-gray-500">Original Price (Before Discount)</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(discountSummary.total_retail_value || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm text-gray-500">Amount Paid (After Discount)</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(discountSummary.total_discounted_value || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm text-gray-500">Discount Savings</div>
                  <div className="text-2xl font-bold text-[#c1902f]">
                    ${(discountSummary.total_discount_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 italic">
                <span className="font-medium">Note:</span> Staff discounts are based on configurable discount settings. Default rates are 50% for on-duty staff, 30% for off-duty staff, and 0% for no discount orders.
              </div>
            </div>
          )}

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
                        <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2 py-1 text-xs rounded-full ${getDiscountInfo(order).badgeClass} mb-1`}>
                          {getDiscountInfo(order).label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getDiscountInfo(order).percentage}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Pre-Discount:</span>
                        <span className="ml-1 font-medium">${(Number(order.pre_discount_total) || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Final Total:</span>
                        <span className="ml-1 font-medium text-[#c1902f]">${(Number(order.total) || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Discount:</span>
                        <span className="ml-1 font-medium">${(Number(order.discount_amount) || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Rate:</span>
                        <span className="ml-1 font-medium">{getDiscountInfo(order).percentage}</span>
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
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount Applied
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
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDateTime(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.staff_member_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDiscountInfo(order).badgeClass} mb-1`}>
                              {getDiscountInfo(order).label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getDiscountInfo(order).percentage} discount
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${(Number(order.pre_discount_total) || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${(Number(order.discount_amount) || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getDiscountInfo(order).percentage}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#c1902f]">
                            ${(Number(order.total) || 0).toFixed(2)}
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
      
      {/* Quick Analysis Modal */}
      {showQuickAnalysisModal && quickAnalysisData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">📊</span>
                Quick Analysis
              </h3>
              <button
                onClick={() => setShowQuickAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Total Orders */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📋</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Total Orders</p>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {quickAnalysisData.totalOrders}
                </div>
              </div>
              
              {/* Total Spending */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">💰</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Total Spending</p>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  ${quickAnalysisData.totalSpending.toFixed(2)}
                </div>
              </div>
              
              {/* Average Order */}
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-sm">📈</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">Average Order</p>
                  </div>
                </div>
                <div className="text-lg font-bold text-yellow-600">
                  ${quickAnalysisData.averageOrder.toFixed(2)}
                </div>
              </div>
              
              {/* On-Duty Rate */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm">⏰</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-800">On-Duty Orders</p>
                  </div>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {quickAnalysisData.onDutyRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowQuickAnalysisModal(false)}
                className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a67b28] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
