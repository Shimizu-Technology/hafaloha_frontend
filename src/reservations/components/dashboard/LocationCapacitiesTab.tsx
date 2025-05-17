// src/reservations/components/dashboard/LocationCapacitiesTab.tsx
import React, { useState, useEffect } from 'react';
import { LocationCapacity, locationCapacitiesApi } from '../../services/table-management-api';
import * as tenantUtils from '../../../shared/utils/tenantUtils';
import { locationsApi } from '../../services/locations-api';
import { Location } from '../../../shared/types/Location';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';

// Modal for editing location capacity
interface LocationCapacityModalProps {
  locationCapacity: Partial<LocationCapacity>;
  location: Location;
  onClose: () => void;
  onSave: (locationCapacity: Partial<LocationCapacity>) => Promise<void>;
}

const LocationCapacityModal: React.FC<LocationCapacityModalProps> = ({ 
  locationCapacity, 
  location, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<Partial<LocationCapacity>>({
    id: locationCapacity.id,
    location_id: location.id,
    total_capacity: locationCapacity.total_capacity || 26,
    default_table_capacity: locationCapacity.default_table_capacity || 4
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LocationCapacity, string>>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);
    
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({ ...prev, [name]: numValue }));
      
      // Clear error when field is updated
      if (errors[name as keyof LocationCapacity]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof LocationCapacity, string>> = {};
    
    if (!formData.total_capacity || formData.total_capacity <= 0) {
      newErrors.total_capacity = 'Total capacity must be greater than 0';
    }
    
    if (!formData.default_table_capacity || formData.default_table_capacity <= 0) {
      newErrors.default_table_capacity = 'Default table capacity must be greater than 0';
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
      console.error('Error saving location capacity:', error);
      setErrors({ total_capacity: 'Failed to save capacity. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[#0078d4]">
          Edit Capacity for {location.name}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Seating Capacity
            </label>
            <input
              type="number"
              name="total_capacity"
              value={formData.total_capacity}
              onChange={handleChange}
              min={1}
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.total_capacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.total_capacity && (
              <p className="text-red-500 text-xs mt-1">{errors.total_capacity}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Maximum number of guests that can be seated at this location.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Table Capacity
            </label>
            <input
              type="number"
              name="default_table_capacity"
              value={formData.default_table_capacity}
              onChange={handleChange}
              min={1}
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.default_table_capacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.default_table_capacity && (
              <p className="text-red-500 text-xs mt-1">{errors.default_table_capacity}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Default capacity for each table when specific table assignments are not used.
            </p>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main component
export default function LocationCapacitiesTab() {
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
          setLocations([]);
          return;
        }
        
        // Use the tenant-aware locationsApi service with restaurant context
        const data = await locationsApi.getLocations({ 
          is_active: true 
        });
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLocationsLoading(false);
      }
    };
    
    fetchLocations();
  }, [restaurant]); // Re-run when restaurant context changes
  const [locationCapacities, setLocationCapacities] = useState<LocationCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<LocationCapacity | null>(null);

  // Load location capacities
  const loadLocationCapacities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Ensure we have a valid restaurant context from the store
      if (!tenantUtils.validateRestaurantContext(restaurant)) {
        setError('Restaurant context required. Please try again.');
        return;
      }
      
      // Use restaurant context from the store but handle type safely
      // Cast to any to avoid TypeScript errors with the restaurant_id parameter
      const data = await locationCapacitiesApi.getLocationCapacities({
        restaurant_id: restaurant!.id
      } as any);
      setLocationCapacities(data);
    } catch (error) {
      console.error('Error loading location capacities:', error);
      setError('Failed to load location capacities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or restaurant changes
  useEffect(() => {
    if (restaurant) {
      loadLocationCapacities();
    }
  }, [restaurant]);

  // Handle edit for a specific location's capacity
  const handleEditLocationCapacity = (location: Location) => {
    // Find if there's already a capacity record for this location
    const existingCapacity = locationCapacities.find(cap => cap.location_id === location.id);
    
    setSelectedLocation(location);
    setSelectedCapacity(existingCapacity || {
      location_id: location.id,
      total_capacity: 26,
      default_table_capacity: 4
    } as LocationCapacity);
    setShowModal(true);
  };

  // Save location capacity (create or update)
  const handleSaveCapacity = async (data: Partial<LocationCapacity>) => {
    try {
      // Ensure we have a valid restaurant context from the store
      if (!tenantUtils.validateRestaurantContext(restaurant)) {
        throw new Error('Restaurant context required');
      }
      
      // Create capacity data with proper restaurant context
      // We've already validated restaurant is not null above
      const capacityData = {
        ...data,
        restaurant_id: restaurant!.id
      };
      
      if (data.id) {
        // Update existing
        await locationCapacitiesApi.updateLocationCapacity(data.id, capacityData);
      } else {
        // Create new
        await locationCapacitiesApi.createLocationCapacity(capacityData as Omit<LocationCapacity, 'id'>);
      }
      
      // Refresh data
      loadLocationCapacities();
      // Close modal
      setShowModal(false);
    } catch (error) {
      console.error('Error saving location capacity:', error);
      throw error;
    }
  };

  return (
    <div className="h-full p-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Location Capacities</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage seating capacities for each location to optimize reservation availability.
          </p>
        </div>
        
        {/* Location capacities table */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Capacity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Table Capacity
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
              {loading || isLocationsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading location capacities...
                  </td>
                </tr>
              ) : locations?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    No locations found. Please create locations first.
                  </td>
                </tr>
              ) : (
                locations?.map((location) => {
                  // Find capacity for this location
                  const capacity = locationCapacities.find(
                    cap => cap.location_id === location.id
                  );
                  
                  return (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {location.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {capacity?.total_capacity || 'Not set'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {capacity?.default_table_capacity || 'Not set'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          location.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {location.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleEditLocationCapacity(location)}
                          className="text-[#0078d4] hover:text-[#50a3d9] p-2"
                        >
                          <span role="img" aria-label="Edit">✏️</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for editing location capacity */}
      {showModal && selectedLocation && (
        <LocationCapacityModal
          locationCapacity={selectedCapacity || {}}
          location={selectedLocation}
          onClose={() => setShowModal(false)}
          onSave={handleSaveCapacity}
        />
      )}
    </div>
  );
}
