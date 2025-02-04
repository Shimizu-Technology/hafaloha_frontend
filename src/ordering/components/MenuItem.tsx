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
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        // add other fields if needed
      },
      1 // default quantity
    );
  }

  return (
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
        {/* 
          Bottom area: stack by default, side-by-side at md>=768px,
          plus a bit more gap and spacing. 
        */}
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
