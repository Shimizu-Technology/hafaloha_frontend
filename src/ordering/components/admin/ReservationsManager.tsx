// src/ordering/components/admin/ReservationsManager.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Coffee, Layout } from 'lucide-react';
import { DateFilterProvider } from '../../../reservations/context/DateFilterContext';

// Import tenant utilities for proper tenant isolation
import { validateRestaurantContext } from '../../../shared/utils/tenantUtils';

// Import the migrated components
import { ReservationsList } from './reservations/ReservationsList';
import { WaitlistManager } from './reservations/WaitlistManager';
import { FloorPlanManager } from './reservations/FloorPlanManager';
import { LayoutEditor } from './reservations/LayoutEditor';

// Navigation tab for the reservations sub-sections
interface NavTabProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}

const NavTab: React.FC<NavTabProps> = ({ label, icon: Icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center px-4 py-2 rounded-md text-sm font-medium
        ${isActive 
          ? 'bg-hafaloha-gold/10 text-hafaloha-gold' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
      `}
    >
      <Icon className={`mr-2 h-5 w-5 ${isActive ? 'text-hafaloha-gold' : 'text-gray-400'}`} />
      {label}
    </button>
  );
};

interface ReservationsManagerProps {
  restaurantId?: string | number;
}

export function ReservationsManager({ restaurantId }: ReservationsManagerProps) {
  // Ensure we have a valid restaurant context
  useEffect(() => {
    validateRestaurantContext(restaurantId);
  }, [restaurantId]);

  // Sub-tab navigation within Reservations
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem('reservationsTab');
    if (stored && ['list', 'waitlist', 'seating', 'layout'].includes(stored)) {
      return stored;
    }
    return 'list';
  });

  // Save the active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('reservationsTab', activeTab);
  }, [activeTab]);

  // Define the sub-tabs
  const tabs = [
    { id: 'list', label: 'Reservations', icon: Calendar },
    { id: 'waitlist', label: 'Waitlist', icon: Users },
    { id: 'seating', label: 'Floor Plan', icon: Coffee },
    { id: 'layout', label: 'Layout Editor', icon: Layout },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header with title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Reservations Management</h1>
        <p className="text-sm text-gray-500">Manage reservations, waitlist, and seating arrangements</p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="bg-hafaloha-gold/5 rounded-md shadow p-3 flex items-center space-x-2 overflow-x-auto mb-4">
        {tabs.map((tab) => (
          <NavTab
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-grow bg-white rounded-md shadow overflow-hidden">
        {activeTab === 'list' && (
          <DateFilterProvider>
            <ReservationsList restaurantId={restaurantId} />
          </DateFilterProvider>
        )}
        
        {activeTab === 'waitlist' && (
          <DateFilterProvider>
            <WaitlistManager restaurantId={restaurantId} />
          </DateFilterProvider>
        )}
        
        {activeTab === 'seating' && (
          <DateFilterProvider>
            <FloorPlanManager restaurantId={restaurantId} />
          </DateFilterProvider>
        )}
        
        {activeTab === 'layout' && (
          <LayoutEditor restaurantId={restaurantId} />
        )}
      </div>
    </div>
  );
}

export default ReservationsManager;
