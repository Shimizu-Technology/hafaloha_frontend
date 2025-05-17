// src/ordering/components/admin/reservations/ReservationsManager.tsx

import { useState, useRef, useCallback } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { validateRestaurantContext } from '../../../../shared/utils/tenantUtils';
import ReservationsListTab from './tabs/ReservationsListTab';
// Temporarily commented out
// import WaitlistTab from './tabs/WaitlistTab';
import BlockedPeriodsManager from './BlockedPeriodsManager';
import { LocationCapacitiesManager } from './LocationCapacitiesManager';
import { LayoutEditorManager } from './LayoutEditorManager';
import { SeatingManager } from './SeatingManager';

// Tab type for sub-navigation
type ReservationTab = 'list' | 'waitlist' | 'floor-plan' | 'layout' | 'blocked' | 'capacities';

/**
 * ReservationsManager component - Manages all reservation-related functionality
 * in the Admin Dashboard with proper tenant isolation
 */
/**
 * ReservationsManager component
 * Handles all reservation-related functionality in the Admin Dashboard
 * With proper tenant isolation and navigation protection for unsaved changes
 */
export function ReservationsManager() {
  const { restaurant } = useRestaurantStore();
  const [activeTab, setActiveTab] = useState<ReservationTab>('list');
  
  // Reference to the current navigation guard for tab navigation protection
  const navigationGuardRef = useRef<((proceedWithNavigation: () => void) => boolean) | null>(null);
  
  // Function to register a navigation guard from child components
  const registerNavigationGuard = useCallback((guardFn: (proceedWithNavigation: () => void) => boolean) => {
    navigationGuardRef.current = guardFn;
  }, []);
  
  // Safely handle tab change with navigation guard
  const handleTabChange = useCallback((tabId: ReservationTab) => {
    // If already on this tab, do nothing
    if (activeTab === tabId) return;
    
    // Check if there's a navigation guard in place
    if (navigationGuardRef.current) {
      // Create a callback function that will be executed if the user confirms navigation
      const proceedWithNavigation = () => {
        // Clear the guard after successful navigation
        navigationGuardRef.current = null;
        // Proceed with tab change
        setActiveTab(tabId);
      };
      
      // Call the guard function to determine if navigation should proceed immediately
      const canNavigateImmediately = navigationGuardRef.current(proceedWithNavigation);
      
      if (canNavigateImmediately) {
        // Navigation is allowed immediately (no unsaved changes)
        proceedWithNavigation();
      }
      // Otherwise, the navigation guard will handle showing a confirmation modal
      // and call proceedWithNavigation if the user confirms
      return;
    }
    
    // If no guard, proceed with tab change
    setActiveTab(tabId);
  }, [activeTab]);

  // Validate restaurant context for tenant isolation
  if (!validateRestaurantContext(restaurant)) {
    return (
      <div className="p-4 text-red-600">
        Error: Cannot load reservations without restaurant context.
      </div>
    );
  }

  // Tabs for reservation management
  const tabs = [
    { id: 'list', label: 'Reservations' },
    // Waitlist tab temporarily commented out
    // { id: 'waitlist', label: 'Waitlist' },
    { id: 'floor-plan', label: 'Floor Plan' },
    { id: 'layout', label: 'Layout Editor' },
    { id: 'blocked', label: 'Blocked Periods' },
    { id: 'capacities', label: 'Location Capacities' },
  ] as const;

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Sub-navigation */}
      <div className="border-b border-gray-200 w-full">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange(tab.id as ReservationTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="w-full">
        {activeTab === 'list' && <ReservationsListTab />}

        {/* Waitlist tab temporarily commented out */}
        {/* {activeTab === 'waitlist' && <WaitlistTab />} */}

        {activeTab === 'floor-plan' && <SeatingManager />}

        {activeTab === 'layout' && <LayoutEditorManager onNavigationAttempt={registerNavigationGuard} />}

        {activeTab === 'blocked' && <BlockedPeriodsManager />}

        {activeTab === 'capacities' && <LocationCapacitiesManager />}
      </div>
    </div>
  );
}

export default ReservationsManager;
