// src/ordering/components/MenuItem.tsx
import React from 'react';
import { Plus } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import type { MenuItem as MenuItemType } from '../types/menu';

interface MenuItemProps {
  item: MenuItemType;
}

export function MenuItem({ item }: MenuItemProps) {
  const addToCart = useOrderStore((state) => state.addToCart);

  function handleAddToCart() {
    // Include any fields you want to use in the cart (like image_url, description, etc.)
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,       // <-- important: pass image_url
        description: item.description,   // <-- optional if you want it in cart
      },
      1 // default quantity
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col min-h-[380px]">
      {/* Use the same field that actually holds the URL from your DB */}
      <img
        src={item.image_url}
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
            ${Number(item.price).toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            className="w-full md:w-auto flex items-center justify-center px-4 py-2
                       border border-transparent rounded-md shadow-sm text-sm font-medium
                       text-white bg-[#c1902f] hover:bg-[#d4a43f] transition-colors duration-150"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
