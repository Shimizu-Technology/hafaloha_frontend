import React, { useEffect, useState } from 'react';
import { useStaffFilters, PRESET_OPTIONS } from './StaffFilterContext';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { apiClient } from '../../../shared/api/apiClient';
import toastUtils from '../../../shared/utils/toastUtils';

interface StaffMember {
  id: number;
  name: string;
  position: string;
  active: boolean;
}

export function StaffFilterBar() {
  const { filters, updateFilters, resetFilters, isFilterActive } = useStaffFilters();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Fetch staff members for the dropdown
  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    setLoadingStaff(true);
    try {
      const response = await apiClient.get('/staff_members?active=true');
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        setStaffMembers(response.data);
      } else if (response.data && Array.isArray(response.data.staff_members)) {
        setStaffMembers(response.data.staff_members);
      } else {
        console.error('Unexpected staff members response format:', response.data);
        setStaffMembers([]);
      }
    } catch (err: any) {
      console.error('Error fetching staff members:', err);
      toastUtils.error('Failed to fetch staff members');
      setStaffMembers([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Handle date range changes
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    updateFilters({
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    });
  };

  // Handle preset changes
  const handlePresetChange = (value: string) => {
    const preset = value as typeof filters.preset;
    updateFilters({ preset });
  };

  // Handle staff member selection
  const handleStaffChange = (value: string) => {
    const staffMemberId = value === 'all' ? 'all' : parseInt(value);
    updateFilters({ staffMemberId });
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm mb-6 border border-gray-200">
      <div className="flex flex-col space-y-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Preset Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <MobileSelect
              options={PRESET_OPTIONS.map(preset => ({
                value: preset.value,
                label: preset.label
              }))}
              value={filters.preset}
              onChange={handlePresetChange}
              className="w-full h-10"
              placeholder="Select date range"
            />
          </div>

          {/* From Date - Only show if custom is selected */}
          {filters.preset === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
          )}

          {/* To Date - Only show if custom is selected */}
          {filters.preset === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
          )}

          {/* Staff Member Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member
            </label>
                         <MobileSelect
               options={[
                 { 
                   value: 'all', 
                   label: loadingStaff 
                     ? 'Loading...' 
                     : `All Staff (${staffMembers.length})` 
                 },
                 ...staffMembers.map(staff => ({
                   value: staff.id.toString(),
                   label: `${staff.name} (${staff.position})`
                 }))
               ]}
               value={filters.staffMemberId === 'all' ? 'all' : filters.staffMemberId.toString()}
               onChange={handleStaffChange}
               className="w-full h-10"
               placeholder="Select staff member"
             />
          </div>
        </div>

        {/* Active Filter Indicators */}
        {isFilterActive && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Active filters:</span>
            
            {filters.staffMemberId !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Staff: {staffMembers.find(s => s.id === filters.staffMemberId)?.name || filters.staffMemberId}
                <button
                  onClick={() => updateFilters({ staffMemberId: 'all' })}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.preset !== 'custom' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {PRESET_OPTIONS.find(p => p.value === filters.preset)?.label}
              </span>
            )}
            
            {filters.preset === 'custom' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {filters.dateRange.from} to {filters.dateRange.to}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 