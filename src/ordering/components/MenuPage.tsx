// src/ordering/components/MenuPage.tsx
import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

import { MenuItem } from './MenuItem';                // Updated MenuItem
import { categories } from '../data/menu';            // Still uses static categories
// Adjust this import path if your domain types changed:
import type { MenuItem as MenuItemType } from '../../hooks/useMenu'; 

// Import the new useMenu hook
import { useMenu } from '../hooks/useMenu';

export function MenuPage() {
  // Destructure from the new hook
  const { menuItems, fetchMenuItems, loading, error } = useMenu();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch menu items on mount
  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // Filter items by selected category
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Our Menu</h1>
        <button
          className="lg:hidden flex items-center text-gray-600 bg-white px-3 py-2 rounded-md shadow-sm"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          {showMobileFilters ? (
            <>
              <X className="h-5 w-5 mr-2" />
              Close
            </>
          ) : (
            <>
              <Filter className="h-5 w-5 mr-2" />
              Filter
            </>
          )}
        </button>
      </div>

      {loading && <p>Loading menu...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
            <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Categories</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  className={`w-full text-left px-4 py-3 rounded-md ${
                    !selectedCategory
                      ? 'bg-[#c1902f] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setShowMobileFilters(false);
                  }}
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`w-full text-left px-4 py-3 rounded-md ${
                      selectedCategory === category.id
                        ? 'bg-[#c1902f] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setShowMobileFilters(false);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Category Sidebar */}
        <div className="hidden lg:block w-64">
          <div className="sticky top-20">
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <div className="space-y-2">
              <button
                className={`w-full text-left px-4 py-2 rounded-md ${
                  !selectedCategory
                    ? 'bg-[#c1902f] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory(null)}
              >
                All Items
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`w-full text-left px-4 py-2 rounded-md ${
                    selectedCategory === category.id
                      ? 'bg-[#c1902f] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
