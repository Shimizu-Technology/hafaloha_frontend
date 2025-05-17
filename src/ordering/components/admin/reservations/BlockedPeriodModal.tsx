// src/ordering/components/admin/reservations/BlockedPeriodModal.tsx

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Import types from the API services
import type { BlockedPeriod, Location } from '../../../services/api-services';

interface BlockedPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blockedPeriod: Partial<BlockedPeriod>) => Promise<void>;
  blockedPeriod: BlockedPeriod | null; // If provided, we're in edit mode
  locations: Location[];
}

/**
 * Modal component for creating or editing blocked periods
 */
export function BlockedPeriodModal({ isOpen, onClose, onSave, blockedPeriod, locations }: BlockedPeriodModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Format date and time for form inputs
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  };
  
  const formatTimeForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[1].substring(0, 5); // Returns HH:MM
  };
  
  // Form state
  const [formData, setFormData] = useState<{
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    reason: string;
    location_id: string;
  }>({
    start_date: blockedPeriod ? formatDateForInput(blockedPeriod.start_time) : '',
    start_time: blockedPeriod ? formatTimeForInput(blockedPeriod.start_time) : '',
    end_date: blockedPeriod ? formatDateForInput(blockedPeriod.end_time) : '',
    end_time: blockedPeriod ? formatTimeForInput(blockedPeriod.end_time) : '',
    reason: blockedPeriod?.reason || '',
    location_id: blockedPeriod?.location_id ? String(blockedPeriod.location_id) : '',
  });
  
  // Validation state
  const [errors, setErrors] = useState<{
    start_date?: string;
    start_time?: string;
    end_date?: string;
    end_time?: string;
    reason?: string;
    dateRange?: string;
  }>({});
  
  // Initialize form with existing data or defaults
  const initFormData = () => {
    if (blockedPeriod) {
      const startDate = blockedPeriod.start_time ? new Date(blockedPeriod.start_time) : new Date();
      const endDate = blockedPeriod.end_time ? new Date(blockedPeriod.end_time) : new Date();
      
      // Format without timezone adjustments to display local time
      return {
        start_date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        end_time: format(endDate, 'HH:mm'),
        location_id: blockedPeriod.location_id?.toString() || '',
        reason: blockedPeriod.reason || '',
      };
    }
    
    // Default to current date and times
    const today = new Date();
    return {
      start_date: format(today, 'yyyy-MM-dd'),
      start_time: '12:00',
      end_date: format(today, 'yyyy-MM-dd'),
      end_time: '14:00',
      location_id: '',
      reason: '',
    };
  };
  
  // Initialize form data if editing an existing blocked period
  useEffect(() => {
    setFormData(initFormData());
  }, [blockedPeriod, isOpen]);
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors for the field being changed
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Validate the form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    
    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    
    // Check if start date/time is before end date/time
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
    
    if (startDateTime >= endDateTime) {
      newErrors.dateRange = 'End time must be after start time';
    }
    
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Create date objects in local timezone
      const localStartDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const localEndDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      
      // Prepare data object for API - use local time
      const blockedPeriodData: Partial<BlockedPeriod> = {
        id: blockedPeriod?.id,
        location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
        start_time: localStartDateTime.toISOString(),
        end_time: localEndDateTime.toISOString(),
        reason: formData.reason,
        status: 'active',
      };
      
      
      // Call the onSave callback passed from parent
      await onSave(blockedPeriodData);
      // Toast is now handled in the parent component
      onClose();
    } catch (error) {
      console.error('Error saving blocked period:', error);
      toast.error('Failed to save blocked period');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold px-6 pt-6 pb-4">
          {blockedPeriod ? 'Edit Blocked Period' : 'Create Blocked Period'}
        </h2>
        
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-6">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`w-full rounded-md border ${
                  errors.start_date ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>
            
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className={`w-full rounded-md border ${
                  errors.start_time ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
              )}
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={`w-full rounded-md border ${
                  errors.end_date ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
              )}
            </div>
            
            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className={`w-full rounded-md border ${
                  errors.end_time ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
              )}
            </div>
            
            {/* Date Range Error */}
            {errors.dateRange && (
              <p className="mt-1 text-sm text-red-600">{errors.dateRange}</p>
            )}
            
            {/* Location Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (Optional)
              </label>
              <select
                name="location_id"
                value={formData.location_id}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Leave blank to block all locations</p>
            </div>
            
            {/* Reason Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={3}
                className={`w-full rounded-md border ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                placeholder="Enter reason for blocking this time period"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium"
            >
              {loading ? 'Saving...' : blockedPeriod ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlockedPeriodModal;
