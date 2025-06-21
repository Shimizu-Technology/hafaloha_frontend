import { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/apiClient';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { useAuthStore } from '../../../shared/auth';
import { StaffDiscountConfiguration, staffDiscountConfigurationsApi } from '../../../shared/api/endpoints/staffDiscountConfigurations';

interface StaffMember {
  id: number;
  name: string;
  position: string;
  house_account_balance: number;
  active: boolean;
}

// Keep the old type for backward compatibility
type StaffDiscountType = 'on_duty' | 'off_duty' | 'no_discount';

interface StaffOrderOptionsProps {
  isStaffOrder: boolean;
  setIsStaffOrder: (value: boolean) => void;
  staffMemberId: number | null;
  setStaffMemberId: (value: number | null) => void;
  discountType: StaffDiscountType;
  setDiscountType: (value: StaffDiscountType) => void;
  useHouseAccount: boolean;
  setUseHouseAccount: (value: boolean) => void;
  createdByStaffId: number | null;
  setCreatedByStaffId: (value: number | null) => void;
  // New props for configurable discounts
  discountConfigurationId?: number | null;
  setDiscountConfigurationId?: (value: number | null) => void;
}

export function StaffOrderOptions({
  isStaffOrder,
  // setIsStaffOrder is unused but kept in props for compatibility
  staffMemberId,
  setStaffMemberId,
  discountType,
  setDiscountType,
  useHouseAccount,
  setUseHouseAccount,
  // createdByStaffId is unused but kept in props for compatibility
  setCreatedByStaffId,
  // New props for configurable discounts
  discountConfigurationId,
  setDiscountConfigurationId
}: StaffOrderOptionsProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [discountConfigurations, setDiscountConfigurations] = useState<StaffDiscountConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [discountConfigsLoading, setDiscountConfigsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useAuthStore(state => state.user);

  // Fetch staff members and discount configurations when component mounts
  useEffect(() => {
    if (isStaffOrder) {
      fetchStaffMembers();
      fetchDiscountConfigurations();
    }
  }, [isStaffOrder]);

  const fetchStaffMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/staff_members?active=true');
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setStaffMembers(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object with staff members inside
        if (Array.isArray(response.data.staff_members)) {
          setStaffMembers(response.data.staff_members);
        } else {
          // Log the response structure for debugging
          console.error('Unexpected response format:', response.data);
          setStaffMembers([]);
          setError('Unexpected API response format');
        }
      } else {
        console.error('Invalid response data:', response.data);
        setStaffMembers([]);
        setError('Invalid API response');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff members');
      console.error('Error fetching staff members:', err);
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountConfigurations = async () => {
    setDiscountConfigsLoading(true);
    try {
      const configs = await staffDiscountConfigurationsApi.getActiveConfigurations();
      setDiscountConfigurations(configs);
    } catch (err: any) {
      console.error('Error fetching discount configurations:', err);
      // Fallback to default configurations if API fails
      setDiscountConfigurations([
        { id: 1, code: 'on_duty', name: 'On Duty', discount_percentage: 50, discount_type: 'percentage', is_active: true, is_default: true, display_order: 1, display_label: 'On Duty (50% off)' },
        { id: 2, code: 'off_duty', name: 'Off Duty', discount_percentage: 30, discount_type: 'percentage', is_active: true, is_default: false, display_order: 2, display_label: 'Off Duty (30% off)' },
        { id: 3, code: 'no_discount', name: 'No Discount', discount_percentage: 0, discount_type: 'percentage', is_active: true, is_default: false, display_order: 3, display_label: 'No Discount (Full Price)' }
      ]);
    } finally {
      setDiscountConfigsLoading(false);
    }
  };

  // Reset staff order options when isStaffOrder is toggled off
  useEffect(() => {
    if (!isStaffOrder) {
      setStaffMemberId(null);
      setUseHouseAccount(false);
      setCreatedByStaffId(null);
      // Reset discount configuration ID
      if (setDiscountConfigurationId) {
        setDiscountConfigurationId(null);
      }
      // Keep legacy fallback
      setDiscountType('off_duty');
    }
  }, [isStaffOrder, setStaffMemberId, setDiscountType, setUseHouseAccount, setCreatedByStaffId, setDiscountConfigurationId]);

  // Get the selected staff member
  const selectedStaffMember = staffMemberId 
    ? staffMembers.find(staff => staff.id === staffMemberId) 
    : null;
    
  // House account should be available regardless of balance
  // since it's a credit system that gets deducted from paychecks
  const canUseHouseAccount = !!selectedStaffMember;

  return (
    <div>
      {/* Staff Order checkbox is now moved to the OrderPanel component */}

      {isStaffOrder && (
        <>
          {/* Staff Member Selection */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Staff Member
            </label>
            <MobileSelect
              options={Array.isArray(staffMembers) && staffMembers.length > 0 
                ? staffMembers.map(staff => ({
                    value: staff.id.toString(),
                    label: `${staff.name} - ${staff.position}`
                  }))
                : [{ value: '', label: 'No staff members available' }]
              }
              value={staffMemberId ? staffMemberId.toString() : ''}
              onChange={(value) => setStaffMemberId(value ? parseInt(value) : null)}
              placeholder="Select Staff Member"
              className="text-xs"
            />
            {loading && <p className="text-xs text-gray-500 mt-1">Loading...</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Discount Type Selection */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Discount Type
            </label>
            <MobileSelect
              options={discountConfigurations.length > 0 
                ? discountConfigurations.map(config => ({
                    value: config.id.toString(),
                    label: `${config.name} (${config.discount_percentage}% off)`,
                    style: config.ui_color ? { color: config.ui_color } : undefined
                  }))
                : [
                    { value: 'on_duty', label: 'On Duty (50% off)' },
                    { value: 'off_duty', label: 'Off Duty (30% off)' },
                    { value: 'no_discount', label: 'No Discount (Full Price)' }
                  ]
              }
              value={discountConfigurations.length > 0 && discountConfigurationId ? discountConfigurationId.toString() : discountType}
              onChange={(value) => {
                if (discountConfigurations.length > 0) {
                  // Using dynamic configurations
                  const configId = parseInt(value);
                  const config = discountConfigurations.find(c => c.id === configId);
                  if (config && setDiscountConfigurationId) {
                    setDiscountConfigurationId(configId);
                    // Update legacy discount type for backward compatibility
                    if (config.code === 'on_duty') {
                      setDiscountType('on_duty');
                    } else if (config.code === 'off_duty') {
                      setDiscountType('off_duty');
                    } else if (config.code === 'no_discount') {
                      setDiscountType('no_discount');
                    } else {
                      // For custom configurations, use a fallback
                      setDiscountType('off_duty');
                    }
                  }
                } else {
                  // Fallback to legacy system
                  setDiscountType(value as StaffDiscountType);
                  if (setDiscountConfigurationId) {
                    setDiscountConfigurationId(null);
                  }
                }
              }}
              placeholder="Select Discount Type"
              className="text-xs"
            />
            {discountConfigsLoading && <p className="text-xs text-gray-500 mt-1">Loading discount options...</p>}
          </div>

          {/* Use House Account */}
          <div className="flex items-center mb-2">
            <input
              id="use-house-account"
              type="checkbox"
              checked={useHouseAccount}
              onChange={(e) => setUseHouseAccount(e.target.checked)}
              disabled={!canUseHouseAccount}
              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <label 
              htmlFor="use-house-account" 
              className={`ml-1 text-xs font-medium ${canUseHouseAccount ? 'text-gray-900' : 'text-gray-400'}`}
            >
              Use House Account
            </label>
          </div>

          {selectedStaffMember && (
            <div className="text-xs text-gray-600 mb-2">
              Balance: ${selectedStaffMember.house_account_balance.toFixed(2)}
              {selectedStaffMember.house_account_balance > 0 && (
                <span className="text-yellow-600"> (deducted on payday)</span>
              )}
            </div>
          )}

          {/* Created By Staff */}
          <div className="mb-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Order Created By
            </label>
            <div className="flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-700">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Current User'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
