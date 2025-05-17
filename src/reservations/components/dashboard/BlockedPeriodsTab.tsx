// src/reservations/components/dashboard/BlockedPeriodsTab.tsx
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BlockedPeriod, blockedPeriodsApi } from '../../services/table-management-api';
import { Location, locationsApi } from '../../services/locations-api';
import * as tenantUtils from '../../../shared/utils/tenantUtils';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';

// Modal for creating/editing blocked periods
interface BlockedPeriodModalProps {
  blockedPeriod: Partial<BlockedPeriod> | null;
  locations: Location[];
  onClose: () => void;
  onSave: (blockedPeriod: Partial<BlockedPeriod>) => Promise<void>;
}

const BlockedPeriodModal: React.FC<BlockedPeriodModalProps> = ({ blockedPeriod, locations, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<BlockedPeriod>>(
    blockedPeriod || {
      location_id: undefined,
      start_time: '',
      end_time: '',
      reason: '',
      status: 'active'
    }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BlockedPeriod, string>>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (errors[name as keyof BlockedPeriod]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Location selection happens directly in select onChange handler

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BlockedPeriod, string>> = {};
    
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }
    
    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }
    
    if (formData.start_time && formData.end_time && 
        new Date(formData.start_time) >= new Date(formData.end_time)) {
      newErrors.end_time = 'End time must be after start time';
    }
    
    if (!formData.reason) {
      newErrors.reason = 'Reason is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving blocked period:', error);
      setErrors({ reason: 'Failed to save blocked period. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[#0078d4]">
          {blockedPeriod?.id ? 'Edit Blocked Period' : 'Create New Blocked Period'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (Optional)
            </label>
            <select
              value={formData.location_id || ''}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full border border-gray-300 rounded-md p-2 text-sm">
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time ? formData.start_time.slice(0, 16) : ''}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.start_time ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.start_time && (
              <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              name="end_time"
              value={formData.end_time ? formData.end_time.slice(0, 16) : ''}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.end_time ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_time && (
              <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Reason for blocking this time period"
            />
            {errors.reason && (
              <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0078d4] hover:bg-[#50a3d9] border border-transparent rounded-md shadow-sm text-sm font-medium text-white"
              disabled={loading}
            >
              {loading ? 'Saving...' : blockedPeriod?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main component
export default function BlockedPeriodsTab() {
  // Get restaurant context from store
  const { restaurant } = useRestaurantStore();
  
  // Get locations data directly from API
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLocationsLoading, setIsLocationsLoading] = useState(true);
  
  // Fetch locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Ensure we have a valid restaurant context from the store
        if (!tenantUtils.validateRestaurantContext(restaurant)) {
          console.warn('No valid restaurant context found');
          setLocations([]);
          return;
        }
        
        // Use our locations API service with proper restaurant context
        console.log('Fetching locations via API service');
        const data = await locationsApi.getLocations({ 
          is_active: true 
        });
        console.log('Locations loaded:', data);
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLocationsLoading(false);
      }
    };
    
    fetchLocations();
  }, [restaurant]); // Re-run when restaurant context changes
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Load blocked periods
  const loadBlockedPeriods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Ensure we have a valid restaurant context from the store
      if (!tenantUtils.validateRestaurantContext(restaurant)) {
        setError('Restaurant context required. Please try again.');
        return;
      }
      
      // Format date for API
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Prepare request params with restaurant context
      const params: any = {
        active: true,
        start_date: formattedDate,
        end_date: formattedDate,
        restaurant_id: restaurant!.id
      };
      
      // Add location filter if selected
      if (selectedLocationId) {
        params.location_id = selectedLocationId;
      }
      
      const data = await blockedPeriodsApi.getBlockedPeriods(params);
      setBlockedPeriods(data);
    } catch (error) {
      console.error('Error loading blocked periods:', error);
      setError('Failed to load blocked periods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or filters or restaurant context changes
  useEffect(() => {
    if (restaurant) {
      loadBlockedPeriods();
    }
  }, [selectedLocationId, selectedDate, restaurant]);

  // Handle location change
  const handleLocationChange = (locationId: number | null) => {
    setSelectedLocationId(locationId);
  };

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Open modal for editing existing blocked period
  const handleEditBlockedPeriod = (blockedPeriod: BlockedPeriod) => {
    setSelectedBlockedPeriod(blockedPeriod);
    setShowModal(true);
  };

  // Handle delete blocked period
  const handleDeleteBlockedPeriod = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this blocked period?')) {
      return;
    }
    
    try {
      await blockedPeriodsApi.deleteBlockedPeriod(id);
      // Refresh data
      loadBlockedPeriods();
    } catch (error) {
      console.error('Error deleting blocked period:', error);
      setError('Failed to delete blocked period. Please try again.');
    }
  };

  // Handle save for a blocked period
  const handleSaveBlockedPeriod = async (blockedPeriod: Partial<BlockedPeriod>) => {
    try {
      // Ensure we have a valid restaurant context from the store
      if (!tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Restaurant context required');
      }
      
      // Prepare data with proper restaurant context
      const data = {
        ...blockedPeriod,
        restaurant_id: restaurant!.id
      };
      
      if (blockedPeriod.id) {
        // Update existing
        await blockedPeriodsApi.updateBlockedPeriod(blockedPeriod.id, data);
      } else {
        // Create new - cast to any to avoid TypeScript errors
        await blockedPeriodsApi.createBlockedPeriod(data as any);
      }
      
      // Refresh the list
      loadBlockedPeriods();
      
      // Close the modal
      setShowModal(false);
    } catch (error) {
      console.error('Error saving blocked period:', error);
      throw error;
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [selectedBlockedPeriod, setSelectedBlockedPeriod] = useState<BlockedPeriod | null>(null);

  return (
    <div className="h-full p-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Filters and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedLocationId || ''}
            onChange={(e) => handleLocationChange(e.target.value ? parseInt(e.target.value) : null)}
            className="border rounded-md p-2 text-sm mr-2">
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          {isLocationsLoading && <span className="ml-2 text-sm text-gray-500">Loading locations...</span>}
          
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="MM/dd/yyyy"
            className="border rounded-md p-2 w-full"
          />
        </div>
        
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-[#0078d4] hover:bg-[#50a3d9] text-white px-4 py-2 rounded-md inline-flex items-center"
        >
          <span className="mr-2" role="img" aria-label="Add">➕</span>
          Add Blocked Period
        </button>
      </div>
      
      {/* Blocked periods table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full table-auto divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                  Loading blocked periods...
                </td>
              </tr>
            ) : blockedPeriods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                  No blocked periods found for the selected date and location.
                </td>
              </tr>
            ) : (
              blockedPeriods.map((period) => (
                <tr key={period.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {period.location_id 
                      ? locations?.find(l => l.id === period.location_id)?.name || 'Unknown'
                      : 'All Locations'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {format(parseISO(period.start_time), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {format(parseISO(period.end_time), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {period.reason}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      period.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {period.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBlockedPeriod(period)}
                        className="text-[#0078d4] hover:text-[#50a3d9] p-1"
                      >
                        <span role="img" aria-label="Edit">✏️</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBlockedPeriod(period.id!)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <span role="img" aria-label="Delete">🗑️</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for creating/editing blocked periods */}
      {showModal && (
        <BlockedPeriodModal
          blockedPeriod={selectedBlockedPeriod}
          locations={locations || []}
          onClose={() => setShowModal(false)}
          onSave={handleSaveBlockedPeriod}
        />
      )}
    </div>
  );
}
