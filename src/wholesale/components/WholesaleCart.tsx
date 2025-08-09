// src/wholesale/components/WholesaleCart.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

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
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Cart</h1>
            {fundraiser && (
              <p className="text-gray-600">
                Supporting: <span className="font-medium">{fundraiser.name}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Items: {getTotalQuantity()}</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(getCartTotal())}</div>
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
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-[#c1902f] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                </div>
                <div className="mt-1 font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</div>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-600">Total</div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(getCartTotal())}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={continueHref}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Shop More
            </Link>
            <Link
              to="/wholesale/checkout"
              className="inline-flex items-center px-4 py-2 rounded-md bg-[#c1902f] text-white hover:bg-[#d4a43f] transition-colors"
            >
              Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}