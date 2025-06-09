import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define filter state interface
export interface StaffFilterState {
  dateRange: {
    from: string;
    to: string;
  };
  staffMemberId: number | 'all';
  preset: 'current_pay_period' | 'previous_pay_period' | 'this_month' | 'last_month' | 'custom';
}

// Define context value interface
interface StaffFilterContextValue {
  filters: StaffFilterState;
  updateFilters: (updates: Partial<StaffFilterState>) => void;
  resetFilters: () => void;
  isFilterActive: boolean;
}

// Create context
const StaffFilterContext = createContext<StaffFilterContextValue | undefined>(undefined);

// Default filter state
const getDefaultFilters = (): StaffFilterState => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    dateRange: {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    },
    staffMemberId: 'all',
    preset: 'custom'
  };
};

// Pay period calculation helper
const calculatePayPeriod = (period: 'current' | 'previous'): { from: string; to: string } => {
  const today = new Date();
  const currentDate = today.getDate();
  
  // Assume bi-weekly pay periods starting on the 1st and 15th
  let periodStart: Date;
  let periodEnd: Date;
  
  if (currentDate <= 15) {
    // First half of month
    if (period === 'current') {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 15);
    } else {
      // Previous period would be second half of last month
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      periodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 16);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
    }
  } else {
    // Second half of month
    if (period === 'current') {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 16);
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    } else {
      // Previous period would be first half of current month
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 15);
    }
  }
  
  return {
    from: periodStart.toISOString().split('T')[0],
    to: periodEnd.toISOString().split('T')[0]
  };
};

// Date preset calculations
const getDateRangeForPreset = (preset: StaffFilterState['preset']): { from: string; to: string } => {
  const today = new Date();
  
  switch (preset) {
    case 'current_pay_period':
      return calculatePayPeriod('current');
    
    case 'previous_pay_period':
      return calculatePayPeriod('previous');
    
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        from: firstDay.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0]
      };
    }
    
    case 'last_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        from: firstDay.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0]
      };
    }
    
    default:
      // For 'custom', return current values as-is
      return getDefaultFilters().dateRange;
  }
};

// Storage key for persistence
const STORAGE_KEY = 'staff-management-filters';

// Provider component
export function StaffFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<StaffFilterState>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the structure
        if (parsed.dateRange && parsed.staffMemberId !== undefined && parsed.preset) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
    
    // Return default if no valid saved state
    return getDefaultFilters();
  });

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }, [filters]);

  // Update filters function
  const updateFilters = (updates: Partial<StaffFilterState>) => {
    setFilters(prev => {
      const newFilters = { ...prev, ...updates };
      
      // If preset is changed, automatically update date range
      if (updates.preset && updates.preset !== 'custom') {
        const newDateRange = getDateRangeForPreset(updates.preset);
        newFilters.dateRange = newDateRange;
      }
      
      // If date range is manually changed, set preset to custom
      if (updates.dateRange && !updates.preset) {
        newFilters.preset = 'custom';
      }
      
      return newFilters;
    });
  };

  // Reset filters function
  const resetFilters = () => {
    setFilters(getDefaultFilters());
  };

  // Check if any non-default filters are active
  const isFilterActive = React.useMemo(() => {
    const defaults = getDefaultFilters();
    return (
      filters.staffMemberId !== defaults.staffMemberId ||
      filters.dateRange.from !== defaults.dateRange.from ||
      filters.dateRange.to !== defaults.dateRange.to
    );
  }, [filters]);

  const contextValue: StaffFilterContextValue = {
    filters,
    updateFilters,
    resetFilters,
    isFilterActive
  };

  return (
    <StaffFilterContext.Provider value={contextValue}>
      {children}
    </StaffFilterContext.Provider>
  );
}

// Hook to use the context
export function useStaffFilters() {
  const context = useContext(StaffFilterContext);
  if (context === undefined) {
    throw new Error('useStaffFilters must be used within a StaffFilterProvider');
  }
  return context;
}

// Export preset options for use in components
export const PRESET_OPTIONS = [
  { value: 'current_pay_period', label: 'Current Pay Period' },
  { value: 'previous_pay_period', label: 'Previous Pay Period' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' }
] as const; 