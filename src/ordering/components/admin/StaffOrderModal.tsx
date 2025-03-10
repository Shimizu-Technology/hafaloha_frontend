// src/ordering/components/admin/StaffOrderModal.tsx
import React, { useState, useEffect } from 'react';
import { useMenuStore } from '../../store/menuStore';
import { useOrderStore } from '../../store/orderStore';
import { MenuItem } from '../../types/menu';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { apiClient } from '../../../shared/api/apiClient';

/**
 * Allows a plus sign, then 3 or 4 digits for "area code," then exactly 7 more digits.
 * e.g. +16711234567 or +17025551234 or +9251234567
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

interface StaffOrderModalProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  restaurantId?: string;
}

export function StaffOrderModal({ onClose, onOrderCreated, restaurantId }: StaffOrderModalProps) {
  // States for customer information
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('+1671');
  const [contactEmail, setContactEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Menu items and cart
  const { menuItems, fetchMenuItems, loading: menuLoading } = useMenuStore();
  const { cartItems, addToCart, removeFromCart, setCartQuantity, clearCart, addOrder, loading: orderLoading } = useOrderStore();
  
  // Category state for filtering
  const [categories, setCategories] = useState<Map<number, string>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  
  // State for item customization modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calculate order total
  const orderTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Load menu items when component mounts
  useEffect(() => {
    fetchMenuItems();
    
    // Cleanup on unmount
    return () => {
      clearCart();
    };
  }, [fetchMenuItems, clearCart]);
  
  // Fetch categories and their names from the backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories');
        const categoryMap = new Map<number, string>();
        
        response.data.forEach((category: any) => {
          categoryMap.set(category.id, category.name);
        });
        
        setCategories(categoryMap);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback if API call fails: extract category IDs from menu items
        const fallbackCategoryMap = new Map<number, string>();
        
        menuItems.forEach(item => {
          if (item.category_ids && item.category_ids.length > 0) {
            item.category_ids.forEach(categoryId => {
              if (!fallbackCategoryMap.has(categoryId)) {
                fallbackCategoryMap.set(categoryId, `Category ${categoryId}`);
              }
            });
          }
        });
        
        setCategories(fallbackCategoryMap);
      }
    };
    
    if (menuItems.length > 0) {
      fetchCategories();
    }
  }, [menuItems]);
  
  // Filter menu items based on search and category
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = selectedCategory === 'all' || 
      (item.category_ids && item.category_ids.includes(Number(selectedCategory)));
      
    return matchesSearch && matchesCategory;
  });
  
  // Group menu items by category for better organization in the UI
  const groupedMenuItems = () => {
    if (selectedCategory !== 'all') {
      return { [selectedCategory]: filteredMenuItems.filter(item => 
        item.category_ids && item.category_ids.includes(Number(selectedCategory))
      )};
    }
    
    const grouped: Record<string, MenuItem[]> = { uncategorized: [] };
    
    filteredMenuItems.forEach(item => {
      if (!item.category_ids || item.category_ids.length === 0) {
        grouped.uncategorized.push(item);
        return;
      }
      
      item.category_ids.forEach(categoryId => {
        const key = categoryId.toString();
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
    });
    
    if (grouped.uncategorized.length === 0) {
      delete grouped.uncategorized;
    }
    
    return grouped;
  };
  
  // Handle adding item to cart
  const handleAddItem = (item: MenuItem) => {
    // Check if item has option groups
    if (item.option_groups && item.option_groups.length > 0) {
      // Open customization modal
      setCustomizingItem(item);
    } else {
      // Add item directly to cart
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        type: 'food',
        image: item.image
      }, 1);
    }
  };
  
  // Handle adding customized item to cart
  const handleAddCustomizedItem = (item: MenuItem, customizations: any[], quantity: number) => {
    // Add item with customizations to cart
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      type: 'food',
      image: item.image,
      customizations: customizations
    }, quantity);
    
    // Close customization modal
    setCustomizingItem(null);
  };
  
  // Handle order submission
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to the order');
      return;
    }
    
    // Prepare the phone number - if it's just the prefix, treat as empty
    const finalPhone = contactPhone.trim() === '+1671' ? '' : contactPhone.trim();
    
    // Validate phone if provided
    if (finalPhone && !isValidPhone(finalPhone)) {
      alert('Phone must be + (3 or 4 digit area code) + 7 digits, e.g. +16711234567');
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
        undefined, // No transaction ID for in-person orders
        'in_person' // Payment method for staff-placed orders
      );
      
      // Show success and close modal
      onOrderCreated(newOrder.id);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    }
  };
  
  // Find cart item by ID
  const findCartItem = (id: string) => {
    return cartItems.find(item => item.id === id);
  };
  
  // Display customizations in cart item if they exist
  const renderCustomizations = (item: any) => {
    if (!item.customizations || item.customizations.length === 0) return null;
    
    return (
      <div className="text-xs text-gray-500 mt-1">
        {item.customizations.map((customization: any, index: number) => (
          <div key={index}>
            {customization.option_name}
            {customization.price > 0 && ` (+$${customization.price.toFixed(2)})`}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Create Staff Order</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content area - split into menu items and cart */}
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Menu Items Section */}
          <div className="md:w-2/3 p-4 overflow-y-auto">
            {/* Search and filters */}
            <div className="mb-4 sticky top-0 bg-white z-10 space-y-2">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c1902f]"
              />
              
              <div className="flex flex-wrap gap-2 overflow-x-auto py-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedCategory === 'all'
                      ? 'bg-[#c1902f] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Items
                </button>
                
                {Array.from(categories.entries()).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedCategory(id)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedCategory === id
                        ? 'bg-[#c1902f] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Menu items grid for quick selection */}
            {menuLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c1902f]"></div>
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No menu items found matching your search criteria
              </div>
            ) : (
              Object.entries(groupedMenuItems()).map(([categoryId, items]) => (
                <div key={categoryId} className="mb-6">
                  <h3 className="font-medium text-lg mb-3">
                    {categories.get(Number(categoryId)) || (categoryId === 'uncategorized' ? 'Uncategorized' : `Category ${categoryId}`)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => {
                      const cartItem = findCartItem(item.id);
                      const isInCart = !!cartItem;
                      const hasOptions = item.option_groups && item.option_groups.length > 0;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`
                            border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow
                            ${isInCart ? 'border-[#c1902f] bg-yellow-50' : 'border-gray-200'}
                          `}
                        >
                          <div className="flex h-full">
                            {/* Item image */}
                            <div className="w-24 h-24 flex-shrink-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                                }}
                              />
                            </div>
                            
                            {/* Item details */}
                            <div className="flex-1 p-3 flex flex-col justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                                  {item.name}
                              {hasOptions && (
                                <span className="ml-1 text-xs text-[#c1902f] font-medium">
                                  (Customizable ↓)
                                </span>
                              )}
                                </h4>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-1">{item.description}</p>
                                <p className="text-[#c1902f] font-medium">${item.price.toFixed(2)}</p>
                              </div>
                              
                              {/* Add/remove buttons */}
                              <div className="flex items-center justify-end mt-1">
                                {isInCart ? (
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => cartItem.quantity > 1 
                                        ? setCartQuantity(item.id, cartItem.quantity - 1)
                                        : removeFromCart(item.id)
                                      }
                                      className="text-gray-600 hover:text-[#c1902f] p-1 focus:outline-none"
                                      aria-label="Decrease quantity"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                    <span className="mx-2 w-6 text-center">{cartItem.quantity}</span>
                                    <button
                                      onClick={() => setCartQuantity(item.id, cartItem.quantity + 1)}
                                      className="text-gray-600 hover:text-[#c1902f] p-1 focus:outline-none"
                                      aria-label="Increase quantity"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                    
                                    {hasOptions && (
                                      <button
                                        onClick={() => setCustomizingItem(item)}
                                        className="ml-1 p-1 text-gray-600 hover:text-[#c1902f] focus:outline-none"
                                        aria-label="Edit customizations"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    {hasOptions ? (
                                      <button
                                        onClick={() => setCustomizingItem(item)}
                                        className="bg-[#c1902f] text-white px-3 py-1 rounded-md font-medium hover:bg-[#a97c28] text-sm focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50 transition-colors"
                                        aria-label="Customize"
                                      >
                                        Customize
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleAddItem(item)}
                                        className="text-[#c1902f] hover:bg-[#c1902f] hover:text-white p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50"
                                        aria-label="Add to order"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
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
          
          {/* Cart Section */}
          <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-gray-200 p-4 flex flex-col h-[50vh] md:h-auto">
            <h3 className="text-lg font-medium mb-4">Current Order</h3>
            
            {/* Cart items */}
            <div className="flex-1 overflow-y-auto mb-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items in the order yet
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex border-b border-gray-100 pb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        {renderCustomizations(item)}
                        <div className="flex justify-between mt-1">
                          <div className="flex items-center">
                            <button
                              onClick={() => item.quantity > 1 
                                ? setCartQuantity(item.id, item.quantity - 1)
                                : removeFromCart(item.id)
                              }
                              className="text-gray-600 hover:text-[#c1902f] p-1 focus:outline-none"
                              aria-label="Decrease quantity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <span className="mx-2 w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => setCartQuantity(item.id, item.quantity + 1)}
                              className="text-gray-600 hover:text-[#c1902f] p-1 focus:outline-none"
                              aria-label="Increase quantity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          <span className="text-gray-700">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-2 text-gray-400 hover:text-red-500 p-1 focus:outline-none"
                        aria-label="Remove item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Customer information */}
            <div className="space-y-3 mb-4">
              <h4 className="font-medium">Customer Information (Optional)</h4>
              
              <div>
                <label htmlFor="customerName" className="block text-sm text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] text-sm"
                  placeholder="Customer name"
                />
              </div>
              
              <div>
                <label htmlFor="customerPhone" className="block text-sm text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] text-sm"
                  placeholder="+1671"
                />
              </div>
              
              <div>
                <label htmlFor="customerEmail" className="block text-sm text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] text-sm"
                  placeholder="Email address"
                />
              </div>
              
              <div>
                <label htmlFor="specialInstructions" className="block text-sm text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  id="specialInstructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] text-sm"
                  placeholder="Special instructions or notes"
                  rows={2}
                ></textarea>
              </div>
            </div>
            
            {/* Order total and submit button */}
            <div className="mt-auto">
              <div className="flex justify-between items-center mb-4 border-t border-b border-gray-200 py-2">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold text-xl">${orderTotal.toFixed(2)}</span>
              </div>
              
              <button
                onClick={handleSubmitOrder}
                disabled={cartItems.length === 0 || orderLoading}
                className="w-full py-3 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28] focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {orderLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Create Order'
                )}
              </button>
              
              <button 
                onClick={onClose}
                className="w-full mt-2 py-2 text-gray-600 rounded-md font-medium hover:bg-gray-100 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Item Customization Modal */}
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
