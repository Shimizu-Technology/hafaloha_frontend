// src/ordering/components/admin/reservations/LocationCapacityModal.tsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { LocationCapacity, Location } from '../../../services/api-services';

// Modal props
interface LocationCapacityModalProps {
  locationCapacity: Partial<LocationCapacity>;
  location: Location;
  isOpen: boolean;
  onClose: () => void;
  onSave: (locationCapacity: Partial<LocationCapacity>) => Promise<void>;
}

/**
 * Modal component for editing location capacity
 */
const LocationCapacityModal: React.FC<LocationCapacityModalProps> = ({ 
  locationCapacity, 
  location, 
  isOpen,
  onClose, 
  onSave 
}) => {
  // Form state
  const [formData, setFormData] = useState<Partial<LocationCapacity>>({
    id: locationCapacity.id,
    location_id: location.id,
    total_capacity: locationCapacity.total_capacity || 26,
    default_table_capacity: locationCapacity.default_table_capacity || 4
  });
  
  // Form validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof LocationCapacity, string>>>({});
  const [loading, setLoading] = useState(false);

  // Handle input changes
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

  // Validate form data
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onSave(formData);
      toast.success(`Capacity updated for ${location.name}`);
      onClose();
    } catch (error) {
      console.error('Error saving location capacity:', error);
      toast.error('Failed to save capacity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-6 text-amber-600">
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
                errors.total_capacity ? 'border-red-500' : 'border-gray-300 focus:border-amber-600'
              } focus:ring-1 focus:ring-amber-200 outline-none`}
            />
            {errors.total_capacity && (
              <p className="mt-1 text-sm text-red-600">{errors.total_capacity}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of guests this location can accommodate at once
            </p>
          </div>
          
          <div className="mb-6">
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
                errors.default_table_capacity ? 'border-red-500' : 'border-gray-300 focus:border-amber-600'
              } focus:ring-1 focus:ring-amber-200 outline-none`}
            />
            {errors.default_table_capacity && (
              <p className="mt-1 text-sm text-red-600">{errors.default_table_capacity}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Average number of guests per table for this location
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700/90 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationCapacityModal;
