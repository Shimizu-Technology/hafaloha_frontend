// src/ordering/components/MenuPage.tsx
import React, { useState, useEffect } from 'react';
import { categories } from '../data/menu';
import { MenuItem } from './MenuItem';
import { useMenuStore } from '../store/menuStore';

export function MenuPage() {
  const { menuItems, fetchMenuItems, loading, error } = useMenuStore();

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // NEW: flags for filtering by Featured/Seasonal
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showSeasonalOnly, setShowSeasonalOnly] = useState(false);

  // On mount, load menu items from the backend
  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // Combine all filters: category, featured, seasonal
  const filteredItems = React.useMemo(() => {
    let list = menuItems;

    // If a category is chosen, filter by category
    if (selectedCategory) {
      list = list.filter((item) => item.category === selectedCategory);
    }
    // If “showFeaturedOnly” is checked, filter by `featured`
    if (showFeaturedOnly) {
      list = list.filter((item) => item.featured);
    }
    // If “showSeasonalOnly” is checked, filter by `seasonal`
    if (showSeasonalOnly) {
      list = list.filter((item) => item.seasonal);
    }

    return list;
  }, [menuItems, selectedCategory, showFeaturedOnly, showSeasonalOnly]);

  // Handler for the "Featured Items" checkbox
  function handleToggleFeatured(checked: boolean) {
    // If user checks it => uncheck the seasonal one
    if (checked) {
      setShowSeasonalOnly(false);
    }
    setShowFeaturedOnly(checked);
  }

  // Handler for the "Seasonal Items" checkbox
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

      {/* Extra filters for Featured / Seasonal */}
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
