import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { validateVipCode } from '../../shared/api/endpoints/vipAccess';
import { handleApiError } from '../../shared/utils/errorHandler';
import { LoadingSpinner } from '../../shared/components/ui/LoadingSpinner';

interface VipCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (isValid: boolean) => void;
}

export function VipCodeInput({ value, onChange, onValidation }: VipCodeInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const restaurant = useRestaurantStore((state) => state.restaurant);
  const vipRequired = (restaurant?.vip_only_checkout || false) && (restaurant?.vip_only_mode || false);
  
  // Validate the code when it changes
  useEffect(() => {
    // Reset validation state when code changes
    setIsValid(null);
    setError(null);
    
    // Don't validate empty codes
    if (!value.trim() || !vipRequired) return;
    
    // Debounce validation to avoid too many API calls
    const timer = setTimeout(() => {
      validateCode(value);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [value, vipRequired]);
  
  // Validate the code with the API
  const validateCode = async (code: string) => {
    if (!restaurant?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await validateVipCode(restaurant.id, code);
      setIsValid(result.valid);
      onValidation(result.valid);
      
      if (!result.valid) {
        setError(result.message || 'Invalid VIP code');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      setIsValid(false);
      onValidation(false);
    } finally {
      setLoading(false);
    }
  };
  
  // If VIP access is not required, don't render the component
  if (!vipRequired) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">VIP Access</h2>
      <div className="flex flex-col space-y-2">
        <p className="text-sm text-amber-700 mb-2">
          This restaurant is currently accepting orders from VIP guests only.
          Please enter your VIP code to continue.
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter VIP code"
            className={`flex-1 px-4 py-2 border rounded-md focus:ring-amber-500 focus:border-amber-500 ${
              isValid === false ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {loading && (
            <div className="flex items-center">
              <LoadingSpinner className="h-8 w-8" showText={false} />
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
        
        {isValid === true && (
          <p className="text-sm text-green-600 mt-1">VIP code verified!</p>
        )}
      </div>
    </div>
  );
}
