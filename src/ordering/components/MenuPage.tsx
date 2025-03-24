// src/ordering/components/MenuPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem } from './MenuItem';
import { useMenuStore } from '../store/menuStore';
import { useCategoryStore } from '../store/categoryStore';
import { MenuItemSkeletonGrid } from '../../shared/components/ui/SkeletonLoader';
import { deriveStockStatus, calculateAvailableQuantity } from '../utils/inventoryUtils';

export function MenuPage() {
  const { menuItems, fetchMenuItems, loading, error } = useMenuStore();
  const { categories, fetchCategories } = useCategoryStore();

  // For category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Additional flags for filtering
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showSeasonalOnly, setShowSeasonalOnly] = useState(false);
  
  // Calculate which items are likely to be above the fold
  // For a typical grid, the first 3-6 items (depending on screen size)
  const getAboveFoldCount = () => {
    // Simple responsive logic - could be enhanced with actual viewport detection
    if (window.innerWidth >= 1024) return 3; // lg: 3 columns, so first row = 3 items
    if (window.innerWidth >= 640) return 2; // sm: 2 columns, so first row = 2 items
    return 1; // xs: 1 column, so first row = 1 item
  };
  
  const [aboveFoldCount, setAboveFoldCount] = useState(3); // Default to 3
  
  // Update above-fold count on window resize and initial load
  useEffect(() => {
    // Set initial value
    if (typeof window !== 'undefined') {
      setAboveFoldCount(getAboveFoldCount());
      
      // Add resize listener
      const handleResize = () => {
        setAboveFoldCount(getAboveFoldCount());
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, [fetchMenuItems, fetchCategories]);

  // Combine filters: category, featured, seasonal, day-specific availability, and hidden status
  const filteredItems = useMemo(() => {
    let list = menuItems;

    // Filter out hidden items for customer-facing menu
    list = list.filter((item) => !item.hidden);

    // If a category is selected, filter by that
    if (selectedCategoryId) {
      list = list.filter((item) =>
        item.category_ids?.includes(selectedCategoryId)
      );
    }
    if (showFeaturedOnly) {
      list = list.filter((item) => item.featured);
    }
    if (showSeasonalOnly) {
      list = list.filter((item) => item.seasonal);
    }

    // Filter by day-specific availability
    const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    list = list.filter((item) => {
      // If available_days is empty or not set, item is available every day
      if (!item.available_days || item.available_days.length === 0) {
        return true;
      }
      
      // Otherwise, check if the current day is in the available_days array
      // Convert all values to numbers for comparison since they might be stored as strings
      const availableDaysAsNumbers = item.available_days.map(day => 
        typeof day === 'string' ? parseInt(day, 10) : day
      );
      
      return availableDaysAsNumbers.includes(currentDayOfWeek);
    });

    return list;
  }, [menuItems, selectedCategoryId, showFeaturedOnly, showSeasonalOnly]);

  // Toggling filters
  function handleToggleFeatured(checked: boolean) {
    // If turning on "featured", turn off "seasonal"
    if (checked) {
      setShowSeasonalOnly(false);
    }
    setShowFeaturedOnly(checked);
  }
  function handleToggleSeasonal(checked: boolean) {
    // If turning on "seasonal", turn off "featured"
    if (checked) {
      setShowFeaturedOnly(false);
    }
    setShowSeasonalOnly(checked);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
        Our Menu
      </h1>

      {error && <p className="text-red-600">{error}</p>}

      {/* Horizontally scrollable categories */}
      <div className="mb-3">
        <div className="flex flex-nowrap space-x-3 overflow-x-auto py-2">
          {/* "All Items" button */}
          <button
            className={`
              flex-shrink-0 px-4 py-2 rounded-md
              ${selectedCategoryId === null 
                ? 'bg-[#c1902f] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
            onClick={() => setSelectedCategoryId(null)}
          >
            All Items
          </button>

          {/* Category buttons */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`
                flex-shrink-0 px-4 py-2 rounded-md
                ${selectedCategoryId === cat.id
                  ? 'bg-[#c1902f] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Category Description - Only shown when a category is selected */}
      {selectedCategoryId && (
        <div className="animate-fadeIn transition-all duration-300 mb-6">
          {categories.find(cat => cat.id === selectedCategoryId)?.description && (
            <div className="bg-white/80 backdrop-blur-sm border-l-2 border-[#c1902f]/70 rounded-lg px-4 py-3 sm:p-4 shadow-sm">
              <p className="text-gray-600 font-normal leading-relaxed text-sm sm:text-base">
                {categories.find(cat => cat.id === selectedCategoryId)?.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Featured/Seasonal checkboxes */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showFeaturedOnly}
            onChange={(e) => handleToggleFeatured(e.target.checked)}
          />
          <span>Featured Items</span>
        </label>

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showSeasonalOnly}
            onChange={(e) => handleToggleSeasonal(e.target.checked)}
          />
          <span>Seasonal Items</span>
        </label>
      </div>

      {/* Menu Items Grid with min-height to prevent layout shift */}
      <div className="min-h-[300px] transition-opacity duration-300 ease-in-out">
        {loading ? (
          <div className="transition-opacity duration-300">
            <MenuItemSkeletonGrid count={6} />
          </div>
        ) : (
          <div className="animate-fadeIn transition-opacity duration-300">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {filteredItems.map((item, index) => (
                  <MenuItem 
                    key={item.id} 
                    item={item} 
                    index={index}
                    isAboveFold={index < aboveFoldCount}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="bg-gray-100 rounded-full p-4 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-500 max-w-md">
                  {selectedCategoryId 
                    ? "There are no items in this category for the current menu." 
                    : "The current menu doesn't have any items yet."}
                </p>
                {(showFeaturedOnly || showSeasonalOnly) && (
                  <p className="text-gray-500 mt-2">
                    Try removing the filters to see more items.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MenuPage;
