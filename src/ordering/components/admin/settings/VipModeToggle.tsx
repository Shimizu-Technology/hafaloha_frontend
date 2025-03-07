// src/ordering/components/admin/settings/VipModeToggle.tsx

import React, { useState } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { toast } from 'react-hot-toast';
import { SettingsHeader } from '../../../../shared/components/ui';
import { Lock } from 'lucide-react';

interface VipModeToggleProps {
  className?: string;
}

export const VipModeToggle: React.FC<VipModeToggleProps> = ({ className = '' }) => {
  const { restaurant, toggleVipMode } = useRestaurantStore();
  const [loading, setLoading] = useState(false);
  
  const isVipModeEnabled = restaurant?.vip_enabled || false;
  
  const handleToggle = async () => {
    if (!restaurant) return;
    
    setLoading(true);
    try {
      await toggleVipMode(!isVipModeEnabled);
      toast.success(`VIP-only mode ${!isVipModeEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle VIP mode:', error);
      toast.error('Failed to toggle VIP mode');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <SettingsHeader 
        title="VIP-Only Mode"
        description={isVipModeEnabled 
          ? 'Only customers with valid VIP codes can place orders' 
          : 'All customers can place orders'}
        icon={<Lock className="h-6 w-6" />}
      />
      
      <div className="flex items-center justify-end p-4">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            ${isVipModeEnabled ? 'bg-amber-600' : 'bg-gray-300'}
            transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out
              ${isVipModeEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        
        <span className="ml-2 text-sm font-medium text-gray-900">
          {isVipModeEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );
};
