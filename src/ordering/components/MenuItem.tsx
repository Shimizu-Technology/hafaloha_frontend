// src/ordering/components/MenuItem.tsx

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { CustomizationModal } from './CustomizationModal';
import type { MenuItem as MenuItemType } from '../types/menu';

interface MenuItemProps {
  item: MenuItemType;
}

export function MenuItem({ item }: MenuItemProps) {
  const addToCart = useOrderStore((state) => state.addToCart);

  const [showCustomization, setShowCustomization] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);

  // Check status
  const isOutOfStock = item.stock_status === 'out_of_stock';
  const isLowStock = item.stock_status === 'low_stock';

  function handleQuickAdd() {
    if (isOutOfStock) {
      alert('Sorry, this item is out of stock.');
      return;
    }
    // For quick add, quantity=1 and no customizations
    addToCart(
      {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        customizations: {},
      },
      1
    );
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 300);
  }

  function handleOpenCustomization() {
    if (isOutOfStock) {
      alert('Sorry, this item is out of stock.');
      return;
    }
    setShowCustomization(true);
  }

  // If item is seasonal => show promo_label or fallback "Limited Time"
  const specialLabel = item.seasonal
    ? (item as any).promo_label?.trim() || 'Limited Time'
    : null;

  // Format available_until as “February 17, 2025,” etc.
  let formattedUntil = '';
  if (item.seasonal && item.available_until) {
    try {
      const parsed = new Date(item.available_until);
      if (!isNaN(parsed.getTime())) {
        formattedUntil = parsed.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      formattedUntil = item.available_until;
    }
  }

  return (
    <>
      <div
        className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col min-h-[380px]
          ${isOutOfStock ? 'opacity-70' : ''}
        `}
      >
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-48 object-cover"
        />

        <div className="p-4 flex flex-col flex-1">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{item.description}</p>

            {/* Stock Status Badges */}
            {isOutOfStock && (
              <div className="mt-2 inline-block bg-gray-500 text-white text-xs font-bold rounded-full px-2 py-1">
                Out of Stock
              </div>
            )}
            {isLowStock && (
              <div className="mt-2 inline-block bg-orange-400 text-white text-xs font-bold rounded-full px-2 py-1">
                Low Stock
              </div>
            )}

            {/* Seasonal & availability notices */}
            {item.advance_notice_hours != null && item.advance_notice_hours >= 24 && (
              <p className="mt-1 text-sm text-red-600">
                Requires 24 hours notice
              </p>
            )}
            {specialLabel && (
              <div className="mt-2 inline-block bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                {specialLabel}
              </div>
            )}
            {formattedUntil && (
              <p className="text-xs text-gray-600 mt-1">
                Available until {formattedUntil}
              </p>
            )}

            {/* If there's a status_note from the back end */}
            {item.status_note?.trim() && (
              <p className="mt-1 text-xs italic text-gray-700">
                {item.status_note}
              </p>
            )}
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-lg font-semibold text-gray-900">
              ${item.price.toFixed(2)}
            </span>

            {item.option_groups && item.option_groups.length > 0 ? (
              <button
                onClick={handleOpenCustomization}
                disabled={isOutOfStock}
                className={`w-full md:w-auto flex items-center justify-center px-4 py-2
                  border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white ${
                    isOutOfStock
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#c1902f] hover:bg-[#d4a43f]'
                  }
                `}
              >
                <Plus className="h-5 w-5 mr-2" />
                {isOutOfStock ? 'Unavailable' : 'Customize'}
              </button>
            ) : (
              <button
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
                className={`w-full md:w-auto flex items-center justify-center px-4 py-2
                  rounded-md shadow-sm text-sm font-medium text-white
                  transition-transform
                  ${
                    isOutOfStock
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#c1902f] hover:bg-[#d4a43f]'
                  }
                  ${buttonClicked ? 'animate-bounce' : ''}
                `}
              >
                <Plus className="h-5 w-5 mr-2" />
                {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* If user chooses “Customize,” show the modal */}
      {showCustomization && (
        <CustomizationModal
          item={item}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </>
  );
}
