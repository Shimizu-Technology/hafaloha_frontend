// src/ordering/hooks/useOrderFilters.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../shared/auth';
import debounce from 'lodash/debounce';
import { useLocation, useNavigate } from 'react-router-dom';

// Types need to match those used in OrderManager component
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'confirmed' | 'refunded' | 'all';
export type DateFilterOption = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom';
export type SortDirection = 'asc' | 'desc';

// Interface for filter state
export interface OrderFilterState {
  status: OrderStatus;
  dateFilter: DateFilterOption;
  customStartDate: Date | null;
  customEndDate: Date | null;
  searchQuery: string;
  locationFilter: number | null;
  staffFilter: string | null;
  onlineOrdersOnly: boolean;
  sortNewestFirst: boolean;
  page: number;
  perPage: number;
}

// Interface for hook return value
export interface OrderFiltersReturn {
  // Current filter state
  filters: OrderFilterState;
  
  // Methods to update filters
  setStatus: (status: OrderStatus) => void;
  setDateFilter: (option: DateFilterOption) => void;
  setCustomDateRange: (startDate: Date | null, endDate: Date | null) => void;
  setSearchQuery: (query: string) => void;
  setLocationFilter: (locationId: number | null) => void;
  setStaffFilter: (staffId: string | null) => void;
  setOnlineOrdersOnly: (onlineOnly: boolean) => void;
  setSortNewestFirst: (newest: boolean) => void;
  setPage: (page: number) => void;
  
  // Reset filters
  resetFilters: () => void;
  
  // Date helper functions
  getDateRange: () => { start: Date; end: Date };
  
  // API parameter generation
  getApiQueryParams: () => Record<string, any>;
}

// Helper function to parse query parameters from URL
const parseQueryParams = (query: string) => {
  const searchParams = new URLSearchParams(query);
  const params: Record<string, string> = {};
  
  // Convert URLSearchParams to plain object
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
};

/**
 * Custom hook for managing order filters and URL synchronization
 */
