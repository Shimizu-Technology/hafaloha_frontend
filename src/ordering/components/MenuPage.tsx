// src/ordering/components/MenuPage.tsx
import React, { useState, useEffect } from 'react';
import { categories } from '../data/menu';
import { MenuItem } from './MenuItem';
import type { MenuItem as MenuItemType } from '../types/menu';
import { useMenuStore } from '../store/menuStore';

interface MenuPageProps {
  onAddToCart: (item: MenuItemType) => void;
}

export function MenuPage({ onAddToCart }: MenuPageProps) {
  const { menuItems, fetchMenuItems, loading, error } = useMenuStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Load menu items from the backend
    fetchMenuItems();
  }, [fetchMenuItems]);

  // Filter items by category
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
        Our Menu
      </h1>

      {loading && <p>Loading menu...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Horizontally scrollable categories */}
      <div className="mb-6">
        <div className="flex flex-nowrap space-x-3 overflow-x-auto scrollbar-hide py-2">
          {/* “All Items” button */}
          <button
            className={`
              flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-md
              ${
                !selectedCategory
                  ? 'bg-[#c1902f] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            onClick={() => setSelectedCategory(null)}
          >
            All Items
          </button>

          {/* Category buttons */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`
                flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-md
                ${
                  selectedCategory === cat.id
                    ? 'bg-[#c1902f] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((item) => (
          <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} />
        ))}
      </div>
    </div>
  );
}

export default MenuPage;
