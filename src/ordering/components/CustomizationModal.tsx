import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { MenuItem } from '../types/menu';

interface CustomizationModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, customizations: Record<string, string[]>) => void;
}

export function CustomizationModal({ item, onClose, onAddToCart }: CustomizationModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const handleOptionToggle = (category: string, option: string, maxChoices: number = Infinity) => {
    setSelections(prev => {
      const current = prev[category] || [];
      if (current.includes(option)) {
        return {
          ...prev,
          [category]: current.filter(o => o !== option)
        };
      }
      if (current.length >= maxChoices) {
        return {
          ...prev,
          [category]: [...current.slice(1), option]
        };
      }
      return {
        ...prev,
        [category]: [...current, option]
      };
    });
  };

  const handleSubmit = () => {
    onAddToCart(item, selections);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden bg-white w-full sm:rounded-lg text-left shadow-xl transition-all sm:my-8 sm:max-w-lg">
          <div className="absolute right-0 top-0 pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold leading-6 text-gray-900">
                Customize Your {item.name}
              </h3>
            </div>

            {item.customizations?.map(customization => (
              <div key={customization.name} className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {customization.name}
                  {customization.maxChoices === 1 && ' (Choose one)'}
                </h4>
                <div className="space-y-2">
                  {customization.options.map(option => (
                    <button
                      key={option}
                      className={`w-full text-left px-4 py-3 rounded-md border ${
                        selections[customization.name]?.includes(option)
                          ? 'border-[#c1902f] bg-[#c1902f] bg-opacity-10'
                          : 'border-gray-200 hover:border-[#c1902f]'
                      }`}
                      onClick={() => handleOptionToggle(
                        customization.name,
                        option,
                        customization.maxChoices
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row-reverse gap-2">
              <button
                type="button"
                className="w-full sm:w-auto flex-1 justify-center rounded-md bg-[#c1902f] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#d4a43f]"
                onClick={handleSubmit}
              >
                Add to Cart
              </button>
              <button
                type="button"
                className="w-full sm:w-auto flex-1 justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}