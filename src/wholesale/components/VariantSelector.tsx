// src/wholesale/components/VariantSelector.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface VariantSelectorProps {
  item: {
    id: number;
    name: string;
    price: number;
    options?: {
      size_options?: string[];
      color_options?: string[];
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (selectedOptions: { [key: string]: string }) => void;
}

export default function VariantSelector({ item, isOpen, onClose, onAddToCart }: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);

  // Early return if modal is not open or item is null
  if (!isOpen || !item) return null;

  const hasOptions = item.options?.size_options?.length || item.options?.color_options?.length;

  const handleOptionChange = (optionType: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionType]: value
    }));
  };

  const isSelectionComplete = () => {
    const requiredSelections = [];
    if (item.options?.size_options?.length) requiredSelections.push('size');
    if (item.options?.color_options?.length) requiredSelections.push('color');
    
    return requiredSelections.every(req => selectedOptions[req]);
  };

  const handleAddToCart = () => {
    if (!isSelectionComplete()) return;
    
    onAddToCart(selectedOptions);
    onClose();
    
    // Reset for next time
    setSelectedOptions({});
    setQuantity(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
            <p className="text-xl font-bold text-[#c1902f] mt-1">{formatCurrency(item.price)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Options Selection */}
        <div className="space-y-6">
          {/* Size Selection */}
          {item.options?.size_options?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Size *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {item.options.size_options.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleOptionChange('size', size)}
                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                      selectedOptions.size === size
                        ? 'border-[#c1902f] bg-[#c1902f]/10 text-[#c1902f] ring-2 ring-[#c1902f]/20'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {item.options?.color_options?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Color *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {item.options.color_options.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleOptionChange('color', color)}
                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                      selectedOptions.color === color
                        ? 'border-[#c1902f] bg-[#c1902f]/10 text-[#c1902f] ring-2 ring-[#c1902f]/20'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quantity
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-[#c1902f] transition-colors"
              >
                −
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-[#c1902f] transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Selected Options Summary */}
        {Object.keys(selectedOptions).length > 0 && (
          <div className="mt-6 p-4 bg-[#c1902f]/5 border border-[#c1902f]/20 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Options:</h4>
            <div className="space-y-1">
              {selectedOptions.size && (
                <div className="text-sm text-gray-600">Size: <span className="font-medium text-[#c1902f]">{selectedOptions.size}</span></div>
              )}
              {selectedOptions.color && (
                <div className="text-sm text-gray-600">Color: <span className="font-medium text-[#c1902f]">{selectedOptions.color}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isSelectionComplete()}
            className="px-4 py-2 bg-[#c1902f] border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-[#d4a43f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}