  // src/ordering/components/admin/AnalyticsManager.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  api,
  getCustomerOrdersReport,
  getRevenueTrend,
  getIncomeStatement,
  getUserSignups,
  getUserActivityHeatmap,
  getMenuItemReport,
  getPaymentMethodReport,
  getVipCustomerReport,
  getRefundsReport,
  getStaffUsers,
  CustomerOrderItem,
  CustomerOrderReport,
  RevenueTrendItem,
  IncomeStatementRow,
  UserSignupItem,
  HeatmapDataPoint,
  MenuItemReport,
  CategoryReport,
  PaymentMethodReport as PaymentMethodReportType,
  VipCustomerReport as VipCustomerReportType,
  VipReportSummary,
  RefundDetail,
  RefundsByMethod,
  RefundDailyTrend,
  RefundSummary
} from '../../../shared/api';
import { MenuItemPerformance } from './reports/MenuItemPerformance';
import { PaymentMethodReport } from './reports/PaymentMethodReport';
import { VipCustomerReport } from './reports/VipCustomerReport';
import { RefundsReport } from './reports/RefundsReport';

// ------------------- Types -------------------
type SortColumn = 'user_name' | 'total_spent' | 'order_count';
type SortDirection = 'asc' | 'desc';

// For date-range presets
type PresetRange = '1m' | '3m' | '6m' | '1y' | 'all' | null;

// For time frame selection
type TimeFrame = '30min' | 'hour' | 'day' | 'week' | 'month';

// For quick time presets
type TimePreset = '30min' | '1h' | '3h' | '6h' | '12h' | '24h' | '7d' | 'custom';

// ------------------- Helper functions for customizations -------------------
function formatCustomizationsForDisplay(customizations: Record<string, any>): string {
  return Object.entries(customizations)
    .map(([group, selections]) => {
      let selectionsText = '';
      if (Array.isArray(selections)) {
        selectionsText = selections.join(', ');
      } else if (typeof selections === 'string') {
        selectionsText = selections;
      } else {
        selectionsText = String(selections);
      }
      return `${group}: ${selectionsText}`;
    })
    .join(' | ');
}

