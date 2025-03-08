import React from 'react';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';

export type DateFilterOption = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom';

interface DateFilterProps {
  selectedOption: DateFilterOption;
  onOptionChange: (option: DateFilterOption) => void;
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

export function DateFilter({ 
  selectedOption, 
  onOptionChange, 
  startDate, 
  endDate, 
  onDateRangeChange 
}: DateFilterProps) {
  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleDateOptionChange = (value: string) => {
    onOptionChange(value as DateFilterOption);
  };

  // Custom date range picker (only shown when 'custom' is selected)
  const renderCustomDatePicker = () => {
    if (selectedOption !== 'custom') return null;

    return (
      <div className="mt-2 flex space-x-2">
        <input
          type="date"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={startDate ? formatDateForInput(startDate) : ''}
          onChange={(e) => {
            const newStartDate = e.target.value ? new Date(e.target.value) : new Date();
            if (onDateRangeChange && endDate) {
              onDateRangeChange(newStartDate, endDate);
            }
          }}
        />
        <span className="self-center text-gray-500">to</span>
        <input
          type="date"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={endDate ? formatDateForInput(endDate) : ''}
          onChange={(e) => {
            const newEndDate = e.target.value ? new Date(e.target.value) : new Date();
            if (onDateRangeChange && startDate) {
              onDateRangeChange(startDate, newEndDate);
            }
          }}
        />
      </div>
    );
  };

  // Helper to format date for input element
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div>
      <MobileSelect
        options={dateOptions}
        value={selectedOption}
        onChange={handleDateOptionChange}
        placeholder="Select date range"
      />
      {renderCustomDatePicker()}
    </div>
  );
}
