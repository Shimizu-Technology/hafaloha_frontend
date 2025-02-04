// src/ordering/components/MenuItem.tsx
import React from 'react';
import { Plus } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import type { MenuItem as MenuItemType } from '../types/menu';

interface MenuItemProps {
  item: MenuItemType;
}

export function MenuItem({ item }: MenuItemProps) {
  // get the addToCart action from our store
  const addToCart = useOrderStore((state) => state.addToCart);

  function handleAddToCart() {
    // call the store’s action
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        // etc. – just don’t include quantity here
      },
      1 // default quantity
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col min-h-[380px]">
      <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
      <div className="p-4 flex flex-col flex-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
        </div>
        <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <span className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
            ${Number(item.price).toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-md 
                       shadow-sm text-sm font-medium text-white bg-[#c1902f] hover:bg-[#d4a43f] transition-colors duration-150"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
