// src/ordering/components/MenuPage.tsx
import React, { useState, useEffect } from 'react';
import { MenuItem } from './MenuItem';
import { useMenuStore } from '../store/menuStore';
import { useCategoryStore } from '../store/categoryStore';

export function MenuPage() {
  const { menuItems, fetchMenuItems, loading, error } = useMenuStore();
  const { categories, fetchCategories } = useCategoryStore();

  // For the user's chosen category ID to filter by. If null => “All.”
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Additional flags for filtering
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showSeasonalOnly, setShowSeasonalOnly] = useState(false);

  // On mount, load unexpired items + categories
  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, [fetchMenuItems, fetchCategories]);

  // Combine filters: category, featured, seasonal
  const filteredItems = React.useMemo(() => {
    let list = menuItems;

    // Filter by selectedCategoryId if set
    if (selectedCategoryId) {
      // Each item has category_ids => numeric array
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

    return list;
  }, [menuItems, selectedCategoryId, showFeaturedOnly, showSeasonalOnly]);

  // Toggling filters
  function handleToggleFeatured(checked: boolean) {
    if (checked) {
      setShowSeasonalOnly(false);
    }
    setShowFeaturedOnly(checked);
  }
  function handleToggleSeasonal(checked: boolean) {
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

      {loading && <p>Loading menu...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Horizontally scrollable categories */}
      <div className="mb-3">
        <div className="flex flex-nowrap space-x-3 overflow-x-auto py-2">
          {/* “All Items” button */}
          <button
            className={
              selectedCategoryId === null
                ? 'px-4 py-2 rounded-md bg-[#c1902f] text-white'
                : 'px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            onClick={() => setSelectedCategoryId(null)}
          >
            All Items
          </button>

          {/* Category buttons */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={
                selectedCategoryId === cat.id
                  ? 'px-4 py-2 rounded-md bg-[#c1902f] text-white'
                  : 'px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

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

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default MenuPage;