function renderItemWithCustomizations(item: CustomerOrderItem, colorClass: string = 'text-gray-700') {
  return (
    <div className="space-y-1">
      {/* Main item */}
      <div className={`flex justify-between py-1 ${colorClass}`}>
        <span className="font-medium">{item.name}</span>
        <span className="font-medium">×{item.quantity}</span>
      </div>
      
      {/* Customizations */}
      {item.customizations && Object.keys(item.customizations).length > 0 && (
        <div className="ml-4 space-y-0.5">
          {Object.entries(item.customizations).map(([optionGroup, selections], idx) => {
            // Handle different data structures for selections
            let selectionsText = '';
            if (Array.isArray(selections)) {
              selectionsText = selections.join(', ');
            } else if (typeof selections === 'string') {
              selectionsText = selections;
            } else {
              selectionsText = String(selections);
            }
            
            return (
              <div key={idx} className={`text-xs ${colorClass} opacity-80`}>
                <span className="font-medium">{optionGroup}:</span>
                <span className="ml-1">{selectionsText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------------------- Helper to sort reports -------------------
function sortReports(
  data: CustomerOrderReport[],
  column: SortColumn,
  direction: SortDirection
) {
  const copy = [...data];
  copy.sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';

    if (column === 'user_name') {
      valA = a.user_name.toLowerCase();
      valB = b.user_name.toLowerCase();
    } else if (column === 'total_spent') {
      valA = a.total_spent;
      valB = b.total_spent;
    } else if (column === 'order_count') {
      valA = a.order_count;
      valB = b.order_count;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return copy;
}

// ------------------- Main Component -------------------
interface AnalyticsManagerProps {
  restaurantId?: string;
}

export function AnalyticsManager({ restaurantId }: AnalyticsManagerProps) {
  // Mobile/tablet responsive detection
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const isTablet = useMediaQuery({ minWidth: 641, maxWidth: 1024 });
  // ----- 1) Date Range States + Preset -----
  // Default to today's date for both start and end
  // Create a date object that's explicitly in Guam timezone
  const todayInGuam = new Date(new Date().toLocaleString('en-US', { timeZone: 'Pacific/Guam' }));

  // Format dates in YYYY-MM-DD format in Guam timezone (UTC+10)
  const formatDateForGuam = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(formatDateForGuam(todayInGuam));
  const [endDate, setEndDate] = useState(formatDateForGuam(todayInGuam));
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>(null);
  
  // Time inputs for specific time ranges
  const [startTime, setStartTime] = useState('08:00'); // Default to 8:00 AM
  const [endTime, setEndTime] = useState('23:59');     // Default to 11:59 PM
  const [useTimeFilter, setUseTimeFilter] = useState(true);  // Enable by default for better UX
  
  // Time frame states
  const [timeGranularity, setTimeGranularity] = useState<TimeFrame>('day'); // Default to day view
  const [timePreset, setTimePreset] = useState<TimePreset>('custom'); // Default to custom
  
  // For time-sensitive queries (with time component)
  const [startDateWithTime, setStartDateWithTime] = useState<string | null>(null);
  const [endDateWithTime, setEndDateWithTime] = useState<string | null>(null);

  // Manually changing date => reset preset
  function handleChangeStartDate(value: string) {
    setStartDate(value);
    setSelectedPreset(null);
  }
  function handleChangeEndDate(value: string) {
    setEndDate(value);
    setSelectedPreset(null);
  }
  
  // Handle time input changes
  function handleChangeStartTime(value: string) {
    setStartTime(value);
    setTimePreset('custom');
    setUseTimeFilter(true);
  }
  function handleChangeEndTime(value: string) {
    setEndTime(value);
    setTimePreset('custom');
    setUseTimeFilter(true);
  }
  
  // Toggle time filter
  function toggleTimeFilter(value: boolean) {
    setUseTimeFilter(value);
    if (value) {
      setTimePreset('custom');
    }
  }
  
  // Apply common business hour presets
  function applyBusinessHourPreset(preset: string) {
    setUseTimeFilter(true);
    setTimePreset('custom');
    setSelectedPreset(null);
    
    // Set the same date for both start and end
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    
    // Set time based on preset
    switch(preset) {
      case 'morning':
        setStartTime('08:00');
        setEndTime('12:00');
        break;
      case 'lunch':
        setStartTime('12:00');
        setEndTime('14:00');
        break;
      case 'afternoon':
        setStartTime('14:00');
        setEndTime('17:00');
        break;
      case 'evening':
        setStartTime('17:00');
        setEndTime('21:00');
        break;
      case 'full_day':
        setStartTime('08:00');
        setEndTime('23:59');
        break;
    }
  }

  // Preset date range logic
  function setPresetRange(preset: Exclude<PresetRange, null>) {
    const now = new Date();
    let start = new Date();

    switch (preset) {
      case '1m':
        start.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        start.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        start = new Date('1970-01-01');
        break;
    }
    // Format dates for Guam timezone
    setStartDate(formatDateForGuam(start));
    setEndDate(formatDateForGuam(now));
    setSelectedPreset(preset);
    
    // Reset time preset to custom when using date presets
    setTimePreset('custom');
  }
  
  // Apply time preset logic
  function applyTimePreset(preset: TimePreset) {
    const now = new Date();
    let start = new Date();
    let granularity: TimeFrame = 'day'; // Default granularity
    
    switch (preset) {
      case '30min':
        start = new Date(now.getTime() - 30 * 60 * 1000);
        granularity = '30min';
        break;
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        granularity = '30min';
        break;
      case '3h':
        start = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        granularity = '30min';
        break;
      case '6h':
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        granularity = 'hour';
        break;
      case '12h':
        start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        granularity = 'hour';
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        granularity = 'hour';
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        granularity = 'day';
        break;
      case 'custom':
        // Don't change dates for custom, just update the preset state
        return setTimePreset('custom');
    }
    
    // Update states with dates formatted for Guam timezone
    setStartDate(formatDateForGuam(start));
    setEndDate(formatDateForGuam(now));
    setTimeGranularity(granularity);
    setTimePreset(preset);
    setSelectedPreset(null); // Reset date preset when using time presets
    
    // For hour/minute level presets, we need to include the time component
    if (['30min', '1h', '3h', '6h', '12h', '24h'].includes(preset)) {
      // Format with time component for API, ensuring timezone is preserved
      // Convert to ISO string but adjust for Guam timezone (UTC+10)
      const formatDateTimeForGuam = (date: Date): string => {
        // Create a formatter that explicitly uses Guam timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Pacific/Guam'
        });
        
        const parts = formatter.formatToParts(date);
        const dateParts: Record<string, string> = {};
        
        parts.forEach(part => {
          if (part.type !== 'literal') {
            dateParts[part.type] = part.value;
          }
        });
        
        // Format as YYYY-MM-DDThh:mm:ss
        return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
      };
      
      const startWithTime = formatDateTimeForGuam(start);
      const endWithTime = formatDateTimeForGuam(now);
      
      // Store full datetime for these short timeframes
      setStartDateWithTime(startWithTime);
      setEndDateWithTime(endWithTime);
    } else {
      // Clear time components for longer timeframes
      setStartDateWithTime(null);
      setEndDateWithTime(null);
    }
  }

  // ----- 2) Analytics States -----
  const [ordersData, setOrdersData] = useState<CustomerOrderReport[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderReport[]>([]);
  const [guestOrders, setGuestOrders] = useState<CustomerOrderReport[]>([]);
  const [staffOrders, setStaffOrders] = useState<CustomerOrderReport[]>([]);
  const [staffMembers, setStaffMembers] = useState<Array<{ id: number; name: string; email: string; role: string; }>>([]);
  const [selectedStaffMember, setSelectedStaffMember] = useState<string>('all');

  // ----- Pagination and Search States -----
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [customerSortBy, setCustomerSortBy] = useState<'total_spent' | 'order_count' | 'user_name'>('total_spent');
  const [staffSortBy, setStaffSortBy] = useState<'total_spent' | 'order_count' | 'user_name'>('total_spent');
  const [customerSortDirection, setCustomerSortDirection] = useState<'asc' | 'desc'>('desc');
  const [staffSortDirection, setStaffSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [expandedStaff, setExpandedStaff] = useState<Set<number>>(new Set());
  
  const ITEMS_PER_PAGE = 10;
  
  const [guestSortCol, setGuestSortCol] = useState<SortColumn>('user_name');
  const [guestSortDir, setGuestSortDir] = useState<SortDirection>('asc');
  const [regSortCol, setRegSortCol] = useState<SortColumn>('user_name');
  const [regSortDir, setRegSortDir] = useState<SortDirection>('asc');
  const [staffSortCol, setStaffSortCol] = useState<SortColumn>('user_name');
  const [staffSortDir, setStaffSortDir] = useState<SortDirection>('asc');

  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementRow[]>([]);
  const [userSignups, setUserSignups] = useState<UserSignupItem[]>([]);
  const [activityHeatmap, setActivityHeatmap] = useState<HeatmapDataPoint[]>([]);
  const [dayNames, setDayNames] = useState<string[]>([]);
  
  // VIP Reports States
  const [menuItems, setMenuItems] = useState<MenuItemReport[]>([]);
  const [categories, setCategories] = useState<CategoryReport[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodReportType[]>([]);
  const [paymentTotals, setPaymentTotals] = useState({ amount: 0, count: 0 });
  const [vipCustomers, setVipCustomers] = useState<VipCustomerReportType[]>([]);
  const [vipSummary, setVipSummary] = useState<VipReportSummary>({
    total_vip_customers: 0,
    total_orders: 0,
    total_revenue: 0,
    average_orders_per_vip: 0,
    average_spend_per_vip: 0,
    repeat_customer_rate: 0
  });

  // Refunds Report States
  const [refundSummary, setRefundSummary] = useState<RefundSummary>({
    total_refunds_count: 0,
    total_refund_amount: 0,
    average_refund_amount: 0,
    refund_rate_by_orders: 0,
    refund_rate_by_amount: 0,
    total_orders_in_period: 0,
    total_revenue_in_period: 0
  });
  const [refundsByMethod, setRefundsByMethod] = useState<RefundsByMethod[]>([]);
  const [refundDailyTrends, setRefundDailyTrends] = useState<RefundDailyTrend[]>([]);
  const [refundDetails, setRefundDetails] = useState<RefundDetail[]>([]);

  // ----- 3) Derived: Guest vs Registered vs Staff -----
  const guestRows = useMemo(() => {
    return sortReports(guestOrders, guestSortCol, guestSortDir);
  }, [guestOrders, guestSortCol, guestSortDir]);

  const registeredRows = useMemo(() => {
    return sortReports(customerOrders, regSortCol, regSortDir);
  }, [customerOrders, regSortCol, regSortDir]);

  const staffRows = useMemo(() => {
    return sortReports(staffOrders, staffSortCol, staffSortDir);
  }, [staffOrders, staffSortCol, staffSortDir]);

  // ----- 4) Load Analytics -----
  async function loadAnalytics() {
    try {
      let apiStartDate: string;
      let apiEndDate: string;
      
      // Determine which date format to use based on filters
      if (['30min', '1h', '3h', '6h', '12h', '24h'].includes(timePreset)) {
        // For short time presets, use the datetime with time component
        // These already have the correct Guam timezone formatting from applyTimePreset
        apiStartDate = startDateWithTime || startDate;
        apiEndDate = endDateWithTime || endDate;
      } else if (useTimeFilter) {
        // For custom time filter, combine date and time with explicit Guam timezone indicator
        // This ensures the backend knows we're sending Guam time
        apiStartDate = `${startDate}T${startTime}:00+10:00`;
        apiEndDate = `${endDate}T${endTime}:00+10:00`;
      } else {
        // Otherwise use just the date - these are already formatted for Guam
        apiStartDate = startDate;
        apiEndDate = endDate;
      }
      
      // 1) Customer Orders with staff filtering
      const custRes = await getCustomerOrdersReport(apiStartDate, apiEndDate, selectedStaffMember === 'all' ? null : selectedStaffMember);
      
      // Set the separate order types
      setCustomerOrders(custRes.customer_orders || []);
      setGuestOrders(custRes.guest_orders || []);
      setStaffOrders(custRes.staff_orders || []);
      
      // Keep the legacy combined data for backward compatibility
      setOrdersData(custRes.results || []);

      // 2) Revenue Trend with selected time granularity
      const revTrend = await getRevenueTrend(timeGranularity, apiStartDate, apiEndDate);
      setRevenueTrend(revTrend.data || []);



      // 4) Income Statement => by year
      const incRes = await getIncomeStatement(year);
      setIncomeStatement(incRes.income_statement || []);

      // 5) User Signups => by day
      const signupsRes = await getUserSignups(apiStartDate, apiEndDate);
      setUserSignups(signupsRes.signups || []);

      // 6) User Activity Heatmap
      const heatmapRes = await getUserActivityHeatmap(apiStartDate, apiEndDate);
      setActivityHeatmap(heatmapRes.heatmap || []);
      setDayNames(heatmapRes.day_names || []);
      
      // 7) Menu Item Performance Report
      const menuItemRes = await getMenuItemReport(apiStartDate, apiEndDate);
      setMenuItems(menuItemRes.data.items || []);
      setCategories(menuItemRes.data.categories || []);
      
      // 8) Payment Method Report
      const paymentMethodRes = await getPaymentMethodReport(apiStartDate, apiEndDate);
      setPaymentMethods(paymentMethodRes.data.payment_methods || []);
      setPaymentTotals({
        amount: paymentMethodRes.data.total_amount || 0,
        count: paymentMethodRes.data.total_count || 0
      });
      
      // 9) VIP Customer Report
      const vipRes = await getVipCustomerReport(apiStartDate, apiEndDate);
      setVipCustomers(vipRes.data.vip_customers || []);
      setVipSummary(vipRes.data.summary || {
        total_vip_customers: 0,
        total_orders: 0,
        total_revenue: 0,
        average_orders_per_vip: 0,
        average_spend_per_vip: 0,
        repeat_customer_rate: 0
      });

      // 10) Refunds Report
      const refundsRes = await getRefundsReport(apiStartDate, apiEndDate);
      setRefundSummary(refundsRes.data.summary || {
        total_refunds_count: 0,
        total_refund_amount: 0,
        average_refund_amount: 0,
        refund_rate_by_orders: 0,
        refund_rate_by_amount: 0,
        total_orders_in_period: 0,
        total_revenue_in_period: 0
      });
      setRefundsByMethod(refundsRes.data.refunds_by_method || []);
      setRefundDailyTrends(refundsRes.data.daily_trends || []);
      setRefundDetails(refundsRes.data.refund_details || []);

    } catch (err) {
      console.error('Failed to load analytics:', err);
      alert('Failed to load analytics. Check console for details.');
    }
  }

  // Load staff users for filtering
  async function loadStaffUsers() {
    try {
      const staffRes = await getStaffUsers();
      setStaffMembers(staffRes.staff_users || []);
    } catch (err) {
      console.error('Failed to load staff users:', err);
      // Don't show alert for this as it's not critical
    }
  }

  // ----- 5) On Mount: Load default data -----
  React.useEffect(() => {
    // On first mount, fetch with the default date range and load staff users
    loadAnalytics();
    loadStaffUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload analytics when staff member filter changes
  React.useEffect(() => {
    if (staffMembers.length > 0) {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffMember]);

  // ----- Helper Functions for Filtering and Pagination -----
  
  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    const allCustomers = [...registeredRows, ...guestRows];
    
    // Filter by search term
    const filtered = allCustomers.filter(customer =>
      customer.user_name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );
    
    // Sort
    const sorted = filtered.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      
      switch (customerSortBy) {
        case 'user_name':
          aVal = a.user_name.toLowerCase();
          bVal = b.user_name.toLowerCase();
          break;
        case 'total_spent':
          aVal = a.total_spent;
          bVal = b.total_spent;
          break;
        case 'order_count':
          aVal = a.order_count;
          bVal = b.order_count;
          break;
        default:
          aVal = a.total_spent;
          bVal = b.total_spent;
      }
      
      if (customerSortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  }, [registeredRows, guestRows, customerSearchTerm, customerSortBy, customerSortDirection]);

  // Filter and sort staff
  const filteredAndSortedStaff = useMemo(() => {
    // Filter by search term
    const filtered = staffRows.filter(staff =>
      staff.user_name.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
      (staff.staff_order_details?.employee_name || '').toLowerCase().includes(staffSearchTerm.toLowerCase())
    );
    
    // Sort
    const sorted = filtered.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      
      switch (staffSortBy) {
        case 'user_name':
          aVal = a.user_name.toLowerCase();
          bVal = b.user_name.toLowerCase();
          break;
        case 'total_spent':
          aVal = a.total_spent;
          bVal = b.total_spent;
          break;
        case 'order_count':
          aVal = a.order_count;
          bVal = b.order_count;
          break;
        default:
          aVal = a.total_spent;
          bVal = b.total_spent;
      }
      
      if (staffSortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  }, [staffRows, staffSearchTerm, staffSortBy, staffSortDirection]);

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (customerPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedCustomers, customerPage]);

  // Paginated staff
  const paginatedStaff = useMemo(() => {
    const startIndex = (staffPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedStaff.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedStaff, staffPage]);

  // Calculate total pages
  const totalCustomerPages = Math.ceil(filteredAndSortedCustomers.length / ITEMS_PER_PAGE);
  const totalStaffPages = Math.ceil(filteredAndSortedStaff.length / ITEMS_PER_PAGE);

  // Toggle expanded state
  const toggleCustomerExpanded = (index: number) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCustomers(newExpanded);
  };

  const toggleStaffExpanded = (index: number) => {
    const newExpanded = new Set(expandedStaff);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedStaff(newExpanded);
  };

  // Reset pagination when search changes
  React.useEffect(() => {
    setCustomerPage(1);
  }, [customerSearchTerm, customerSortBy, customerSortDirection]);

  React.useEffect(() => {
    setStaffPage(1);
  }, [staffSearchTerm, staffSortBy, staffSortDirection]);

  // ----- 6) Export Functions -----
  
  // Export only customer orders (guests + registered)
  function exportCustomerOrdersToExcel() {
    const hasCustomerData = guestRows.length > 0 || registeredRows.length > 0;
    
    if (!hasCustomerData) {
      alert('No customer orders to export');
      return;
    }

    // Guest Orders Summary
    const guestSummary = guestRows.map((r) => ({
      Customer: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
    }));

    // Registered Users Summary  
    const regSummary = registeredRows.map((r) => ({
      Customer: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
    }));

    // Customer Details
    const customerDetails: Array<Record<string, any>> = [];
    
    guestRows.forEach((r) => {
      r.items.forEach((itm) => {
        const customizationsText = itm.customizations 
          ? formatCustomizationsForDisplay(itm.customizations)
          : '';
          
        customerDetails.push({
          Customer: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
          'Customizations': customizationsText,
          'Order Type': 'Guest',
        });
      });
    });

    registeredRows.forEach((r) => {
      r.items.forEach((itm) => {
        const customizationsText = itm.customizations 
          ? formatCustomizationsForDisplay(itm.customizations)
          : '';
          
        customerDetails.push({
          Customer: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
          'Customizations': customizationsText,
          'Order Type': 'Registered Customer',
        });
      });
    });

    // Construct workbook
    const wb = XLSX.utils.book_new();

    // Add Guest Orders sheet
    if (guestSummary.length > 0) {
      const guestSheet = XLSX.utils.json_to_sheet(guestSummary);
      XLSX.utils.book_append_sheet(wb, guestSheet, 'Guest Orders');
    }

    // Add Registered Users sheet
    if (regSummary.length > 0) {
      const regSheet = XLSX.utils.json_to_sheet(regSummary);
      XLSX.utils.book_append_sheet(wb, regSheet, 'Registered Customers');
    }

    // Add customer details sheet
    if (customerDetails.length > 0) {
      const detailsSheet = XLSX.utils.json_to_sheet(customerDetails);
      XLSX.utils.book_append_sheet(wb, detailsSheet, 'Customer Order Details');
    }

    // Include time in filename if time filter is enabled
    const filename = useTimeFilter
      ? `CustomerOrders_${startDate}T${startTime}_to_${endDate}T${endTime}.xlsx`
      : `CustomerOrders_${startDate}_to_${endDate}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  }

  // Export only staff orders
  function exportStaffOrdersToExcel() {
    if (staffRows.length === 0) {
      alert('No staff orders to export');
      return;
    }

    // Staff Orders Summary
    const staffSummary = staffRows.map((r) => ({
      Employee: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
      'Employee Name': r.staff_order_details?.employee_name || 'Unknown',
      'Employee Email': r.staff_order_details?.employee_email || 'No email',
      'Total Employee Orders': r.staff_order_details?.total_orders_for_staff || 0,
      'Avg Order Value': r.staff_order_details?.average_order_value || 0,
    }));

    // Staff Details
    const staffDetails: Array<Record<string, any>> = [];
    staffRows.forEach((r) => {
      r.items.forEach((itm) => {
        const customizationsText = itm.customizations 
          ? formatCustomizationsForDisplay(itm.customizations)
          : '';
          
        staffDetails.push({
          Employee: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
          'Customizations': customizationsText,
          'Order Type': 'Staff',
          'Employee Name': r.staff_order_details?.employee_name || 'Unknown',
          'Employee Email': r.staff_order_details?.employee_email || 'No email',
        });
      });
    });

    // Construct workbook
    const wb = XLSX.utils.book_new();

    // Add Staff Orders sheet
    const staffSheet = XLSX.utils.json_to_sheet(staffSummary);
    XLSX.utils.book_append_sheet(wb, staffSheet, 'Staff Orders Summary');

    // Add Staff Details sheet
    if (staffDetails.length > 0) {
      const detailsSheet = XLSX.utils.json_to_sheet(staffDetails);
      XLSX.utils.book_append_sheet(wb, detailsSheet, 'Staff Order Details');
    }

    // Include time in filename if time filter is enabled
    const filename = useTimeFilter
      ? `StaffOrders_${startDate}T${startTime}_to_${endDate}T${endTime}.xlsx`
      : `StaffOrders_${startDate}_to_${endDate}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  }

  // Export all orders (customers + staff)
  function exportOrdersToExcel() {
    const hasData = guestRows.length > 0 || registeredRows.length > 0 || staffRows.length > 0;
    
    if (!hasData) {
      alert('No data to export');
      return;
    }

    // Guest Orders Summary
    const guestSummary = guestRows.map((r) => ({
      Customer: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
    }));

    // Registered Users Summary  
    const regSummary = registeredRows.map((r) => ({
      Customer: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
    }));

    // Staff Orders Summary
    const staffSummary = staffRows.map((r) => ({
      Employee: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
      'Employee Name': r.staff_order_details?.employee_name || 'Unknown',
      'Employee Email': r.staff_order_details?.employee_email || 'No email',
      'Total Employee Orders': r.staff_order_details?.total_orders_for_staff || 0,
      'Avg Order Value': r.staff_order_details?.average_order_value || 0,
    }));

    // Details
    const guestDetails: Array<Record<string, any>> = [];
    guestRows.forEach((r) => {
      r.items.forEach((itm) => {
        const customizationsText = itm.customizations 
          ? formatCustomizationsForDisplay(itm.customizations)
          : '';
          
        guestDetails.push({
          Customer: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
          'Customizations': customizationsText,
          'Order Type': 'Guest',
        });
      });
    });

    const regDetails: Array<Record<string, any>> = [];
    registeredRows.forEach((r) => {
      r.items.forEach((itm) => {
        const customizationsText = itm.customizations 
          ? formatCustomizationsForDisplay(itm.customizations)
          : '';
          
        regDetails.push({
          Customer: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
          'Customizations': customizationsText,
          'Order Type': 'Registered Customer',
        });
      });
    });

    const staffDetails: Array<Record<string, any>> = [];
    staffRows.forEach((r) => {
      r.items.forEach((itm) => {
        const customizationsText = itm.customizations 
          ? formatCustomizationsForDisplay(itm.customizations)
          : '';
          
        staffDetails.push({
          Employee: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
          'Customizations': customizationsText,
          'Order Type': 'Staff',
          'Employee Name': r.staff_order_details?.employee_name || 'Unknown',
        });
      });
    });

    // Construct workbook
    const wb = XLSX.utils.book_new();

    // Add Guest Orders sheet
    if (guestSummary.length > 0) {
      const guestSheet = XLSX.utils.json_to_sheet(guestSummary);
      XLSX.utils.book_append_sheet(wb, guestSheet, 'Guest Orders');
    }

    // Add Registered Users sheet
    if (regSummary.length > 0) {
      const regSheet = XLSX.utils.json_to_sheet(regSummary);
      XLSX.utils.book_append_sheet(wb, regSheet, 'Registered Customers');
    }

    // Add Staff Orders sheet
    if (staffSummary.length > 0) {
      const staffSheet = XLSX.utils.json_to_sheet(staffSummary);
      XLSX.utils.book_append_sheet(wb, staffSheet, 'Staff Orders');
    }

    // Add combined details sheet
    const allDetails: any[] = [];
    if (guestDetails.length > 0) {
      allDetails.push({ Customer: '=== GUEST ORDERS ===', 'Item Name': '', Quantity: '', 'Order Type': '' });
      allDetails.push(...guestDetails);
      allDetails.push({});
    }
    if (regDetails.length > 0) {
      allDetails.push({ Customer: '=== REGISTERED CUSTOMER ORDERS ===', 'Item Name': '', Quantity: '', 'Order Type': '' });
      allDetails.push(...regDetails);
      allDetails.push({});
    }
    if (staffDetails.length > 0) {
      allDetails.push({ Employee: '=== STAFF ORDERS ===', 'Item Name': '', Quantity: '', 'Order Type': '' });
      allDetails.push(...staffDetails);
    }

    if (allDetails.length > 0) {
      const detailsSheet = XLSX.utils.json_to_sheet(allDetails);
      XLSX.utils.book_append_sheet(wb, detailsSheet, 'Order Details');
    }

    // Include time in filename if time filter is enabled
    const filename = useTimeFilter
      ? `AllOrders_${startDate}T${startTime}_to_${endDate}T${endTime}.xlsx`
      : `AllOrders_${startDate}_to_${endDate}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  }

  // Export all reports to a single Excel file
  function exportAllReports() {
    // Check if we have data to export
    const hasData = guestRows.length > 0 ||
                   registeredRows.length > 0 ||
                   staffRows.length > 0 ||
                   revenueTrend.length > 0 ||
                   incomeStatement.length > 0 ||
                   userSignups.length > 0 ||
                   menuItems.length > 0 ||
                   paymentMethods.length > 0 ||
                   vipCustomers.length > 0 ||
                   refundDetails.length > 0;
    
    if (!hasData) {
      alert('No data to export');
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add customer orders data
    const hasOrderData = guestRows.length > 0 || registeredRows.length > 0 || staffRows.length > 0;
    if (hasOrderData) {
      // Guest Orders Summary
      if (guestRows.length > 0) {
        const guestSummary = guestRows.map((r) => ({
          Customer: r.user_name,
          'Total Spent': r.total_spent,
          'Order Count': r.order_count,
          'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
        }));
        const guestSheet = XLSX.utils.json_to_sheet(guestSummary);
        XLSX.utils.book_append_sheet(wb, guestSheet, 'Guest Orders');
      }

      // Registered Users Summary
      if (registeredRows.length > 0) {
        const regSummary = registeredRows.map((r) => ({
          Customer: r.user_name,
          'Total Spent': r.total_spent,
          'Order Count': r.order_count,
          'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
        }));
        const regSheet = XLSX.utils.json_to_sheet(regSummary);
        XLSX.utils.book_append_sheet(wb, regSheet, 'Registered Customers');
      }

      // Staff Orders Summary
      if (staffRows.length > 0) {
        const staffSummary = staffRows.map((r) => ({
          Employee: r.user_name,
          'Total Spent': r.total_spent,
          'Order Count': r.order_count,
          'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
          'Employee Name': r.staff_order_details?.employee_name || 'Unknown',
          'Employee Email': r.staff_order_details?.employee_email || 'No email',
          'Total Employee Orders': r.staff_order_details?.total_orders_for_staff || 0,
          'Avg Order Value': r.staff_order_details?.average_order_value || 0,
        }));
        const staffSheet = XLSX.utils.json_to_sheet(staffSummary);
        XLSX.utils.book_append_sheet(wb, staffSheet, 'Staff Orders');
      }

      // Combined details
      const allDetails: any[] = [];
      
            if (guestRows.length > 0) {
        allDetails.push({ Customer: '=== GUEST ORDERS ===', 'Item Name': '', Quantity: '', 'Customizations': '', 'Order Type': '' });
        guestRows.forEach((r) => {
          r.items.forEach((itm) => {
            const customizationsText = itm.customizations 
              ? formatCustomizationsForDisplay(itm.customizations)
              : '';
              
            allDetails.push({
              Customer: r.user_name,
              'Item Name': itm.name,
              Quantity: itm.quantity,
              'Customizations': customizationsText,
              'Order Type': 'Guest',
            });
          });
        });
        allDetails.push({});
      }
      
      if (registeredRows.length > 0) {
        allDetails.push({ Customer: '=== REGISTERED CUSTOMER ORDERS ===', 'Item Name': '', Quantity: '', 'Customizations': '', 'Order Type': '' });
        registeredRows.forEach((r) => {
          r.items.forEach((itm) => {
            const customizationsText = itm.customizations 
              ? formatCustomizationsForDisplay(itm.customizations)
              : '';
              
            allDetails.push({
              Customer: r.user_name,
              'Item Name': itm.name,
              Quantity: itm.quantity,
              'Customizations': customizationsText,
              'Order Type': 'Registered Customer',
            });
          });
        });
        allDetails.push({});
      }
      
      if (staffRows.length > 0) {
        allDetails.push({ Employee: '=== STAFF ORDERS ===', 'Item Name': '', Quantity: '', 'Customizations': '', 'Order Type': '' });
        staffRows.forEach((r) => {
          r.items.forEach((itm) => {
            const customizationsText = itm.customizations 
              ? formatCustomizationsForDisplay(itm.customizations)
              : '';
              
            allDetails.push({
              Employee: r.user_name,
              'Item Name': itm.name,
              Quantity: itm.quantity,
              'Customizations': customizationsText,
              'Order Type': 'Staff',
              'Employee Name': r.staff_order_details?.employee_name || 'Unknown',
            });
          });
        });
      }

      if (allDetails.length > 0) {
        const detailsSheet = XLSX.utils.json_to_sheet(allDetails);
        XLSX.utils.book_append_sheet(wb, detailsSheet, 'All Order Details');
      }
    }

    // Add revenue trend data
    if (revenueTrend.length > 0) {
      const revenueData = revenueTrend.map(item => ({
        'Date': item.label,
        'Revenue': `$${item.revenue.toFixed(2)}`
      }));
      const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, revenueSheet, 'Revenue Trend');
    }



    // Add income statement data
    if (incomeStatement.length > 0) {
      const incomeData = incomeStatement.map(row => ({
        'Month': row.month,
        'Revenue': `$${row.revenue.toFixed(2)}`
      }));
      const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
      XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income Statement');
    }

    // Add user signups data
    if (userSignups.length > 0) {
      const signupsData = userSignups.map(item => ({
        'Date': item.date,
        'New Users': item.count
      }));
      const signupsSheet = XLSX.utils.json_to_sheet(signupsData);
      XLSX.utils.book_append_sheet(wb, signupsSheet, 'User Signups');
    }

    // Add menu items data
    if (menuItems.length > 0) {
      // Format menu item data
      const itemData = menuItems.map(item => ({
        'Item': item.name,
        'Category': item.category,
        'Quantity Sold': item.quantity_sold,
        'Revenue': `$${Number(item.revenue).toFixed(2)}`,
        'Avg. Price': `$${item.average_price ? Number(item.average_price).toFixed(2) : '0.00'}`
      }));

      // Format category data
      const categoryData = categories.map(cat => ({
        'Category': cat.name,
        'Items Sold': cat.quantity_sold,
        'Revenue': `$${Number(cat.revenue).toFixed(2)}`
      }));

      // Add menu items sheet
      const itemSheet = XLSX.utils.json_to_sheet(itemData);
      XLSX.utils.book_append_sheet(wb, itemSheet, 'Menu Items');

      // Add categories sheet
      const catSheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');
    }

    // Add payment methods data
    if (paymentMethods.length > 0) {
      // Format payment method data
      const paymentData = paymentMethods
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .map(method => ({
          'Payment Method': method.payment_method
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          'Count': method.count,
          'Amount': `$${Number(method.amount).toFixed(2)}`,
          'Percentage': `${Number(method.percentage).toFixed(2)}%`
        }));

      // Add total row
      paymentData.push({
        'Payment Method': 'Total',
        'Count': paymentTotals.count,
        'Amount': `$${Number(paymentTotals.amount).toFixed(2)}`,
        'Percentage': '100%'
      });

      // Add payment methods sheet
      const paymentSheet = XLSX.utils.json_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(wb, paymentSheet, 'Payment Methods');
    }

    // Add VIP customers data
    if (vipCustomers.length > 0) {
      // Format summary data
      const summaryData = [
        { 'Metric': 'Total VIP Customers', 'Value': vipSummary.total_vip_customers },
        { 'Metric': 'Total Orders', 'Value': vipSummary.total_orders },
        { 'Metric': 'Total Revenue', 'Value': `$${Number(vipSummary.total_revenue).toFixed(2)}` },
        { 'Metric': 'Average Orders per VIP', 'Value': Number(vipSummary.average_orders_per_vip).toFixed(1) },
        { 'Metric': 'Average Spend per VIP', 'Value': `$${Number(vipSummary.average_spend_per_vip).toFixed(2)}` },
        { 'Metric': 'Repeat Customer Rate', 'Value': `${(Number(vipSummary.repeat_customer_rate) * 100).toFixed(0)}%` }
      ];

      // Format customer data
      const customerData = vipCustomers.map(customer => {
        // Get top 3 items
        const topItems = customer.items
          .sort((a, b) => Number(b.quantity) - Number(a.quantity))
          .slice(0, 3)
          .map(item => `${item.name} (${item.quantity})`)
          .join(', ');

        return {
          'Customer': customer.user_name,
          'Email': customer.email,
          'Total Spent': `$${Number(customer.total_spent).toFixed(2)}`,
          'Orders': Number(customer.order_count),
          'Avg. Order Value': `$${Number(customer.average_order_value).toFixed(2)}`,
          'First Order': new Date(customer.first_order_date).toLocaleDateString(),
          'Most Ordered Items': topItems
        };
      });

      // Add VIP summary sheet
      const vipSummarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, vipSummarySheet, 'VIP Summary');

      // Add VIP customers sheet
      const vipCustomerSheet = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, vipCustomerSheet, 'VIP Customers');
    }

    // Add refunds data
    if (refundDetails.length > 0) {
      // Format refunds summary data
      const refundsSummaryData = [
        { 'Metric': 'Total Refunds Count', 'Value': refundSummary.total_refunds_count },
        { 'Metric': 'Total Refund Amount', 'Value': `$${Number(refundSummary.total_refund_amount).toFixed(2)}` },
        { 'Metric': 'Average Refund Amount', 'Value': `$${Number(refundSummary.average_refund_amount).toFixed(2)}` },
        { 'Metric': 'Refund Rate by Orders', 'Value': `${Number(refundSummary.refund_rate_by_orders).toFixed(2)}%` },
        { 'Metric': 'Refund Rate by Amount', 'Value': `${Number(refundSummary.refund_rate_by_amount).toFixed(2)}%` },
        { 'Metric': 'Total Orders in Period', 'Value': refundSummary.total_orders_in_period },
        { 'Metric': 'Total Revenue in Period', 'Value': `$${Number(refundSummary.total_revenue_in_period).toFixed(2)}` }
      ];

      // Format refund details data
      const refundsDetailData = refundDetails.map(refund => ({
        'Order Number': refund.order_number,
        'Customer': refund.customer_name || 'N/A',
        'Customer Email': refund.customer_email || 'N/A',
        'Refund Date': new Date(refund.created_at).toLocaleDateString(),
        'Refund Amount': `$${Number(refund.amount).toFixed(2)}`,
        'Original Order Total': `$${Number(refund.original_order_total).toFixed(2)}`,
        'Payment Method': refund.payment_method.replace(/_/g, ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        'Status': refund.status,
        'Description': refund.description || 'N/A'
      }));

      // Format refunds by method data
      const refundsByMethodData = refundsByMethod.map(method => ({
        'Payment Method': method.payment_method.replace(/_/g, ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        'Count': method.count,
        'Total Amount': `$${Number(method.amount).toFixed(2)}`,
        'Percentage': `${Number(method.percentage).toFixed(2)}%`
      }));

      // Add refunds summary sheet
      const refundsSummarySheet = XLSX.utils.json_to_sheet(refundsSummaryData);
      XLSX.utils.book_append_sheet(wb, refundsSummarySheet, 'Refunds Summary');

      // Add refund details sheet
      const refundsDetailSheet = XLSX.utils.json_to_sheet(refundsDetailData);
      XLSX.utils.book_append_sheet(wb, refundsDetailSheet, 'Refund Details');

      // Add refunds by method sheet
      const refundsByMethodSheet = XLSX.utils.json_to_sheet(refundsByMethodData);
      XLSX.utils.book_append_sheet(wb, refundsByMethodSheet, 'Refunds by Method');
    }

    // Write file
    // Include time in filename if time filter is enabled
    const filename = useTimeFilter
      ? `Hafaloha_Reports_${startDate}T${startTime}_to_${endDate}T${endTime}.xlsx`
      : `Hafaloha_Reports_${startDate}_to_${endDate}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  }

  // ----- 7) Render -----
  return (
    <div className="p-2 sm:p-4">
      {/* Header section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-600 mt-1">View and analyze customer data and sales trends</p>
      </div>

      {/* 
        ============================================
        (A) Analytics Controls - Clean & Intuitive
        ============================================
      */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Analytics Date Range</h3>
            <p className="text-gray-600 text-sm mt-1">Select time period and filters for your analytics reports</p>
          </div>
        </div>

        {/* Quick Range Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Time Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <button
              onClick={() => applyTimePreset('30min')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '30min' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Min
            </button>
            <button
              onClick={() => applyTimePreset('1h')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '1h' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1 Hour
            </button>
            <button
              onClick={() => applyTimePreset('3h')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '3h' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              3 Hours
            </button>
            <button
              onClick={() => applyTimePreset('6h')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '6h' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              6 Hours
            </button>
            <button
              onClick={() => applyTimePreset('12h')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '12h' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              12 Hours
            </button>
            <button
              onClick={() => applyTimePreset('24h')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '24h' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => applyTimePreset('7d')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timePreset === '7d' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>

        {/* Period Range Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Extended Periods
          </label>
          <div className="flex flex-wrap gap-2">
            {( ['1m','3m','6m','1y','all'] as const ).map((preset) => {
              const isSelected = selectedPreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setPresetRange(preset)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset === '1m' && 'Last Month'}
                  {preset === '3m' && 'Last 3 Months'}
                  {preset === '6m' && 'Last 6 Months'}
                  {preset === '1y' && 'Last Year'}
                  {preset === 'all' && 'All Time'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Time Controls */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="timeFilter"
              checked={useTimeFilter}
              onChange={(e) => toggleTimeFilter(e.target.checked)}
              className="h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
            />
            <label htmlFor="timeFilter" className="ml-2 text-sm font-medium text-gray-700">
              Enable specific time range filter
            </label>
          </div>
          
          {/* Business Hours Presets - only show when time filter is enabled */}
          {useTimeFilter && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Common Business Hours</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyBusinessHourPreset('morning')}
                  className="px-3 py-1 bg-white text-gray-700 text-sm rounded border hover:bg-gray-100 transition-colors"
                >
                  Morning (8am-12pm)
                </button>
                <button
                  onClick={() => applyBusinessHourPreset('lunch')}
                  className="px-3 py-1 bg-white text-gray-700 text-sm rounded border hover:bg-gray-100 transition-colors"
                >
                  Lunch (12pm-2pm)
                </button>
                <button
                  onClick={() => applyBusinessHourPreset('afternoon')}
                  className="px-3 py-1 bg-white text-gray-700 text-sm rounded border hover:bg-gray-100 transition-colors"
                >
                  Afternoon (2pm-5pm)
                </button>
                <button
                  onClick={() => applyBusinessHourPreset('evening')}
                  className="px-3 py-1 bg-white text-gray-700 text-sm rounded border hover:bg-gray-100 transition-colors"
                >
                  Evening (5pm-9pm)
                </button>
                <button
                  onClick={() => applyBusinessHourPreset('full_day')}
                  className="px-3 py-1 bg-white text-gray-700 text-sm rounded border hover:bg-gray-100 transition-colors"
                >
                  Full Day (8am-12am)
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Start Date and Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date {useTimeFilter ? '& Time' : ''}
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  handleChangeStartDate(e.target.value);
                  setTimePreset('custom');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {useTimeFilter && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleChangeStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              )}
            </div>
          </div>

          {/* End Date and Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date {useTimeFilter ? '& Time' : ''}
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  handleChangeEndDate(e.target.value);
                  setTimePreset('custom');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {useTimeFilter && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleChangeEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              )}
            </div>
          </div>
          
          {/* Data Granularity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Granularity
            </label>
            <select
              value={timeGranularity}
              onChange={(e) => setTimeGranularity(e.target.value as TimeFrame)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="30min">30 Minutes</option>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>



        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadAnalytics}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Load Analytics
          </button>
          
          {/* Export button - only show if we have data */}
          {(guestRows.length > 0 ||
            registeredRows.length > 0 ||
            staffRows.length > 0 ||
            revenueTrend.length > 0 ||
            incomeStatement.length > 0 ||
            userSignups.length > 0 ||
            menuItems.length > 0 ||
            paymentMethods.length > 0 ||
            vipCustomers.length > 0 ||
            refundDetails.length > 0) && (
            <button
              onClick={exportAllReports}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
              title="Export comprehensive analytics report with all charts and data"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export All Analytics
            </button>
          )}
        </div>
      </div>

      {/* 
        ============================================
        (B) Customer Orders - Simplified Design
        ============================================
      */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Customer Orders</h3>
            <p className="text-gray-600 text-sm mt-1">
              {filteredAndSortedCustomers.length} customers • {registeredRows.length} registered • {guestRows.length} guests
            </p>
          </div>

          {/* Export buttons if data is present */}
          {(guestRows.length > 0 || registeredRows.length > 0) && (
            <button
              onClick={exportCustomerOrdersToExcel}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Customers
            </button>
          )}
        </div>

        {/* Search and Sort Controls */}
        {filteredAndSortedCustomers.length > 0 && (
          <div className="flex gap-4 items-center mb-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sort Controls */}
            <select
              value={customerSortBy}
              onChange={(e) => setCustomerSortBy(e.target.value as 'total_spent' | 'order_count' | 'user_name')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="total_spent">Sort by Spending</option>
              <option value="order_count">Sort by Orders</option>
              <option value="user_name">Sort by Name</option>
            </select>
          </div>
        )}

        {/* Customer Orders List */}
        {paginatedCustomers.length > 0 && (
          <div className="space-y-2">
            {paginatedCustomers.map((customer, index) => {
              const actualIndex = (customerPage - 1) * ITEMS_PER_PAGE + index;
              const isExpanded = expandedCustomers.has(actualIndex);
              const isRegistered = registeredRows.includes(customer);
              
              return (
                <div key={`customer-${actualIndex}`} className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  {/* Customer Summary Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          isRegistered ? 'bg-blue-500' : 'bg-amber-500'
                        }`}>
                          {actualIndex + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{customer.user_name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>{isRegistered ? 'Registered' : 'Guest'}</span>
                            <span>•</span>
                            <span>{customer.order_count} order{customer.order_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ${customer.total_spent.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCustomerExpanded(actualIndex)}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                        >
                          <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <div className="pt-3">
                        <h4 className="text-sm font-medium mb-2 text-gray-700">Items Ordered:</h4>
                        <div className="space-y-1 text-sm">
                          {customer.items.map((item, itemIndex) => (
                            <div key={itemIndex}>
                              {renderItemWithCustomizations(item, 'text-gray-600')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Customer Pagination */}
        {totalCustomerPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <button
              onClick={() => setCustomerPage(Math.max(1, customerPage - 1))}
              disabled={customerPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalCustomerPages) }, (_, i) => {
                let pageNum;
                if (totalCustomerPages <= 5) {
                  pageNum = i + 1;
                } else if (customerPage <= 3) {
                  pageNum = i + 1;
                } else if (customerPage >= totalCustomerPages - 2) {
                  pageNum = totalCustomerPages - 4 + i;
                } else {
                  pageNum = customerPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCustomerPage(pageNum)}
                    className={`px-3 py-2 border rounded-lg ${
                      customerPage === pageNum
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCustomerPage(Math.min(totalCustomerPages, customerPage + 1))}
              disabled={customerPage === totalCustomerPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        )}

        {/* No customer orders message */}
        {(guestRows.length === 0 && registeredRows.length === 0) && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">📊</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Customer Orders</h4>
            <p className="text-gray-500">No customer orders found for the selected time range.</p>
          </div>
        )}
      </div>

      {/* 
        ============================================
        (C) Staff Orders - Simplified Design
        ============================================
      */}
      {(staffRows.length > 0 || staffMembers.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Staff Orders</h3>
              <p className="text-gray-600 text-sm mt-1">
                {filteredAndSortedStaff.length} staff orders
                {selectedStaffMember !== 'all' && staffMembers.length > 0 && (
                  <span className="ml-2 text-green-600">
                    • Filtered by: {staffMembers.find(s => s.id.toString() === selectedStaffMember)?.name}
                  </span>
                )}
              </p>
            </div>

            {filteredAndSortedStaff.length > 0 && (
              <button
                onClick={exportStaffOrdersToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Export Staff
              </button>
            )}
          </div>

          {/* Staff Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Staff Member
            </label>
            <select
              value={selectedStaffMember}
              onChange={(e) => setSelectedStaffMember(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Staff Members</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id.toString()}>
                  {staff.name} ({staff.email || 'No email'})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Filter staff orders by specific employee.
            </p>
          </div>

          {/* Staff Search and Sort Controls */}
          {filteredAndSortedStaff.length > 0 && (
            <div className="flex gap-4 items-center mb-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search staff members..."
                  value={staffSearchTerm}
                  onChange={(e) => setStaffSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Sort Controls */}
              <select
                value={staffSortBy}
                onChange={(e) => setStaffSortBy(e.target.value as 'total_spent' | 'order_count' | 'user_name')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="total_spent">Sort by Spending</option>
                <option value="order_count">Sort by Orders</option>
                <option value="user_name">Sort by Name</option>
              </select>
            </div>
          )}

          {/* Staff Orders List or Empty State */}
          {paginatedStaff.length > 0 ? (
            <div className="space-y-2">
              {paginatedStaff.map((staff, index) => {
                const actualIndex = (staffPage - 1) * ITEMS_PER_PAGE + index;
                const isExpanded = expandedStaff.has(actualIndex);
                
                return (
                  <div key={`staff-${actualIndex}`} className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    {/* Staff Summary Row */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {actualIndex + 1}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{staff.user_name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>Staff</span>
                              {staff.staff_order_details && (
                                <>
                                  <span>•</span>
                                  <span>{staff.staff_order_details.employee_name || 'Unknown Employee'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              ${staff.total_spent.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {staff.order_count} order{staff.order_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleStaffExpanded(actualIndex)}
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                          >
                            <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="pt-3">
                          {/* Employee Stats */}
                          {staff.staff_order_details && (
                            <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 rounded-md p-3">
                              <div>
                                <div className="text-sm text-gray-600">Total Employee Orders</div>
                                <div className="font-semibold text-gray-900">{staff.staff_order_details.total_orders_for_staff}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Average Order Value</div>
                                <div className="font-semibold text-gray-900">${staff.staff_order_details.average_order_value.toFixed(2)}</div>
                              </div>
                            </div>
                          )}

                          {/* Items Ordered */}
                          <div>
                            <h4 className="text-sm font-medium mb-2 text-gray-700">Items Ordered:</h4>
                            <div className="space-y-1 text-sm">
                              {staff.items.map((item, itemIndex) => (
                                <div key={itemIndex}>
                                  {renderItemWithCustomizations(item, 'text-gray-600')}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium">No staff orders found</p>
              <p className="text-gray-400 text-sm mt-1">
                {selectedStaffMember !== 'all' && staffMembers.length > 0 
                  ? `No orders found for ${staffMembers.find(s => s.id.toString() === selectedStaffMember)?.name || 'selected staff member'} in this date range.`
                  : 'No staff orders found in the selected date range.'
                }
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your date range or selecting a different staff member.
              </p>
            </div>
          )}

          {/* Staff Pagination */}
          {totalStaffPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <button
                onClick={() => setStaffPage(Math.max(1, staffPage - 1))}
                disabled={staffPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalStaffPages) }, (_, i) => {
                  let pageNum;
                  if (totalStaffPages <= 5) {
                    pageNum = i + 1;
                  } else if (staffPage <= 3) {
                    pageNum = i + 1;
                  } else if (staffPage >= totalStaffPages - 2) {
                    pageNum = totalStaffPages - 4 + i;
                  } else {
                    pageNum = staffPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setStaffPage(pageNum)}
                      className={`px-3 py-2 border rounded-lg ${
                        staffPage === pageNum
                          ? 'bg-green-500 text-white border-green-500'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setStaffPage(Math.min(totalStaffPages, staffPage + 1))}
                disabled={staffPage === totalStaffPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/*
        ============================================
        (D) Menu Item Performance - HIGH PRIORITY
        ============================================
      */}
      <MenuItemPerformance
        menuItems={menuItems}
        categories={categories}
      />

      {/*
        ============================================
        (E) Payment Method Report - HIGH PRIORITY
        ============================================
      */}
      <PaymentMethodReport
        paymentMethods={paymentMethods}
        totalAmount={paymentTotals.amount}
        totalCount={paymentTotals.count}
      />

      {/* 
        ============================================
        (F) Revenue Trend - MEDIUM PRIORITY
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
        {revenueTrend.length > 0 ? (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500">No revenue data in this range.</p>
        )}
      </div>

      {/*
        ============================================
        (G) VIP Customer Report - MEDIUM PRIORITY
        ============================================
      */}
      <VipCustomerReport
        vipCustomers={vipCustomers}
        summary={vipSummary}
      />

      {/*
        ============================================
        (H) Refunds Report - HIGH PRIORITY
        ============================================
      */}
      <RefundsReport
        summary={refundSummary}
        refundsByMethod={refundsByMethod}
        dailyTrends={refundDailyTrends}
        refundDetails={refundDetails}
      />

      {/* 
        ============================================
        (H) Income Statement - LOW PRIORITY
        ============================================
      */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Income Statement</h3>
            <p className="text-gray-600 text-sm mt-1">
              {incomeStatement.length} months • ${incomeStatement.reduce((sum, row) => sum + row.revenue, 0).toFixed(2)} total revenue
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 w-20 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {incomeStatement.length > 0 ? (
          <div className="space-y-2">
            {incomeStatement.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {row.month}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  ${row.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No data available for {year}</p>
          </div>
        )}
      </div>

      {/* 
        ============================================
        (I) User Signups - LOW PRIORITY
        ============================================
      */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900">User Signups</h3>
          <p className="text-gray-600 text-sm mt-1">
            {userSignups.reduce((sum, item) => sum + item.count, 0)} total signups • Daily breakdown
          </p>
        </div>

        {userSignups.length > 0 ? (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userSignups} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" fontSize={12} stroke="#6b7280" />
                <YAxis fontSize={12} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#f97316' }}
                  activeDot={{ r: 6, fill: '#ea580c' }}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No signup data in this date range</p>
          </div>
        )}
      </div>

      {/* 
        ============================================
        (J) User Activity Heatmap - LOW PRIORITY
        ============================================
      */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900">User Activity Heatmap</h3>
          <p className="text-gray-600 text-sm mt-1">
            Peak activity patterns • Times shown in Guam time (UTC+10)
          </p>
        </div>

        {activityHeatmap.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-20 text-left"></th>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const hour12 = hour === 0 ? '12A' : 
                                    hour < 12 ? `${hour}A` : 
                                    hour === 12 ? '12P' : 
                                    `${hour - 12}P`;
                      
                      return (
                        <th 
                          key={hour} 
                          className="w-10 h-8 text-center text-xs font-medium text-gray-600"
                        >
                          {hour12}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dayNames.map((dayName, dayIndex) => {
                    return (
                      <tr key={dayIndex}>
                        <td className="w-20 py-2 text-sm font-medium text-gray-700">
                          {dayName.slice(0, 3)}
                        </td>
                        
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const utcHour = (hour - 10 + 24) % 24;
                          const cellData = activityHeatmap.find(
                            item => item.day === dayIndex && item.hour === utcHour
                          );
                          const value = cellData?.value || 0;
                          const maxValue = Math.max(...activityHeatmap.map(d => d.value), 1);
                          const intensity = maxValue > 0 ? (value / maxValue) : 0;
                          
                          const bgColor = value > 0 
                            ? `rgba(249, 115, 22, ${Math.max(0.15, intensity * 0.8)})`
                            : 'transparent';
                          
                          const hour12 = hour === 0 ? '12 AM' : 
                                        hour < 12 ? `${hour} AM` : 
                                        hour === 12 ? '12 PM' : 
                                        `${hour - 12} PM`;
                          
                          return (
                            <td 
                              key={hour}
                              className="w-10 h-10 text-center text-xs border border-gray-100 rounded-sm"
                              style={{ backgroundColor: bgColor }}
                              title={`${dayName} ${hour12}: ${value} orders`}
                            >
                              {value > 0 && value >= maxValue * 0.3 ? value : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-end text-sm">
              <span className="text-gray-600 mr-3">Activity:</span>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Low</span>
                <div className="flex space-x-1 mx-2">
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)' }}></div>
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(249, 115, 22, 0.35)' }}></div>
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(249, 115, 22, 0.55)' }}></div>
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(249, 115, 22, 0.75)' }}></div>
                </div>
                <span className="text-gray-500">High</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No activity data in this date range</p>
          </div>
        )}
      </div>
    </div>
  );
}