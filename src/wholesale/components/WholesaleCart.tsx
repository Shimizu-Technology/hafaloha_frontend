// src/wholesale/components/WholesaleCart.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';
import MobileStickyBar from './MobileStickyBar';
import { wholesaleApi, WholesaleItem } from '../services/wholesaleApi';
import { 
  // Enhanced variant-aware utilities
  getMaxQuantityForItemEnhanced,
  getVariantStockDisplay
} from '../utils/inventoryUtils';

export default function WholesaleCart() {
  const navigate = useNavigate();
  const { 
    items, 
    fundraiser, 
    getCartTotal, 
    getTotalQuantity, 
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useWholesaleCart();

  // State to track detailed item information for inventory validation
  const [itemDetails, setItemDetails] = useState<Record<number, WholesaleItem>>({});
  const [loadingItems, setLoadingItems] = useState<Set<number>>(new Set());
  const [failedItems, setFailedItems] = useState<Set<number>>(new Set());

  // Fetch detailed item information for inventory validation
  useEffect(() => {
    const fetchItemDetails = async () => {
      const itemsToFetch = items
        .map(item => item.itemId)
        .filter(itemId => 
          !itemDetails[itemId] && 
          !loadingItems.has(itemId) && 
          !failedItems.has(itemId) // Don't retry failed items
        );

      if (itemsToFetch.length === 0) {
        return;
      }

      setLoadingItems(prev => new Set([...prev, ...itemsToFetch]));

      try {
        // If we have a fundraiser from context, use it
        if (fundraiser) {
          const response = await wholesaleApi.getFundraiserItems(fundraiser.slug);
          
          if (response.success && response.data && response.data.items) {
            const newItemDetails: Record<number, WholesaleItem> = {};
            // The API returns { items: WholesaleItem[] }
            response.data.items.forEach(item => {
              if (itemsToFetch.includes(item.id)) {
                newItemDetails[item.id] = item;
              }
            });
            
            setItemDetails(prev => ({ ...prev, ...newItemDetails }));
          }
        } else if (items.length > 0) {
          // If no fundraiser context, try to get fundraiser from first cart item
          const firstItem = items[0];
          
          // First get the fundraiser details
          const fundraiserResponse = await wholesaleApi.getFundraisers();
          
          if (fundraiserResponse.success && fundraiserResponse.data && fundraiserResponse.data.fundraisers) {
            // The API returns { fundraisers: WholesaleFundraiser[] }
            const fundraisers = fundraiserResponse.data.fundraisers;
            
            const itemFundraiser = fundraisers.find(f => f.id === firstItem.fundraiserId);
            if (itemFundraiser) {
              // Now get items from this fundraiser
              const itemsResponse = await wholesaleApi.getFundraiserItems(itemFundraiser.slug);
              
              if (itemsResponse.success && itemsResponse.data && itemsResponse.data.items) {
                const newItemDetails: Record<number, WholesaleItem> = {};
                // The API returns { items: WholesaleItem[] }
                itemsResponse.data.items.forEach(item => {
                  if (itemsToFetch.includes(item.id)) {
                    newItemDetails[item.id] = item;
                  }
                });
                
                setItemDetails(prev => ({ ...prev, ...newItemDetails }));
              }
            } else {
              console.error(`Cart: Could not find fundraiser with ID ${firstItem.fundraiserId}`);
              // Mark all items as failed
              setFailedItems(prev => new Set([...prev, ...itemsToFetch]));
            }
          }
        }
      } catch (error) {
        console.error('Cart: Failed to fetch item details for inventory validation:', error);
        // Mark all items as failed
        setFailedItems(prev => new Set([...prev, ...itemsToFetch]));
      } finally {
        setLoadingItems(prev => {
          const newSet = new Set(prev);
          itemsToFetch.forEach(itemId => newSet.delete(itemId));
          return newSet;
        });
      }
    };

    fetchItemDetails();
  }, [items]); // Only depend on items, not itemDetails to prevent infinite loop

  // Get maximum quantity for a cart item (enhanced for variant tracking)
  const getMaxQuantityForCartItem = (cartItem: any): number => {
    const itemDetail = itemDetails[cartItem.itemId];
    const isLoading = loadingItems.has(cartItem.itemId);
    const hasFailed = failedItems.has(cartItem.itemId);
    
    // If item details failed to load, use generous limits (API issue, not inventory issue)
    if (hasFailed) {
      return Math.max(cartItem.quantity + 10, 50); // Very generous for failed API calls
    }
    
    // If item details are still loading, allow reasonable increases but not unlimited
    if (!itemDetail && isLoading) {
      return Math.max(cartItem.quantity + 5, 10);
    }
    
    // If no item detail and not loading (shouldn't happen), be conservative
    if (!itemDetail) {
      return Math.max(cartItem.quantity + 2, 5);
    }

    // Calculate existing quantity for this item (across all option combinations)
    const existingQuantity = items
      .filter(item => item.itemId === cartItem.itemId)
      .reduce((total, item) => total + item.quantity, 0) - cartItem.quantity; // Subtract current item's quantity

    // Convert cart item options to the format expected by inventory utils
    const selectedOptions = cartItem.options || {};

    // Use enhanced utilities that handle variant tracking
    const maxQuantity = getMaxQuantityForItemEnhanced(itemDetail, selectedOptions, existingQuantity);
    
    return maxQuantity;
  };

  // Check if quantity can be increased for a cart item
  const canIncreaseQuantity = (cartItem: any): boolean => {
    const maxQuantity = getMaxQuantityForCartItem(cartItem);
    return cartItem.quantity < maxQuantity;
  };

  // Get variant-aware stock display for a cart item
  const getCartItemStockDisplay = (cartItem: any) => {
    const itemDetail = itemDetails[cartItem.itemId];
    const isLoading = loadingItems.has(cartItem.itemId);
    const hasFailed = failedItems.has(cartItem.itemId);
    
    if (hasFailed) {
      return {
        status: 'unknown' as const,
        message: 'Inventory status unknown',
        color: 'text-gray-500',
        trackingMode: 'none' as const
      };
    }
    
    if (!itemDetail && isLoading) {
      return {
        status: 'loading' as const,
        message: 'Loading inventory...',
        color: 'text-gray-500',
        trackingMode: 'none' as const
      };
    }
    
    if (!itemDetail) {
      return {
        status: 'unknown' as const,
        message: 'Inventory status unknown',
        color: 'text-gray-500',
        trackingMode: 'none' as const
      };
    }

    // Convert cart item options to the format expected by inventory utils
    const selectedOptions = cartItem.options || {};

    // Use variant-aware stock display
    const stockDisplay = getVariantStockDisplay(itemDetail, selectedOptions);
    
    // Determine tracking mode
    let trackingMode: 'item' | 'option' | 'variant' | 'none' = 'none';
    if (itemDetail.track_variants) {
      trackingMode = 'variant';
    } else if (itemDetail.track_inventory) {
      trackingMode = 'item';
    } else if (itemDetail.uses_option_level_inventory) {
      trackingMode = 'option';
    }
    
    return {
      ...stockDisplay,
      trackingMode
    };
  };

  const continueHref = fundraiser ? `/wholesale/${fundraiser.slug}` : '/wholesale';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (items.length === 0) {
    return (
      <div className="wholesale-cart-empty text-center py-12">
        <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 8.5M7 13l-2 8h13" />
        </svg>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Browse fundraisers to find items to support your favorite cause.</p>
        <Link 
          to="/wholesale"
          className="inline-flex items-center bg-[#c1902f] text-white px-6 py-3 rounded-lg hover:bg-[#d4a43f] transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Browse Fundraisers
        </Link>
      </div>
    );
  }

  return (
    <div className="wholesale-cart max-w-4xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">Your Cart</h1>
            {fundraiser && (
              <p className="text-gray-600 text-sm sm:text-base truncate">
                Supporting: <span className="font-medium">{fundraiser.name}</span>
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs sm:text-sm text-gray-600">Items: {getTotalQuantity()}</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(getCartTotal())}</div>
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="py-4 border-b border-gray-200 last:border-b-0">
              <div className="grid grid-cols-[64px_1fr_auto] gap-3 items-center sm:flex sm:items-center sm:space-x-4">
              {/* Item Image */}
              <div className="flex-shrink-0">
                {item.imageUrl ? (
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={item.name}
                    context="cart"
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Item Details */}
              <div className="min-w-0 sm:flex-1">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2">{item.name}</h3>
                <div className="sm:hidden text-xs text-gray-500 mt-0.5">{formatCurrency(item.price)} each</div>
                {/* Selected Options/Variants */}
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(item.selectedOptions).map(([key, value]) => (
                      <span 
                        key={key}
                        className="inline-flex items-center px-1.5 py-0.5 text-[10px] sm:text-xs font-medium bg-[#c1902f]/10 text-[#c1902f] rounded border border-[#c1902f]/20"
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                      </span>
                    ))}
                  </div>
                )}
                {item.sku && (
                  <p className="hidden sm:block text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                )}
              </div>

              {/* Quantity + Line total */}
              <div className="justify-self-end text-right">
                <div className="flex items-center space-x-2 justify-end">
                <button
                  onClick={() => {
                    if (item.quantity <= 1) {
                      removeFromCart(item.id);
                    } else {
                      updateQuantity(item.id, item.quantity - 1);
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-[#c1902f] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => {
                    if (canIncreaseQuantity(item)) {
                      updateQuantity(item.id, item.quantity + 1);
                    }
                  }}
                  disabled={!canIncreaseQuantity(item)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                    canIncreaseQuantity(item)
                      ? 'border-gray-300 hover:bg-gray-50 hover:border-[#c1902f] cursor-pointer'
                      : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                </div>
                <div className="mt-1 font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</div>
                {/* Enhanced inventory status with variant support */}
                {(() => {
                  const stockDisplay = getCartItemStockDisplay(item);
                  
                  // Show loading or error states
                  if (stockDisplay.status === 'loading' || stockDisplay.status === 'unknown') {
                    return (
                      <div className={`text-xs mt-1 ${stockDisplay.color}`}>
                        {stockDisplay.message}
                      </div>
                    );
                  }
                  
                  // For variant tracking, always show the variant-specific status
                  if (stockDisplay.trackingMode === 'variant') {
                    return (
                      <div className={`text-xs mt-1 flex items-center ${stockDisplay.color}`}>
                        {stockDisplay.message}
                        <span className="ml-1 text-purple-600 font-medium text-[10px] uppercase tracking-wide">VARIANT</span>
                      </div>
                    );
                  }
                  
                  // For other tracking modes, show status when at or near limits
                  const maxQuantity = getMaxQuantityForCartItem(item);
                  const remainingQuantity = maxQuantity - item.quantity;
                  
                  if (maxQuantity < 999 && (remainingQuantity <= 5 || stockDisplay.status === 'out_of_stock' || stockDisplay.status === 'low_stock')) {
                    return (
                      <div className={`text-xs mt-1 ${stockDisplay.color}`}>
                        {stockDisplay.status === 'out_of_stock' ? 'Max reached' :
                         stockDisplay.status === 'low_stock' ? stockDisplay.message :
                         remainingQuantity === 0 ? 'Max reached' : `${remainingQuantity} more available`}
                        {stockDisplay.trackingMode === 'option' && (
                          <span className="ml-1 text-blue-600 font-medium text-[10px] uppercase tracking-wide">OPTION</span>
                        )}
                        {stockDisplay.trackingMode === 'item' && (
                          <span className="ml-1 text-green-600 font-medium text-[10px] uppercase tracking-wide">ITEM</span>
                        )}
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-xs text-red-600 hover:text-red-700 mt-1 transition-colors"
                >
                  Remove
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions (desktop) */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-[#c1902f] hover:text-[#d4a43f] transition-colors font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Continue Shopping
            </button>
            <button
              onClick={clearCart}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 hover:border-gray-400"
            >
              Clear Cart
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(getCartTotal())}</div>
            </div>
            <Link 
              to="/wholesale/checkout"
              className="bg-[#c1902f] text-white px-6 py-3 rounded-lg hover:bg-[#d4a43f] transition-colors font-medium inline-block text-center"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>
      {/* Sticky mobile checkout bar */}
      <MobileStickyBar
        leftTopText="Total"
        leftBottomText={formatCurrency(getCartTotal())}
        buttonLabel="Checkout"
        buttonTo="/wholesale/checkout"
        secondaryLabel="Shop More"
        secondaryTo={continueHref}
      />
    </div>
  );
}