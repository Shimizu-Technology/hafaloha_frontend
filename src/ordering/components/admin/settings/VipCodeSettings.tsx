import React, { useState } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { toast } from 'react-hot-toast';
import { handleApiError } from '../../../../shared/utils/errorHandler';

interface VipCodeSettingsProps {
  className?: string;
}

export const VipCodeSettings: React.FC<VipCodeSettingsProps> = ({ className = '' }) => {
  const { restaurant, updateRestaurant } = useRestaurantStore();
  const [loading, setLoading] = useState(false);
  const [codePrefix, setCodePrefix] = useState(restaurant?.code_prefix || '');
  
  const handleSave = async () => {
    if (!restaurant) return;
    
    setLoading(true);
    try {
      await updateRestaurant({ code_prefix: codePrefix });
      toast.success('VIP code prefix updated');
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to update VIP code prefix:', errorMessage);
      toast.error('Failed to update VIP code prefix');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">VIP Code Settings</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="codePrefix" className="block text-sm font-medium text-gray-700 mb-1">
            VIP Code Prefix
          </label>
          <div className="flex space-x-2">
            <input
              id="codePrefix"
              type="text"
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value)}
              placeholder="e.g. VIP, GOLD, etc."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            />
            <button
              onClick={handleSave}
              disabled={loading}
              className={`px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            This prefix will be used for all new VIP codes generated for this restaurant.
            Example: {codePrefix || 'VIP'}-ABCD-1234
          </p>
        </div>
      </div>
    </div>
  );
};
