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

  function handleQuickAdd() {
    // No customizations, add directly
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image, // or item.image_url if you prefer
        description: item.description,
      },
      1
    );
  }

  // If item has options => open modal
  function handleOpenCustomization() {
    setShowCustomization(true);
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col min-h-[380px]">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-48 object-cover"
        />

        <div className="p-4 flex flex-col flex-1">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{item.description}</p>
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-lg font-semibold text-gray-900">
              ${item.price.toFixed(2)}
            </span>

            {item.option_groups && item.option_groups.length > 0 ? (
              // If we have option groups => show a "Customize" button
              <button
                onClick={handleOpenCustomization}
                className="w-full md:w-auto flex items-center justify-center px-4 py-2
                  border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-[#c1902f] hover:bg-[#d4a43f]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Customize
              </button>
            ) : (
              // Otherwise => a normal "Add to cart" button
              <button
                onClick={handleQuickAdd}
                className="w-full md:w-auto flex items-center justify-center px-4 py-2
                  border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-[#c1902f] hover:bg-[#d4a43f]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal for selecting options */}
      {showCustomization && (
        <CustomizationModal
          item={item}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </>
  );
}
