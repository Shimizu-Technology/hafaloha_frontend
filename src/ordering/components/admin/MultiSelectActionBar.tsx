import React, { useState } from 'react';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';

interface MultiSelectActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkAsReady: () => void;
  onMarkAsCompleted: () => void;
  onMarkAsCancelled: () => void;
  isProcessing?: boolean;
}

export function MultiSelectActionBar({
  selectedCount,
  onClearSelection,
  onMarkAsReady,
  onMarkAsCompleted,
  onMarkAsCancelled,
  isProcessing = false
}: MultiSelectActionBarProps) {
  const [selectedAction, setSelectedAction] = useState('');
  
  // Define batch action options
  const batchActionOptions = [
    { value: '', label: 'Batch Actions' },
    { value: 'ready', label: 'Mark as Ready' },
    { value: 'completed', label: 'Mark as Completed' },
    { value: 'cancelled', label: 'Mark as Cancelled' }
  ];
  
  // Handle action change
  const handleActionChange = (value: string) => {
    if (value === 'ready') onMarkAsReady();
    if (value === 'completed') onMarkAsCompleted();
    if (value === 'cancelled') onMarkAsCancelled();
    // Reset selection after action
    setSelectedAction('');
  };
  
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-20 animate-slideUp safe-bottom">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center mb-2 sm:mb-0 w-full sm:w-auto justify-between">
          <span className="font-medium text-gray-700 mr-3">
            {selectedCount} {selectedCount === 1 ? 'order' : 'orders'} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-700 text-sm underline py-1 px-2"
            aria-label="Clear selection"
          >
            Clear selection
          </button>
        </div>
        
        <div className="flex w-full sm:w-auto">
          <div className="w-full sm:w-auto" style={{ minWidth: '180px' }}>
            <MobileSelect
              options={batchActionOptions}
              value={selectedAction}
              onChange={handleActionChange}
              placeholder="Batch Actions"
              className={isProcessing ? 'opacity-50 pointer-events-none' : ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
