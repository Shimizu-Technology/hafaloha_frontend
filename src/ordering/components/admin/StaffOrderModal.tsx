import React, { useState, useEffect } from 'react';
import { useMenuStore } from '../../store/menuStore';
import { useOrderStore } from '../../store/orderStore';
import { MenuItem } from '../../types/menu';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { apiClient } from '../../../shared/api/apiClient';

/**
 * Validate phone e.g. +16711234567 or +17025551234
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

/**
 * Hook that returns true if width < 768px
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  return isMobile;
}

/** --------------------------------------------------------------------
 * MenuItemsPanel: Renders the search, categories, and item cards
 * -------------------------------------------------------------------*/
interface MenuItemsPanelProps {
  menuItems: MenuItem[];
  menuLoading: boolean;
  categories: Map<number, string>;
  selectedCategory: number | 'all';
  setSelectedCategory: (cat: number | 'all') => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  findCartItem: (id: string) => any;
  handleAddItem: (item: MenuItem) => void;
  setCustomizingItem: (item: MenuItem) => void;
}

function MenuItemsPanel({
  menuItems,
  menuLoading,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  findCartItem,
  handleAddItem,
  setCustomizingItem
}: MenuItemsPanelProps) {
  // Filter items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === 'all' ||
      (item.category_ids && item.category_ids.includes(Number(selectedCategory)));
    return matchesSearch && matchesCat;
  });

  // Group items
  function groupedMenuItems() {
    if (selectedCategory !== 'all') {
      return {
        [selectedCategory.toString()]: filteredMenuItems.filter(item =>
          item.category_ids?.includes(Number(selectedCategory))
        ),
      };
    }
    const grouped: Record<string, MenuItem[]> = { uncategorized: [] };
    filteredMenuItems.forEach(item => {
      if (!item.category_ids?.length) {
        grouped.uncategorized.push(item);
      } else {
        item.category_ids.forEach(catId => {
          const key = catId.toString();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        });
      }
    });
    if (!grouped.uncategorized.length) delete grouped.uncategorized;
    return grouped;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Search & categories */}
      <div>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-[#c1902f]"
        />
        <div className="flex items-center mt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium
            ${selectedCategory === 'all'
              ? 'bg-[#c1902f] text-white shadow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          {Array.from(categories.entries()).map(([catId, catName]) => (
            <button
              key={catId}
              onClick={() => setSelectedCategory(catId)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium
              ${selectedCategory === catId
                ? 'bg-[#c1902f] text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {catName}
            </button>
          ))}
        </div>
      </div>

      {/* Item cards */}
      <div className="mt-4">
        {menuLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c1902f]" />
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items found matching your search.
          </div>
        ) : (
          Object.entries(groupedMenuItems()).map(([catId, items]) => (
            <div key={catId} className="mb-6">
              <h3 className="font-medium text-lg mb-3 pb-1 border-b border-gray-100">
                {categories.get(Number(catId)) ||
                  (catId === 'uncategorized' ? 'Uncategorized' : `Category ${catId}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                  const cartItem = findCartItem(item.id);
                  const isInCart = !!cartItem;
                  const hasOptions = item.option_groups && item.option_groups.length > 0;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg hover:shadow-md transition-shadow
                        ${isInCart
                          ? 'border-[#c1902f] bg-yellow-50 shadow'
                          : 'border-gray-200'
                        }`}
                    >
                      <div className="flex h-full w-full">
                        {/* Image */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden
                                        rounded-l-lg">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                            }}
                          />
                        </div>
                        {/* Details */}
                        <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base pr-1 line-clamp-1">
                                {item.name}
                                {hasOptions && (
                                  <span className="ml-1 text-xs text-[#c1902f] font-semibold whitespace-nowrap">
                                    (Customizable)
                                  </span>
                                )}
                              </h4>
                              <p className="text-[#c1902f] font-semibold text-sm sm:text-base flex-shrink-0">
                                ${item.price.toFixed(2)}
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                              {item.description}
                            </p>
                          </div>

                          {/* Add / Customize Buttons */}
                          <div className="flex justify-end mt-2">
                            {isInCart && !hasOptions ? (
                              // Show +/- if in cart and has no options
                              <div className="flex items-center">
                                <button
                                  onClick={() => {
                                    // In real code, you'd call setCartQuantity:
                                    // setCartQuantity(cartKey, cartItem.quantity - 1)
                                    if (cartItem.quantity > 1) {
                                      cartItem.quantity--;
                                    } else {
                                      // removeFromCart
                                    }
                                  }}
                                  className="text-gray-600 hover:text-[#c1902f] p-1"
                                  aria-label="Decrease quantity"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M5 10a1 1 0
                                      011-1h8a1 1 0
                                      110 2H6a1 1 0
                                      01-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                                <span className="mx-2 text-sm">{cartItem.quantity}</span>
                                <button
                                  onClick={() => {
                                    cartItem.quantity++;
                                  }}
                                  className="text-gray-600 hover:text-[#c1902f] p-1"
                                  aria-label="Increase quantity"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 5a1 1 0
                                      011 1v3h3a1 1 0
                                      110 2h-3v3a1 1 0
                                      11-2
                                      0v-3H6a1 1 0
                                      110-2h3V6a1 1 0
                                      011-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ) : hasOptions ? (
                              <button
                                onClick={() => setCustomizingItem(item)}
                                className="bg-[#c1902f] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#a97c28]"
                              >
                                {isInCart ? 'Add Another' : 'Customize'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddItem(item)}
                                className="text-[#c1902f] hover:bg-[#c1902f] hover:text-white px-2 py-1 rounded text-sm font-medium"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * OrderPanel: Renders cart items, total, "Create Order"
 * -------------------------------------------------------------------*/
interface OrderPanelProps {
  cartItems: any[];
  findCartItem: (id: string) => any;
  setCartQuantity: (key: any, qty: number) => void;
  removeFromCart: (key: any) => void;
  handleSubmitOrder: () => void;
  orderTotal: number;
  orderLoading: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  setCustomizingItem: (item: MenuItem) => void;
}

function OrderPanel({
  cartItems,
  findCartItem,
  setCartQuantity,
  removeFromCart,
  handleSubmitOrder,
  orderTotal,
  orderLoading,
  onClose,
  menuItems,
  setCustomizingItem
}: OrderPanelProps) {
  // Key function (in real code you'd do something consistent in the store)
  function getItemKey(item: any) {
    return `${item.id}${JSON.stringify(item.customizations || {})}`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable cart section */}
      <div className="overflow-y-auto flex-1 p-4 pb-[150px]">
        <h3 className="text-lg font-semibold mb-4">Current Order</h3>
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No items in the order yet</div>
        ) : (
          <div className="space-y-3">
            {cartItems.map(item => {
              const itemKey = getItemKey(item);
              return (
                <div
                  key={itemKey}
                  className="border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-800 text-sm sm:text-base line-clamp-1 pr-2 flex-1">
                      {item.name}
                    </p>
                    <div className="flex items-center">
                      <span className="text-gray-700 font-medium text-sm sm:text-base mr-2">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(itemKey)}
                        className="text-gray-400 hover:text-red-500 p-1 focus:outline-none"
                        aria-label="Remove item"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1
                            1 0
                            011.414 0L10
                            8.586l4.293-4.293a1 1 0
                            011.414 1.414L11.414
                            10l4.293
                            4.293a1 1 0
                            01-1.414
                            1.414L10
                            11.414l-4.293
                            4.293a1 1 0
                            01-1.414-1.414L8.586
                            10 4.293
                            5.707a1 1 0
                            010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* If custom, show them */}
                  {item.customizations && (
                    <div className="text-xs text-gray-500 mt-1">
                      {/* You can adapt the old "renderCustomizations" if you want */}
                      {/* This is placeholder if you prefer. */}
                    </div>
                  )}

                  {/* +/- controls */}
                  <div className="flex items-center justify-between mt-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            setCartQuantity(itemKey, item.quantity - 1);
                          } else {
                            removeFromCart(itemKey);
                          }
                        }}
                        className="text-gray-600 hover:text-[#c1902f] p-1 rounded-l"
                        aria-label="Decrease quantity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 10a1 1 0
                            011-1h8a1 1 0
                            110 2H6a1 1 0
                            01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <span className="mx-2 w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => setCartQuantity(itemKey, item.quantity + 1)}
                        className="text-gray-600 hover:text-[#c1902f] p-1 rounded-r"
                        aria-label="Increase quantity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0
                            011 1v3h3a1 1 0
                            110 2h-3v3a1 1 0
                            11-2 0v-3H6a1 1 0
                            110-2h3V6a1 1 0
                            011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* "Add Another" if custom */}
                    {item.customizations && item.id && (
                      <button
                        onClick={() => {
                          const mi = menuItems.find(m => m.id === item.id);
                          if (mi?.option_groups?.length) {
                            setCustomizingItem(mi);
                          }
                        }}
                        className="mt-1 sm:mt-0 text-[#c1902f] border border-[#c1902f]
                                   hover:bg-[#c1902f] hover:text-white px-3 py-1
                                   rounded text-xs font-medium transition-colors"
                      >
                        Add Another
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom bar for total & create/cancel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-700 text-lg">Total:</span>
          <span className="font-bold text-xl text-[#c1902f]">${orderTotal.toFixed(2)}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={onClose}
            className="py-3 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200
              focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={!cartItems.length || orderLoading}
            className="py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28]
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50
              disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {orderLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none" viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0
                      018-8V0C5.373
                      0 0 5.373
                      0 12h4zm2
                      5.291A7.962
                      7.962
                      0
                      014
                      12H0c0
                      3.042
                      1.135
                      5.824
                      3
                      7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              'Create Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * CustomerInfoPanel
 * -------------------------------------------------------------------*/
interface CustomerInfoPanelProps {
  contactName: string;
  setContactName: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  contactEmail: string;
  setContactEmail: (val: string) => void;
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;
  handleSubmitOrder: () => void;
  cartItems: any[];
  orderLoading: boolean;
  onBack: () => void;
}
function CustomerInfoPanel({
  contactName, setContactName,
  contactPhone, setContactPhone,
  contactEmail, setContactEmail,
  specialInstructions, setSpecialInstructions,
  handleSubmitOrder,
  cartItems,
  orderLoading,
  onBack
}: CustomerInfoPanelProps) {
  return (
    <div className="overflow-y-auto flex-1 p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Customer Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="+1671"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="Email address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
                       focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] text-sm shadow-sm"
            placeholder="Special instructions or notes"
            rows={4}
          />
        </div>
      </div>
      {/* Buttons */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button
          onClick={onBack}
          className="py-3 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200
                     focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm transition-colors"
        >
          Back to Order
        </button>
        <button
          onClick={handleSubmitOrder}
          disabled={!cartItems.length || orderLoading}
          className="py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28]
                     focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          {orderLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373
                        0 0 5.373 0
                        12h4zm2
                        5.291A7.962
                        7.962
                        0
                        014
                        12H0c0
                        3.042
                        1.135
                        5.824
                        3
                        7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Create Order'
          )}
        </button>
      </div>
    </div>
  );
}

/** --------------------------------------------------------------------
 * The main StaffOrderModal
 * - Mobile: tabbed
 * - Desktop/iPad: side-by-side
 * - Fixed size
 * - Menu item cards from older styling
 * -------------------------------------------------------------------*/
interface StaffOrderModalProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  restaurantId?: string;
}

export function StaffOrderModal({ onClose, onOrderCreated }: StaffOrderModalProps) {
  const isMobile = useIsMobile();

  // Customer info
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('+1671');
  const [contactEmail, setContactEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Data
  const { menuItems, fetchMenuItems, loading: menuLoading } = useMenuStore();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    addOrder,
    loading: orderLoading
  } = useOrderStore();

  // Categories
  const [categories, setCategories] = useState<Map<number, string>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // For customization
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Mobile tab
  const [activeTab, setActiveTab] = useState<'menu' | 'order' | 'customer'>('menu');

  // Desktop "Show Customer Info" toggle
  const [showCustomerInfoDesktop, setShowCustomerInfoDesktop] = useState(false);

  // Calculate total
  const orderTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // On mount, fetch
  useEffect(() => {
    fetchMenuItems();
    return () => {
      clearCart();
    };
  }, [fetchMenuItems, clearCart]);

  // Load categories
  useEffect(() => {
    async function fetchCats() {
      try {
        const res = await apiClient.get('/categories');
        const catMap = new Map<number, string>();
        res.data.forEach((c: any) => {
          catMap.set(c.id, c.name);
        });
        setCategories(catMap);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // fallback
        const fallback = new Map<number, string>();
        menuItems.forEach(it => {
          if (it.category_ids) {
            it.category_ids.forEach(catId => {
              if (!fallback.has(catId)) fallback.set(catId, `Category ${catId}`);
            });
          }
        });
        setCategories(fallback);
      }
    }
    if (menuItems.length > 0) {
      fetchCats();
    }
  }, [menuItems]);

  function findCartItem(id: string) {
    return cartItems.find(c => c.id === id) || null;
  }

  function handleAddItem(item: MenuItem) {
    if (item.option_groups?.length) {
      setCustomizingItem(item);
    } else {
      addToCart({ id: item.id, name: item.name, price: item.price, type: 'food', image: item.image }, 1);
    }
  }

  function handleAddCustomizedItem(item: MenuItem, custom: any[], qty: number) {
    addToCart(
      { id: item.id, name: item.name, price: item.price, type: 'food', image: item.image, customizations: custom },
      qty
    );
    setCustomizingItem(null);
  }

  async function handleSubmitOrder() {
    if (!cartItems.length) {
      alert('Please add items to the order');
      return;
    }
    const finalPhone = contactPhone.trim() === '+1671' ? '' : contactPhone.trim();
    if (finalPhone && !isValidPhone(finalPhone)) {
      alert('Phone must be + (3 or 4 digit area code) + 7 digits');
      return;
    }
    try {
      const newOrder = await addOrder(
        cartItems,
        orderTotal,
        specialInstructions,
        contactName,
        finalPhone,
        contactEmail,
        undefined,
        'in_person'
      );
      onOrderCreated(newOrder.id);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to create order. Please try again.');
    }
  }

  /** MOBILE TABBED LAYOUT */
  function renderMobileLayout() {
    return (
      <div className="flex flex-col overflow-hidden h-full">
        {/* Tab bar */}
        <div className="border-b border-gray-200 flex items-center justify-around bg-white shadow-sm">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'menu'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 py-3 text-sm font-medium text-center relative ${
              activeTab === 'order'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Current Order
            {cartItems.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#c1902f] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-3 text-sm font-medium text-center ${
              activeTab === 'customer'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Customer Info
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'menu' && (
          <MenuItemsPanel
            menuItems={menuItems}
            menuLoading={menuLoading}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            findCartItem={findCartItem}
            handleAddItem={handleAddItem}
            setCustomizingItem={setCustomizingItem}
          />
        )}
        {activeTab === 'order' && (
          <OrderPanel
            cartItems={cartItems}
            findCartItem={findCartItem}
            setCartQuantity={setCartQuantity}
            removeFromCart={removeFromCart}
            handleSubmitOrder={handleSubmitOrder}
            orderTotal={orderTotal}
            orderLoading={orderLoading}
            onClose={onClose}
            menuItems={menuItems}
            setCustomizingItem={setCustomizingItem}
          />
        )}
        {activeTab === 'customer' && (
          <CustomerInfoPanel
            contactName={contactName} setContactName={setContactName}
            contactPhone={contactPhone} setContactPhone={setContactPhone}
            contactEmail={contactEmail} setContactEmail={setContactEmail}
            specialInstructions={specialInstructions} setSpecialInstructions={setSpecialInstructions}
            handleSubmitOrder={handleSubmitOrder}
            cartItems={cartItems}
            orderLoading={orderLoading}
            onBack={() => setActiveTab('order')}
          />
        )}
      </div>
    );
  }

  /** DESKTOP/IPAD SIDE-BY-SIDE LAYOUT */
  function renderDesktopLayout() {
    return (
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left: Menu Items */}
        <div className="w-2/3 flex flex-col border-r border-gray-200">
          <MenuItemsPanel
            menuItems={menuItems}
            menuLoading={menuLoading}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            findCartItem={findCartItem}
            handleAddItem={handleAddItem}
            setCustomizingItem={setCustomizingItem}
          />
        </div>

        {/* Right: Order + optional Customer Info toggle */}
        <div className="w-1/3 flex flex-col relative">
          <OrderPanel
            cartItems={cartItems}
            findCartItem={findCartItem}
            setCartQuantity={setCartQuantity}
            removeFromCart={removeFromCart}
            handleSubmitOrder={handleSubmitOrder}
            orderTotal={orderTotal}
            orderLoading={orderLoading}
            onClose={onClose}
            menuItems={menuItems}
            setCustomizingItem={setCustomizingItem}
          />

          {/* Customer Info (toggle) */}
          <div className="absolute bottom-[150px] left-0 right-0 px-4">
            {!showCustomerInfoDesktop ? (
              <button
                onClick={() => setShowCustomerInfoDesktop(true)}
                className="w-full py-2.5 text-sm font-medium bg-gray-50 border border-gray-300
                           hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
              >
                Add Customer Info (Optional)
              </button>
            ) : (
              <div className="mt-4 border border-gray-200 rounded-md p-3 shadow-sm bg-gray-50">
                <CustomerInfoPanel
                  contactName={contactName}
                  setContactName={setContactName}
                  contactPhone={contactPhone}
                  setContactPhone={setContactPhone}
                  contactEmail={contactEmail}
                  setContactEmail={setContactEmail}
                  specialInstructions={specialInstructions}
                  setSpecialInstructions={setSpecialInstructions}
                  handleSubmitOrder={handleSubmitOrder}
                  cartItems={cartItems}
                  orderLoading={orderLoading}
                  onBack={() => setShowCustomerInfoDesktop(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4"
    >
      <div
        className="
          bg-white rounded-lg shadow-xl
          w-[95vw] max-w-[1100px]
          h-[90vh] max-h-[800px]
          flex flex-col
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">Create Staff Order</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none
                       rounded-full hover:bg-gray-100 p-1 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile or Desktop/iPad? */}
        {isMobile ? renderMobileLayout() : renderDesktopLayout()}
      </div>

      {/* Customization modal */}
      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={handleAddCustomizedItem}
        />
      )}
    </div>
  );
}
