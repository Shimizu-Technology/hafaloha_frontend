// src/ordering/components/admin/reservations/LocationCapacitiesManager.tsx

import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { useLocationDateStore } from '../../../../shared/store/locationDateStore';
import * as tenantUtils from '../../../../shared/utils/tenantUtils';
import { toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// Import API services and types
import { 
  locationCapacitiesApi, 
  locationsApi,
  type LocationCapacity, 
  type Location 
} from '../../../services/api-services';

// Import the modal component
import LocationCapacityModal from './LocationCapacityModal';

/**
 * LocationCapacitiesManager component
 * Manages location capacities within the Admin Dashboard with proper tenant isolation
 */
export const LocationCapacitiesManager: React.FC = () => {
  // Get restaurant context from store
  const { restaurant } = useRestaurantStore();
  
  // Get location from shared store
  const { selectedLocationId, setSelectedLocationId } = useLocationDateStore();
  
  // State for locations and capacities
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationCapacities, setLocationCapacities] = useState<LocationCapacity[]>([]);
  
  // UI state
  const [isLocationsLoading, setIsLocationsLoading] = useState(true);
  const [isCapacitiesLoading, setIsCapacitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<LocationCapacity | null>(null);

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
        
        const data = await locationsApi.getLocations({ 
          is_active: true 
        });
        
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

  // Load location capacities
  useEffect(() => {
    const loadLocationCapacities = async () => {
      if (!restaurant) return;
      
      setIsCapacitiesLoading(true);
      setError(null);
      
      try {
        // Ensure we have a valid restaurant context
        if (!tenantUtils.validateRestaurantContext(restaurant)) {
          setError('Restaurant context required');
          return;
        }
        
        const data = await locationCapacitiesApi.getLocationCapacities({
          restaurant_id: restaurant.id
        });
        
        setLocationCapacities(data);
      } catch (error) {
        console.error('Error loading location capacities:', error);
        setError('Failed to load location capacities');
      } finally {
        setIsCapacitiesLoading(false);
      }
    };

    loadLocationCapacities();
  }, [restaurant]);
  
  // Effect to synchronize with the shared location store
  useEffect(() => {
    if (locations.length === 0 || !selectedLocationId) return;
    
    // If a location is selected in the shared store, find and set it in the local state
    const locationFromStore = locations.find(loc => loc.id === selectedLocationId);
    if (locationFromStore) {
      setSelectedLocation(locationFromStore);
      
      // Find capacity for the location in the shared store
      const capacityFromStore = locationCapacities.find(cap => cap.location_id === selectedLocationId);
      if (capacityFromStore) {
        setSelectedCapacity(capacityFromStore);
      }
    }
  }, [locations, locationCapacities, selectedLocationId]);

  // Display loading state while data is being fetched
  if (isLocationsLoading || isCapacitiesLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading location capacities...</p>
      </div>
    );
  }

  // Display error state if fetching failed
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }

  // Handle edit for a specific location's capacity
  const handleEditLocationCapacity = (location: Location) => {
    // Find if there's already a capacity record for this location
    const existingCapacity = locationCapacities.find(
      cap => cap.location_id === location.id
    );
    
    // Update local component state
    setSelectedLocation(location);
    setSelectedCapacity(existingCapacity || {
      location_id: location.id,
      total_capacity: 26,
      default_table_capacity: 4
    } as LocationCapacity);
    
    // Update the shared location store to maintain consistency across tabs
    setSelectedLocationId(location.id);
    
    setIsModalOpen(true);
  };
  
  // Save location capacity (create or update)
  const handleSaveCapacity = async (data: Partial<LocationCapacity>) => {
    try {
      // Ensure we have a valid restaurant context
      if (!tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Restaurant context required');
      }
      
      // Create capacity data with proper restaurant context
      const capacityData = {
        ...data,
        restaurant_id: restaurant?.id
      };
      
      if (data.id) {
        // Update existing capacity
        await locationCapacitiesApi.updateLocationCapacity(data.id, capacityData);
        toast.success('Location capacity updated successfully');
      } else {
        // Create new capacity
        await locationCapacitiesApi.createLocationCapacity(capacityData as Omit<LocationCapacity, 'id'>);
        toast.success('Location capacity created successfully');
      }
      
      // Refresh data to show the updated capacities
      const refreshedData = await locationCapacitiesApi.getLocationCapacities({
        restaurant_id: restaurant?.id
      });
      setLocationCapacities(refreshedData);
    } catch (error) {
      console.error('Error saving location capacity:', error);
      toast.error('Failed to save location capacity');
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}

      {/* Page header with title and potential action button */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Location Capacities</h2>
        <p className="text-gray-600">
          Manage seating capacities for each location to optimize reservation availability.
        </p>
      </div>
      
      {/* Content container with min-height to prevent layout shifts */}
      <div className="flex-1 min-h-[400px] flex flex-col relative transition-all duration-300 ease-in-out">
        {/* Loading state with skeleton loader */}
        <div className={`rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden absolute inset-0 transition-opacity duration-300 ${isLocationsLoading || isCapacitiesLoading ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
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
        
        {/* Locations capacities table - shown when data is loaded */}
        <div className={`rounded-lg border border-gray-100 shadow-sm overflow-hidden transition-opacity duration-300 ${!isLocationsLoading && !isCapacitiesLoading && locations.length > 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          <table className="min-w-full table-auto divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Capacity
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Table Capacity
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
              {locations?.map((location) => {
                // Find capacity for this location
                const capacity = locationCapacities.find(
                  cap => cap.location_id === location.id
                );
                
                return (
                  <tr 
                    key={location.id} 
                    className={`hover:bg-hafaloha-gold/5 cursor-pointer transition-colors ${selectedLocationId === location.id ? 'bg-hafaloha-gold/10' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {location.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {capacity?.total_capacity || 'Not set'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {capacity?.default_table_capacity || 'Not set'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-4 font-medium rounded-md ${location.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'}`}
                      >
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditLocationCapacity(location)}
                        className="px-2.5 py-1 text-hafaloha-gold bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 rounded-md border border-hafaloha-gold/20 transition-colors"
                        aria-label="Edit capacity"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Empty state */}
        <div className={`bg-white border border-gray-100 rounded-lg p-8 text-center shadow-sm transition-opacity duration-300 ${!isLocationsLoading && !isCapacitiesLoading && locations.length === 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
          <p className="text-gray-500 mb-4">There are no locations configured in the system.</p>
        </div>
      </div>
      
      {/* Location capacity edit modal */}
      {isModalOpen && selectedLocation && (
        <LocationCapacityModal
          locationCapacity={selectedCapacity || {}}
          location={selectedLocation}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCapacity}
        />
      )}
    </div>
  );
};

export default LocationCapacitiesManager;
