// src/ordering/components/admin/SettingsManager.tsx

import { useState, lazy, Suspense, useEffect } from 'react';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { Store, Users, CreditCard, Book, Lock, Bell, MapPin, CalendarClock, Percent } from 'lucide-react';

// Lazy load the settings components to improve performance
const RestaurantSettings = lazy(() => import('./settings/RestaurantSettings').then(module => ({ default: module.RestaurantSettings })));
const MenusSettings = lazy(() => import('./settings/MenusSettings').then(module => ({ default: module.MenusSettings })));
const UsersSettings = lazy(() => import('./settings/UsersSettings').then(module => ({ default: module.UsersSettings })));
const PaymentSettings = lazy(() => import('./settings/PaymentSettings').then(module => ({ default: module.PaymentSettings })));
const NotificationSettings = lazy(() => import('./settings/NotificationSettings').then(module => ({ default: module.NotificationSettings })));
const VipModeToggle = lazy(() => import('./settings/VipModeToggle').then(module => ({ default: module.VipModeToggle })));
const VipCodesManager = lazy(() => import('./settings/VipCodesManager').then(module => ({ default: module.VipCodesManager })));
const LocationManager = lazy(() => import('./settings/LocationManager').then(module => ({ default: module.LocationManager })));
const ReservationSettings = lazy(() => import('./settings/ReservationSettings').then(module => ({ default: module.ReservationSettings })));
const StaffDiscountSettings = lazy(() => import('./settings/StaffDiscountSettings'));

// Wrapper component for ReservationSettings that properly handles hooks
const ReservationSettingsWrapper = () => {
  const { restaurant, fetchRestaurant, updateRestaurant } = useRestaurantStore();
  
  if (!restaurant) {
    return <div className="p-4 text-gray-500">Loading restaurant data...</div>;
  }
  
  return (
    <ReservationSettings 
      restaurant={restaurant} 
      onUpdate={async (updatedRestaurant) => {
        try {
          // Actually save the changes to the server
          await updateRestaurant(updatedRestaurant);
          
          // After successful save, refresh the restaurant data
          await fetchRestaurant();
        } catch (error) {
          console.error('Failed to update restaurant settings:', error);
          // You might want to show a toast notification here for errors
        }
      }}
    />
  );
};

type SettingsTab = 'restaurant' | 'menus' | 'users' | 'payments' | 'notifications' | 'vip-access' | 'locations' | 'reservations' | 'staff-discounts';

interface SettingsManagerProps {
  restaurantId?: string;
}

export function SettingsManager({ restaurantId }: SettingsManagerProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(() => {
    const stored = localStorage.getItem('adminSettingsTab');
    if (stored && ['restaurant', 'menus', 'users', 'payments', 'notifications', 'vip-access', 'locations', 'reservations', 'staff-discounts'].includes(stored)) {
      return stored as SettingsTab;
    }
    return 'restaurant';
  });

  // Save the active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('adminSettingsTab', activeSettingsTab);
  }, [activeSettingsTab]);

  const tabs = [
    { id: 'restaurant', label: 'Restaurant', icon: Store },
    { id: 'menus', label: 'Menus', icon: Book },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'vip-access', label: 'VIP Access', icon: Lock },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'reservations', label: 'Reservations', icon: CalendarClock },
    { id: 'staff-discounts', label: 'Staff Discounts', icon: Percent },
  ];

  // Render a placeholder while the tab content is loading
  const TabLoadingPlaceholder = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-gray-400">Loading...</div>
    </div>
  );

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeSettingsTab) {
      case 'restaurant':
        return <RestaurantSettings restaurantId={restaurantId} />;
      case 'menus':
        return (
          <div>
            <MenusSettings restaurantId={restaurantId} />
          </div>
        );
      case 'users':
        return (
          <div>
            <UsersSettings restaurantId={restaurantId} />
          </div>
        );
      case 'payments':
        return (
          <div>
            <PaymentSettings />
          </div>
        );
      case 'notifications':
        return (
          <div>
            <NotificationSettings />
          </div>
        );
      case 'vip-access':
        return (
          <div className="space-y-6">
            <VipModeToggle className="mb-6" />
            <VipCodesManager />
          </div>
        );
      case 'locations':
        return (
          <div>
            <LocationManager restaurantId={restaurantId} />
          </div>
        );
      case 'reservations':
        return (
          <div>
            <ReservationSettingsWrapper />
          </div>
        );
      case 'staff-discounts':
        return (
          <div>
            <StaffDiscountSettings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      {/* Header section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Admin Settings</h2>
        <p className="text-gray-600 text-sm">Configure system settings and preferences</p>
      </div>

      {/* Mobile-friendly tab navigation similar to main admin dashboard */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden whitespace-nowrap">
        <nav className="flex -mb-px" role="tablist">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSettingsTab(id as SettingsTab)}
              className={`
                flex-shrink-0 whitespace-nowrap px-4 py-4 border-b-2
                text-center font-medium text-sm
                ${
                  activeSettingsTab === id
                    ? 'border-[#c1902f] text-[#c1902f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="h-5 w-5 mx-auto mb-1" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="relative overflow-hidden">
        <Suspense fallback={<TabLoadingPlaceholder />}>
          <div className="animate-fadeIn">
            {renderTabContent()}
          </div>
        </Suspense>
      </div>
    </div>
  );
}
