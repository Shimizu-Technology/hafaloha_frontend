// src/ordering/components/CustomizationModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import type { MenuItem, OptionGroup, MenuOption } from '../types/menu';

interface CustomizationModalProps {
  item: MenuItem;
  onClose: () => void;
}

export function CustomizationModal({ item, onClose }: CustomizationModalProps) {
  const addToCart = useOrderStore((state) => state.addToCart);

  // 1) Track user selections: selections[groupId] = array of optionIds
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);

  // Safely handle no option_groups
  const optionGroups = item.option_groups || [];

  // Toggle an option in a group, respecting max_select
  function handleOptionToggle(group: OptionGroup, opt: MenuOption) {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      if (current.includes(opt.id)) {
        // Remove this opt.id
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== opt.id),
        };
      }
      // If we are at max => remove the first selected
      if (current.length >= group.max_select) {
        return {
          ...prev,
          [group.id]: [...current.slice(1), opt.id],
        };
      }
      // Otherwise, just add it
      return {
        ...prev,
        [group.id]: [...current, opt.id],
      };
    });
  }

  // Sum up the additional price across all selected options
  function getAdditionalPrice(): number {
    let sum = 0;
    for (const group of optionGroups) {
      const chosenIds = selections[group.id] || [];
      for (const optId of chosenIds) {
        // find the Option
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          // Use "additional_price_float" from the server, default to 0 if missing
          const extra = opt.additional_price_float ?? 0;
          sum += extra;
        }
      }
    }
    return sum;
  }

  const basePrice = item.price; // item.price is presumably numeric already
  const addlPrice = getAdditionalPrice();
  const totalItemPrice = (basePrice + addlPrice) * quantity;

  // On "Add to Cart": build a customizations object => groupName => [optionName, ...]
  function handleAddToCart() {
    const finalCustomizations: Record<string, string[]> = {};

    // For each group => collect the chosen names
    for (const group of optionGroups) {
      const chosenIds = selections[group.id] || [];
      if (chosenIds.length > 0) {
        const chosenNames = group.options
          .filter((o) => chosenIds.includes(o.id))
          .map((o) => o.name);
        finalCustomizations[group.name] = chosenNames;
      }
    }

    // Use the final price = base + addl
    addToCart(
      {
        id: item.id,
        name: item.name,
        description: item.description,
        price: basePrice + addlPrice,
        image: item.image,
        customizations: finalCustomizations,
      },
      quantity
    );

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>

        <h3 className="text-xl font-semibold mb-4">
          Customize: {item.name}
        </h3>

        {/* If no optionGroups, just show "no customizations" */}
        {optionGroups.length === 0 ? (
          <p>No customizations available.</p>
        ) : (
          optionGroups.map((group) => {
            const groupId = group.id;
            return (
              <div key={groupId} className="mb-6">
                <h4 className="font-medium text-gray-700">
                  {group.name}{' '}
                  <span className="text-sm text-gray-500">
                    (Min {group.min_select}, Max {group.max_select})
                  </span>
                </h4>
                <div className="mt-2 space-y-2">
                  {group.options.map((opt) => {
                    const selected = selections[groupId]?.includes(opt.id);
                    // Coerce to number
                    const extraPrice = Number(opt.additional_price_float ?? 0);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionToggle(group, opt)}
                        className={`block w-full text-left px-4 py-2 border rounded-md 
                          ${
                            selected
                              ? 'border-[#c1902f] bg-[#c1902f]/10'
                              : 'border-gray-200 hover:border-[#c1902f]'
                          }
                        `}
                      >
                        {opt.name}{' '}
                        {extraPrice > 0 && (
                          <span className="ml-2 text-sm text-gray-500">
                            +${extraPrice.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Quantity & total row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-1 border rounded"
            >
              -
            </button>
            <span>{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-1 border rounded"
            >
              +
            </button>
          </div>
          <p className="text-lg font-semibold">
            Total: ${totalItemPrice.toFixed(2)}
          </p>
        </div>

        {/* Bottom Buttons */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
