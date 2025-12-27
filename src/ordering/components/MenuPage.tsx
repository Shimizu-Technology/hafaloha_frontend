// src/ordering/components/MenuPage.tsx

import { useState, useEffect, useMemo, useRef } from 'react';
import { MenuItem as MenuItemCard } from './MenuItem';
import { useMenuStore } from '../store/menuStore';
import { useCategoryStore } from '../store/categoryStore';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { useMenuLayoutStore } from '../store/menuLayoutStore';
import { validateRestaurantContext } from '../../shared/utils/tenantUtils';
import { MenuItem } from '../types/menu';
import LayoutToggle from './layouts/LayoutToggle';
import ListView from './layouts/ListView';
import { startTiming, endTiming, printPerformanceSummary } from '../utils/loadingPerformance';

export function MenuPage() {
  const { fetchVisibleMenuItems, fetchMenus, error, currentMenuId } = useMenuStore();
  const { categories, fetchCategoriesForMenu } = useCategoryStore();
  const { restaurant } = useRestaurantStore();
  const { layoutType, initializeLayout } = useMenuLayoutStore();
  
  // State for menu items and loading state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading=true to prevent flash of "no items"
  
  // Track if initial load is complete to prevent unnecessary re-renders
  const initialLoadComplete = useRef(false);
  const loadingController = useRef<AbortController | null>(null);

  // For category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Additional flags for filtering
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showSeasonalOnly, setShowSeasonalOnly] = useState(false);
  
  // For search functionality
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  
  // Debounce search to avoid excessive API calls
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Performance monitoring
  useEffect(() => {
    // Print performance summary when component unmounts (in development)
    return () => {
      if (process.env.NODE_ENV === 'development') {
        printPerformanceSummary();
      }
    };
  }, []);
  
  // Listen for keyboard events to show search when user starts typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond to alphanumeric keys and when not in an input field
      const isInputActive = document.activeElement?.tagName === 'INPUT' || 
                           document.activeElement?.tagName === 'TEXTAREA';
      
      // If user is typing and not in an input field, show search
      if (!isInputActive && 
          !e.ctrlKey && !e.altKey && !e.metaKey && 
          e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        setSearchVisible(true);
        // Focus the search input after a short delay to allow the animation to complete
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            // Set the search query to the key that was pressed
            setSearchQuery(e.key);
            setIsSearching(true);
            
            // Clear previous timeout
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            
            // Set new timeout for debounce
            searchTimeoutRef.current = setTimeout(() => {
              setIsSearching(false);
            }, 500);
          }
        }, 100);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Initialize menus and layout - runs once on mount
  useEffect(() => {
    const initializeData = async () => {
      const operationId = 'menu-page-init';
      startTiming(operationId, 'MenuPage Initialization');
      
      try {
        // Fetch menus first
        await fetchMenus();
        
        // Initialize layout if restaurant is available
        if (restaurant?.id) {
          console.debug('MenuPage: Initializing layout based on restaurant preferences');
          initializeLayout(restaurant.id);
        }
        
        endTiming(operationId, true);
      } catch (error) {
        console.error('Error initializing menu data:', error);
        endTiming(operationId, false, String(error));
      }
    };
    
    initializeData();
  }, [fetchMenus, restaurant?.id, initializeLayout]);

  // Fetch categories when menu changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!validateRestaurantContext(restaurant) || !currentMenuId) {
        return;
      }
      
      const operationId = `categories-${currentMenuId}`;
      startTiming(operationId, `Load Categories for Menu ${currentMenuId}`);
      
      try {
        await fetchCategoriesForMenu(currentMenuId, restaurant?.id);
        endTiming(operationId, true);
      } catch (error) {
        console.error('Error fetching categories:', error);
        endTiming(operationId, false, String(error));
      }
    };
    
    loadCategories();
  }, [fetchCategoriesForMenu, currentMenuId, restaurant]);
  
  // Filter categories to only show those for the current menu
  const activeCategories = useMemo(() => {
    return currentMenuId ? categories.filter(cat => cat.menu_id === currentMenuId) : [];
  }, [categories, currentMenuId]);
  
  // Main effect for loading menu items - simplified approach
  useEffect(() => {
    const loadMenuItems = async () => {
      // Abort any ongoing request
      if (loadingController.current) {
        loadingController.current.abort();
      }
      
      // Create new controller for this request
      loadingController.current = new AbortController();
      
      // Validate restaurant context
      if (!validateRestaurantContext(restaurant)) {
        return;
      }
      
      // Create unique operation ID for performance tracking
      const filters = {
        category: selectedCategoryId,
        featured: showFeaturedOnly,
        seasonal: showSeasonalOnly,
        search: searchQuery
      };
      const operationId = `menu-items-${JSON.stringify(filters)}`;
      startTiming(operationId, `Load Menu Items (${Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(', ') || 'all'})`);
      
      // Show loading indicator
      setLoading(true);
      setIsSearching(!!searchQuery);
      
      try {
        console.debug('MenuPage: Loading menu items', {
          categoryId: selectedCategoryId,
          featured: showFeaturedOnly,
          seasonal: showSeasonalOnly,
          search: searchQuery
        });
        
        // Call the enhanced method with all filter parameters
        const items = await fetchVisibleMenuItems(
          selectedCategoryId || undefined, 
          restaurant?.id,
          showFeaturedOnly,
          showSeasonalOnly,
          searchQuery || undefined
        );
        
        // Update state if request wasn't aborted
        if (!loadingController.current?.signal.aborted) {
          setMenuItems(items);
          
          // Mark initial load as complete
          if (!initialLoadComplete.current) {
            initialLoadComplete.current = true;
          }
          
          endTiming(operationId, true);
        }
      } catch (error) {
        // Only log error if request wasn't aborted
        if (!loadingController.current?.signal.aborted) {
          console.error('Error fetching menu items:', error);
          endTiming(operationId, false, String(error));
        }
      } finally {
        // Clear loading state if request wasn't aborted
        if (!loadingController.current?.signal.aborted) {
          setLoading(false);
          setIsSearching(false);
        }
      }
    };
    
    // Only load if we have the necessary context
    if (restaurant && currentMenuId) {
      loadMenuItems();
    }
    
    // Cleanup function
    return () => {
      if (loadingController.current) {
        loadingController.current.abort();
      }
    };
  }, [
    fetchVisibleMenuItems, 
    restaurant, 
    currentMenuId,
    selectedCategoryId, 
    showFeaturedOnly, 
    showSeasonalOnly, 
    searchQuery
  ]);

  // Memoize the selected category description to avoid redundant lookups
  const selectedCategoryDescription = useMemo(() => {
    return selectedCategoryId
      ? activeCategories.find(cat => cat.id === selectedCategoryId)?.description
      : null;
  }, [selectedCategoryId, activeCategories]);

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

      {/* Horizontally scrollable categories with integrated search */}
      <div className="mb-3">
        <div className="flex flex-nowrap items-center space-x-3 overflow-x-auto py-2">
          {/* Search button - first position for easy access */}
          <button
            onClick={() => setSearchVisible(!searchVisible)}
            className={`
              flex-shrink-0 px-3 py-2 rounded-md flex items-center gap-1
              ${searchVisible
                ? 'bg-[#c1902f] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
            aria-label={searchVisible ? 'Hide search' : 'Show search'}
          >
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
            {searchVisible && <span>Search</span>}
          </button>
          
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
          {activeCategories.map((cat) => (
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
      {selectedCategoryId && selectedCategoryDescription && (
        <div className="animate-fadeIn transition-all duration-300 mb-6">
          <div className="bg-white/80 backdrop-blur-sm border-l-2 border-[#c1902f]/70 rounded-lg px-4 py-3 sm:p-4 shadow-sm">
            <p className="text-gray-600 font-normal leading-relaxed text-sm sm:text-base">
              {selectedCategoryDescription}
            </p>
          </div>
        </div>
      )}

      {/* Expanded Search Bar - only visible when search is active */}
      {searchVisible && (
        <div className="mb-4 animate-fadeIn transition-all duration-300">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="search"
              className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-[#c1902f] focus:border-[#c1902f] shadow-sm"
              placeholder="Search menu items or categories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
                
                // Clear previous timeout
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current);
                }
                
                // Set new timeout for debounce
                searchTimeoutRef.current = setTimeout(() => {
                  setIsSearching(false);
                }, 500);
              }}
              autoFocus
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {searchQuery ? (
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 12 12M1 13 13 1"/>
                  </svg>
                </button>
              ) : (
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSearchVisible(false)}
                  aria-label="Close search"
                >
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layout Toggle and Filter Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
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
        
        {/* Layout Toggle */}
        <LayoutToggle className="ml-auto" />
      </div>

      {/* Search active indicator */}
      {searchQuery && (
        <div className="mb-4 animate-fadeIn">
          <div className="bg-[#c1902f]/10 border border-[#c1902f]/20 rounded-md p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Showing results for:</span> {searchQuery}
              </p>
              
              {/* Show matching categories if any */}
              {activeCategories.some(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="mt-1">
                  <p className="text-xs text-gray-600">Matching categories:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeCategories
                      .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setSearchQuery('');
                            setSearchVisible(false);
                          }}
                          className="text-xs bg-[#c1902f]/20 hover:bg-[#c1902f]/30 text-[#c1902f] px-2 py-1 rounded-full"
                        >
                          {cat.name}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSearchVisible(false);
              }}
              className="text-sm text-[#c1902f] hover:text-[#c1902f]/80 font-medium"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}
      
      {/* Menu Items Grid with consistent loading state */}
      <div className="min-h-[300px] transition-opacity duration-300 ease-in-out">
        {loading || isSearching || !initialLoadComplete.current ? (
          // Show loading spinner while menu items are loading or initial load hasn't completed
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c1902f]"></div>
          </div>
        ) : (
          <div className="animate-fadeIn transition-opacity duration-300">
            {menuItems.length > 0 ? (
              layoutType === 'gallery' ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                  {menuItems.map((item, index) => (
                    <MenuItemCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              ) : (
                <ListView 
                  menuItems={menuItems}
                  loading={false}
                  selectedCategoryId={selectedCategoryId}
                  showFeaturedOnly={showFeaturedOnly}
                  showSeasonalOnly={showSeasonalOnly}
                  searchQuery={searchQuery}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="bg-gray-100 rounded-full p-4 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-500 max-w-md">
                  {searchQuery 
                    ? `No items found matching "${searchQuery}".` 
                    : selectedCategoryId 
                      ? "There are no items in this category for the current menu." 
                      : "The current menu doesn't have any items yet."}
                </p>
                {(showFeaturedOnly || showSeasonalOnly || searchQuery) && (
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
