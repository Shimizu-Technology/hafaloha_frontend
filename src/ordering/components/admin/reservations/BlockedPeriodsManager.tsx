// src/ordering/components/admin/reservations/BlockedPeriodsManager.tsx

import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { useLocationDateStore } from '../../../../shared/store/locationDateStore';
import * as tenantUtils from '../../../../shared/utils/tenantUtils';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { AlertCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Import API services and types
import { blockedPeriodsApi, BlockedPeriod, BlockedPeriodParams } from '../../../../shared/api/endpoints/blockedPeriods';
import { locationsApi, Location } from '../../../../shared/api/endpoints/locations';

// Import modals
import BlockedPeriodModal from './modals/BlockedPeriodModal';

// Define location query params type
interface LocationQueryParams {
  restaurant_id?: number;
  active?: boolean;
  is_active?: boolean;
}

// DeleteConfirmationModal Component
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  periodName: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  periodName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-hafaloha-gold">Confirm Deletion</h2>
        <p className="mb-6">Are you sure you want to delete the blocked period for {periodName}?</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export const BlockedPeriodsManager: React.FC = () => {
  // Get restaurant context from store
  const { restaurant } = useRestaurantStore();
  
  // Use shared location and date store instead of local state
  const { 
    selectedLocationId, 
    setSelectedLocationId,
    selectedDate: sharedDate,
    setSelectedDate: setSharedDate
  } = useLocationDateStore();
  
  // Convert string date from store to Date object for local use
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => sharedDate ? new Date(sharedDate) : new Date()
  );

  // Update local Date object when shared date changes
  useEffect(() => {
    if (sharedDate) {
      setSelectedDate(new Date(sharedDate));
    }
  }, [sharedDate]);
  
  // State for locations and blocked periods
  const [locations, setLocations] = useState<Location[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [isLocationsLoading, setIsLocationsLoading] = useState(true);
  const [isPeriodsLoading, setIsPeriodsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedBlockedPeriod, setSelectedBlockedPeriod] = useState<BlockedPeriod | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<BlockedPeriod | null>(null);

  // Load locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLocationsLoading(true);
      
      try {
        // Ensure we have a valid restaurant context
        if (!tenantUtils.validateRestaurantContext(restaurant)) {
          console.warn('No valid restaurant context for locations API call');
          setError('Restaurant context is required');
          return;
        }
        
        const params: LocationQueryParams = { 
          restaurant_id: restaurant?.id,
          is_active: true
        };
        
        const data = await locationsApi.getLocations(params);
        
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setError('Failed to load locations');
      } finally {
        setIsLocationsLoading(false);
      }
    };
    
    fetchLocations();
  }, [restaurant]);

  // Load blocked periods when filters or restaurant changes
  useEffect(() => {
    const loadBlockedPeriods = async () => {
      setIsPeriodsLoading(true);
      setError(null);
      
      try {
        // Ensure we have a valid restaurant context
        if (!tenantUtils.validateRestaurantContext(restaurant)) {
          setError('Restaurant context required');
          return;
        }
        
        // Format date for API - ensure we're just sending the date without time
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        
        // Verify restaurant context and ensure it's not null
        if (!restaurant || !restaurant.id) {
          setError('Valid restaurant context required');
          setIsPeriodsLoading(false);
          return;
        }
        
        // Prepare request params with the correct structure
        const params: BlockedPeriodParams = {
          restaurant_id: restaurant.id,
          active: true,
          start_date: formattedDate,
          end_date: formattedDate
        };
        
        // Add location filter if selected
        if (selectedLocationId) {
          params.location_id = selectedLocationId;
        }
        
        console.log('Fetching blocked periods with params:', params);
        const data = await blockedPeriodsApi.getBlockedPeriods(params);
        setBlockedPeriods(data);
      } catch (error) {
        console.error('Error loading blocked periods:', error);
        setError('Failed to load blocked periods');
      } finally {
        setIsPeriodsLoading(false);
      }
    };

    if (restaurant) {
      loadBlockedPeriods();
    }
  }, [selectedLocationId, selectedDate, restaurant]);
  
  // Also refresh data when modal is closed (after creating/updating a blocked period)
  useEffect(() => {
    if (!showModal && restaurant) {
      // Small delay to ensure the API has completed the previous operation
      const timer = setTimeout(() => {
        const loadData = async () => {
          try {
            // Format date for API
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            
            // Verify restaurant context and ensure it's not null
            if (!restaurant || !restaurant.id) {
              console.error('Missing restaurant context when refreshing data');
              return;
            }
            
            // Prepare request params with the correct structure
            const params: BlockedPeriodParams = {
              restaurant_id: restaurant.id,
              active: true,
              start_date: formattedDate,
              end_date: formattedDate
            };
            
            // Add location filter if selected
            if (selectedLocationId) {
              params.location_id = selectedLocationId;
            }
            
            console.log('Refreshing blocked periods with params:', params);
            const data = await blockedPeriodsApi.getBlockedPeriods(params);
            setBlockedPeriods(data);
          } catch (error) {
            console.error('Error refreshing blocked periods:', error);
          }
        };
        
        loadData();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showModal, restaurant, selectedDate, selectedLocationId]);



  // Open modal to edit an existing blocked period
  const handleEditBlockedPeriod = (period: BlockedPeriod) => {
    setSelectedBlockedPeriod(period);
    setShowModal(true);
  };

  // Show delete confirmation modal
  const handleShowDeleteModal = (period: BlockedPeriod) => {
    setPeriodToDelete(period);
    setIsDeleteModalOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!periodToDelete || !periodToDelete.id) return;

    try {
      await blockedPeriodsApi.deleteBlockedPeriod(periodToDelete.id);
      
      // Refresh the blocked periods list
      const updatedPeriods = blockedPeriods.filter(p => p.id !== periodToDelete.id);
      setBlockedPeriods(updatedPeriods);
      
      // Close modal and show success message
      setIsDeleteModalOpen(false);
      setPeriodToDelete(null);
      toast.success('Blocked period deleted successfully');
    } catch (err) {
      console.error('Error deleting blocked period:', err);
      toast.error('Failed to delete blocked period');
    }
  };

  // Handle form submission from modal
  const handleSaveBlockedPeriod = async (blockedPeriodData: Partial<BlockedPeriod>) => {
    // Ensure we have a valid restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      toast.error('Restaurant context required');
      return;
    }

    try {
      // Add the restaurant_id
      blockedPeriodData.restaurant_id = restaurant?.id;

      if (blockedPeriodData.id) {
        // Update existing
        await blockedPeriodsApi.updateBlockedPeriod(blockedPeriodData.id, blockedPeriodData);
        toast.success('Blocked period updated');
      } else {
        // Create new
        await blockedPeriodsApi.createBlockedPeriod(blockedPeriodData as BlockedPeriod);
        toast.success('Blocked period created');
      }

      // Refresh data after a short delay to ensure backend has processed the change
      setTimeout(async () => {
        try {
          const formattedDate = format(selectedDate, 'yyyy-MM-dd');
          const params: any = {
            active: true,
            start_date: formattedDate,
            end_date: formattedDate
          };
          
          if (selectedLocationId) {
            params.location_id = selectedLocationId;
          }
          
          const data = await blockedPeriodsApi.getBlockedPeriods(params);
          setBlockedPeriods(data);
        } catch (error) {
          console.error('Error refreshing blocked periods:', error);
        }
      }, 300);
    } catch (error) {
      console.error('Error saving blocked period:', error);
      toast.error('Failed to save blocked period');
    }
  };

  // Find location name by ID
  const getLocationName = (locationId?: number): string => {
    if (!locationId) return 'All Locations';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  // Format date for display with proper timezone handling
  const formatDateTime = (dateString: string): string => {
    try {
      // Create a date object - this will be in local timezone
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString || 'Invalid date';
    }
  };
  
  // Format selected date is handled directly in the input value

  return (
    <div className="h-full flex flex-col p-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}

      {/* Page header with title and action button */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Blocked Periods</h2>
        
        {/* Add blocked period button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-hafaloha-gold text-white rounded-md text-sm font-medium hover:bg-hafaloha-gold/90 transition-colors flex items-center justify-center"
        >
          <span className="mr-1">+</span> Add Blocked Period
        </button>
      </div>

      {/* Filters section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Location selector */}
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <select
              value={selectedLocationId || ''}
              onChange={(e) => setSelectedLocationId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-1 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold outline-none"
              disabled={isLocationsLoading}
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Date picker with navigation arrows */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <div className="flex items-center space-x-2">
              {/* Previous day button */}
              <button
                onClick={() => {
                  const prevDay = new Date(selectedDate);
                  prevDay.setDate(prevDay.getDate() - 1);
                  setIsPeriodsLoading(true);
                  
                  // Update both local state and shared store
                  setSelectedDate(prevDay);
                  
                  // Update the shared store with formatted date string
                  const formattedDate = format(prevDay, 'yyyy-MM-dd');
                  setSharedDate(formattedDate);
                }}
                className="p-2 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Previous day"
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4 text-hafaloha-gold" />
              </button>
              
              {/* Date picker with icon */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) {
                      setIsPeriodsLoading(true);
                      
                      // Update both local state and shared store
                      const newDate = new Date(e.target.value);
                      setSelectedDate(newDate);
                      
                      // Update the shared store with the formatted date string
                      setSharedDate(e.target.value); // Input value is already in yyyy-MM-dd format
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-1 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold outline-none"
                />
              </div>
              
              {/* Next day button */}
              <button
                onClick={() => {
                  const nextDay = new Date(selectedDate);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setIsPeriodsLoading(true);
                  
                  // Update both local state and shared store
                  setSelectedDate(nextDay);
                  
                  // Update the shared store with formatted date string
                  const formattedDate = format(nextDay, 'yyyy-MM-dd');
                  setSharedDate(formattedDate);
                }}
                className="p-2 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Next day"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4 text-hafaloha-gold" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content container with min-height to prevent layout shifts */}
      <div className="flex-1 min-h-[400px] flex flex-col relative transition-all duration-300 ease-in-out">
        {/* Loading state with skeleton loader */}
        <div className={`rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden absolute inset-0 transition-opacity duration-300 ${isPeriodsLoading ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="divide-y divide-gray-100">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-24 bg-gray-100 rounded animate-pulse self-end"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Blocked periods table - shown when data is loaded */}
        <div className={`rounded-lg border border-gray-100 shadow-sm overflow-hidden transition-opacity duration-300 ${!isPeriodsLoading && blockedPeriods.length > 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          <table className="min-w-full table-auto divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Time
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blockedPeriods.map((period) => (
                <tr key={period.id} className="hover:bg-hafaloha-gold/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {getLocationName(period.location_id)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDateTime(period.start_time)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDateTime(period.end_time)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {period.reason}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-medium rounded-md ${
                      period.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {period.status === 'active' ? 'Active' : 'Cancelled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditBlockedPeriod(period)}
                      className="px-2.5 py-1 text-hafaloha-gold bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 rounded-md border border-hafaloha-gold/20 transition-colors mr-2"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleShowDeleteModal(period)}
                      className="px-2.5 py-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Empty state */}
        <div className={`bg-white border border-gray-100 rounded-lg p-8 text-center shadow-sm transition-opacity duration-300 ${!isPeriodsLoading && blockedPeriods.length === 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No blocked periods found</h3>
          <p className="text-gray-500 mb-4">There are no blocked periods for the selected date and location.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-hafaloha-gold text-white rounded-md text-sm font-medium hover:bg-hafaloha-gold/90 transition-colors inline-flex items-center"
          >
            <span className="mr-1">+</span> Add Blocked Period
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <BlockedPeriodModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveBlockedPeriod}
          blockedPeriod={selectedBlockedPeriod}
          locations={locations}
          restaurantId={restaurant?.id || 0}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        periodName={periodToDelete ? 
          `${getLocationName(periodToDelete.location_id)} (${formatDateTime(periodToDelete.start_time)})` : 
          ''
        }
      />
    </div>
  );
};

export default BlockedPeriodsManager;