export function useOrderFilters(initialFilters?: Partial<OrderFilterState>): OrderFiltersReturn {
  // Get location and navigate from react-router
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get user role from auth store
  const { isSuperAdmin, isAdmin, isStaff } = useAuthStore();
  
  // Parse date string from URL to Date object with Guam timezone (UTC+10)
  const parseDate = useCallback((dateString?: string | null): Date | null => {
    if (!dateString) return null;
    
    try {
      // Assuming dateString is in YYYY-MM-DD format from URL
      // Add explicit Guam timezone (+10:00) to ensure correct interpretation
      const [year, month, day] = dateString.split('-').map(Number);
      
      if (!year || !month || !day) {
        console.error('Invalid date format:', dateString);
        return null;
      }
      
      // Create date in Guam timezone
      // When creating a date this way, the time will be 00:00:00 in the specified timezone
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+10:00`;
      const parsedDate = new Date(dateStr);
      
      if (isNaN(parsedDate.getTime())) {
        console.error('Invalid date after parsing:', dateString);
        return null;
      }
      
      return parsedDate;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }, []);
  
  // Format date to string for URL
  const formatDateForUrl = useCallback((date: Date | null): string | null => {
    if (!date) return null;
    
    // First convert the date to Guam timezone
    const dateInGuam = new Date(date.toLocaleString('en-US', { timeZone: 'Pacific/Guam' }));
    
    // Format as YYYY-MM-DD directly
    const year = dateInGuam.getFullYear();
    const month = String(dateInGuam.getMonth() + 1).padStart(2, '0');
    const day = String(dateInGuam.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }, []);
  
  // Initialize with default filters based on user role
  const getDefaultFilters = useCallback((): OrderFilterState => {
    // Get current date in Guam timezone
    const guamDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Pacific/Guam' }));
    
    // Start with base defaults
    const defaults: OrderFilterState = {
      status: 'pending',
      dateFilter: 'today',
      customStartDate: guamDate,
      customEndDate: guamDate,
      searchQuery: '',
      locationFilter: null,
      staffFilter: null,
      onlineOrdersOnly: false,
      sortNewestFirst: true,
      page: 1,
      perPage: 10
    };
    
    // Apply role-specific defaults
    if (isSuperAdmin() || isAdmin()) {
      // Admin users can see all statuses and filters
      // No special defaults needed
    } else if (isStaff()) {
      // Staff users typically focus on pending and preparing orders
      // No special defaults needed
    } else {
      // Regular users typically see their own orders regardless of status
      defaults.status = 'all';
    }
    
    return defaults;
  }, [isSuperAdmin, isAdmin, isStaff]);
  
  // Parse filters from URL query parameters
  const getFiltersFromUrl = useCallback(() => {
    const params = parseQueryParams(location.search);
    const defaultFilters = getDefaultFilters();
    
    return {
      status: (params.status as OrderStatus) || defaultFilters.status,
      dateFilter: (params.dateFilter as DateFilterOption) || defaultFilters.dateFilter,
      customStartDate: parseDate(params.startDate) || defaultFilters.customStartDate,
      customEndDate: parseDate(params.endDate) || defaultFilters.customEndDate,
      searchQuery: params.search || defaultFilters.searchQuery,
      locationFilter: params.locationId ? parseInt(params.locationId, 10) : defaultFilters.locationFilter,
      staffFilter: params.staffId || defaultFilters.staffFilter,
      onlineOrdersOnly: params.onlineOnly === 'true' || defaultFilters.onlineOrdersOnly,
      sortNewestFirst: params.newest !== 'false', // Default to true if not explicitly set to false
      page: params.page ? parseInt(params.page, 10) : defaultFilters.page,
      perPage: params.perPage ? parseInt(params.perPage, 10) : defaultFilters.perPage
    };
  }, [location.search, getDefaultFilters, parseDate]);
  
  // Initialize filter state with values from URL or defaults + any provided initialFilters
  const [filters, setFilters] = useState<OrderFilterState>(() => {
    const urlFilters = getFiltersFromUrl();
    return { ...urlFilters, ...initialFilters };
  });
  
  // Get the current date in Guam timezone
  const getGuamDate = useCallback(() => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Pacific/Guam' }));
  }, []);
  
  // Memoize the date range calculation to avoid recalculating on every render
  const getDateRange = useCallback(() => {
    try {
      // Get current date in Guam timezone
      const guamDate = getGuamDate();
      
      // Extract date components
      const year = guamDate.getFullYear();
      const month = guamDate.getMonth();
      const date = guamDate.getDate();
      const dayOfWeek = guamDate.getDay(); // 0 is Sunday, 6 is Saturday
      
      // Create today's start and end
      const today = new Date(year, month, date, 0, 0, 0);
      const todayEnd = new Date(year, month, date, 23, 59, 59);
      
      // Create yesterday's start and end
      const yesterday = new Date(year, month, date - 1, 0, 0, 0);
      const yesterdayEnd = new Date(year, month, date - 1, 23, 59, 59);
      
      // Calculate this week's start (Sunday)
      const weekStart = new Date(year, month, date - dayOfWeek, 0, 0, 0);
      
      // Calculate last week's start and end
      const lastWeekStart = new Date(year, month, date - dayOfWeek - 7, 0, 0, 0);
      const lastWeekEnd = new Date(year, month, date - dayOfWeek - 1, 23, 59, 59);
      
      // Get first day of month
      const monthStart = new Date(year, month, 1, 0, 0, 0);

      // Handle different date filter options
      switch (filters.dateFilter) {
        case 'today':
          // For today, use today at 00:00:00 to today at 23:59:59
          return { start: today, end: todayEnd };
        case 'yesterday':
          // For yesterday, use yesterday at 00:00:00 to yesterday at 23:59:59
          return { start: yesterday, end: yesterdayEnd };
        case 'thisWeek':
          // For this week, use week start at 00:00:00 to today at 23:59:59
          return { start: weekStart, end: todayEnd };
        case 'lastWeek':
          // For last week, use last week start at 00:00:00 to last week end at 23:59:59
          return { start: lastWeekStart, end: lastWeekEnd };
        case 'thisMonth':
          // For this month, use month start at 00:00:00 to today at 23:59:59
          return { start: monthStart, end: todayEnd };
        case 'custom':
          // For custom range, use the custom dates with proper time boundaries
          const customStart = filters.customStartDate ? new Date(filters.customStartDate) : today;
          customStart.setHours(0, 0, 0, 0);
          
          const customEnd = filters.customEndDate ? new Date(filters.customEndDate) : todayEnd;
          customEnd.setHours(23, 59, 59, 999);
          
          return { 
            start: customStart, 
            end: customEnd 
          };
        default:
          // Default to today
          return { start: today, end: todayEnd };
      }
    } catch (error) {
      console.error('Error calculating date range:', error);
      // Fallback to a safe default - today
      const now = getGuamDate();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start: startOfToday, end: endOfToday };
    }
  }, [filters.dateFilter, filters.customStartDate, filters.customEndDate, getGuamDate]);
  
  // Generate API query parameters from current filters
  const getApiQueryParams = useCallback(() => {
    // Date range for API
    const { start, end } = getDateRange();
    
    // Create a unique source ID for tracking this request
    const sourceId = `filter-change-${Date.now()}`;
    
    // Build API parameters based on current filters
    const params: Record<string, any> = {
      // Using snake_case for all API parameters to match backend expectations
      page: filters.page,
      per_page: filters.perPage,
      status: filters.status !== 'all' ? filters.status : null,
      sort_by: 'created_at',
      sort_direction: filters.sortNewestFirst ? 'desc' : 'asc',
      date_from: start.toISOString(),
      date_to: end.toISOString(),
      search_query: filters.searchQuery || null,
      location_id: filters.locationFilter,
      _sourceId: sourceId // Add a unique ID to track this request
    };
    
    // Handle user role-specific parameters
    if (isSuperAdmin() || isAdmin()) {
      // Add staff=true as a query parameter instead of using a different endpoint
      params.staff = 'true';
      
      if (filters.onlineOrdersOnly) {
        // Admin filtering for online orders only (customer orders)
        params.online_orders_only = 'true';
        // Explicitly clear other filter parameters to avoid conflicts
        delete params.staff_member_id;
        delete params.user_id;
        delete params.include_online_orders;
      } else if (filters.staffFilter) {
        // Admin filtering by specific staff member
        params.staff_member_id = filters.staffFilter;
        delete params.online_orders_only;
        delete params.user_id;
      }
    } else if (isStaff()) {
      // Staff users see their own orders by default
      // The backend handles this with the current user context
      // No special parameters needed for staff users
    } else {
      // Regular users see only their own orders
      // The backend handles this with the current user context
      // No special parameters needed for regular users
    }
    
    // Return the formatted parameters for the API call
    return params;
  }, [filters, getDateRange, isSuperAdmin, isAdmin, isStaff]);
  
  // Filter updater methods
  const setStatus = useCallback((status: OrderStatus) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  }, []);
  
  const setDateFilter = useCallback((dateFilter: DateFilterOption) => {
    setFilters(prev => ({ ...prev, dateFilter, page: 1 }));
  }, []);
  
  const setCustomDateRange = useCallback((startDate: Date | null, endDate: Date | null) => {
    setFilters(prev => ({ 
      ...prev, 
      customStartDate: startDate,
      customEndDate: endDate,
      dateFilter: 'custom',
      page: 1
    }));
  }, []);
  
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery, page: 1 }));
  }, []);
  
  const setLocationFilter = useCallback((locationId: number | null) => {
    setFilters(prev => ({ ...prev, locationFilter: locationId, page: 1 }));
  }, []);
  
  const setStaffFilter = useCallback((staffId: string | null) => {
    setFilters(prev => ({ 
      ...prev, 
      staffFilter: staffId,
      onlineOrdersOnly: staffId ? false : prev.onlineOrdersOnly,
      page: 1
    }));
  }, []);
  
  const setOnlineOrdersOnly = useCallback((onlineOnly: boolean) => {
    setFilters(prev => ({ 
      ...prev, 
      onlineOrdersOnly: onlineOnly,
      staffFilter: onlineOnly ? null : prev.staffFilter,
      page: 1
    }));
  }, []);
  
  const setSortNewestFirst = useCallback((newest: boolean) => {
    setFilters(prev => ({ ...prev, sortNewestFirst: newest, page: 1 }));
  }, []);
  
  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, [getDefaultFilters]);
  
  // Create a debounced function for updating URL to avoid excessive history entries
  const updateUrlDebounced = useCallback(
    debounce((newFilters: OrderFilterState) => {
      // Build query parameters for URL
      const params = new URLSearchParams();
      
      // Only add parameters that differ from defaults or have values
      const defaultFilters = getDefaultFilters();
      
      // Add status if not default or 'all'
      if (newFilters.status !== defaultFilters.status) {
        params.set('status', newFilters.status);
      }
      
      // Add date filter parameters
      if (newFilters.dateFilter !== defaultFilters.dateFilter) {
        params.set('dateFilter', newFilters.dateFilter);
      }
      
      // Add custom date range if using custom filter
      if (newFilters.dateFilter === 'custom') {
        if (newFilters.customStartDate) {
          params.set('startDate', formatDateForUrl(newFilters.customStartDate) || '');
        }
        if (newFilters.customEndDate) {
          params.set('endDate', formatDateForUrl(newFilters.customEndDate) || '');
        }
      }
      
      // Add search query if present
      if (newFilters.searchQuery) {
        params.set('search', newFilters.searchQuery);
      }
      
      // Add location filter if present
      if (newFilters.locationFilter !== null) {
        params.set('locationId', newFilters.locationFilter.toString());
      }
      
      // Add staff filter if present
      if (newFilters.staffFilter) {
        params.set('staffId', newFilters.staffFilter);
      }
      
      // Add online orders flag if true
      if (newFilters.onlineOrdersOnly) {
        params.set('onlineOnly', 'true');
      }
      
      // Add sort order only if not default
      if (!newFilters.sortNewestFirst) {
        params.set('newest', 'false');
      }
      
      // Add pagination params if not on first page or non-default page size
      if (newFilters.page > 1) {
        params.set('page', newFilters.page.toString());
      }
      if (newFilters.perPage !== defaultFilters.perPage) {
        params.set('perPage', newFilters.perPage.toString());
      }
      
      // Update URL without reloading the page
      navigate({
        pathname: location.pathname,
        search: params.toString()
      }, { replace: true });
    }, 300), // 300ms debounce
    [navigate, location.pathname, getDefaultFilters, formatDateForUrl]
  );
  
  // Update URL when filters change
  useEffect(() => {
    updateUrlDebounced(filters);
    // Return cleanup function that cancels pending debounced calls
    return () => {
      updateUrlDebounced.cancel();
    };
  }, [filters, updateUrlDebounced]);
  
  // Return the hook API
  return {
    filters,
    setStatus,
    setDateFilter,
    setCustomDateRange,
    setSearchQuery,
    setLocationFilter,
    setStaffFilter,
    setOnlineOrdersOnly,
    setSortNewestFirst,
    setPage,
    resetFilters,
    getDateRange,
    getApiQueryParams
  };
}

export default useOrderFilters;
