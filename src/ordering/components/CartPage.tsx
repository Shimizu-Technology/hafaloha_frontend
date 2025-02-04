// src/ordering/components/CartPage.tsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, Minus, Plus } from 'lucide-react';
import { useOrderStore } from '../store/orderStore'; // <-- import from the store
import type { CartItem } from '../types/menu';

export function CartPage() {
  // Pull cart data & methods from your zustand store
  const navigate = useNavigate();
  const {
    cartItems,              // array of CartItem
    setCartQuantity,        // method to update item quantity
    removeFromCart,         // method to remove an item
  } = useOrderStore();

  // Compute total on the fly
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // If empty, show a message
  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add some delicious items to get started!</p>
        <Link
          to="/ordering/menu"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#c1902f] hover:bg-[#d4a43f]"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
        Your Cart
      </h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-7">
          {cartItems.map((item: CartItem) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 py-6 border-b"
            >
              {/* Item image */}
              <img
                src={item.image}
                alt={item.name}
                className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-md"
              />

              {/* Item details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">
                  {item.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {item.description}
                </p>

                {/* Customizations, if any */}
                {item.customizations && (
                  <div className="mt-1">
                    {Object.entries(item.customizations).map(([key, values]) => (
                      <p key={key} className="text-sm text-gray-600">
                        {key}: {values.join(', ')}
                      </p>
                    ))}
                  </div>
                )}

                {/* Quantity + Remove */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border rounded-md">
                    <button
                      className="p-2 text-gray-600 hover:text-gray-900"
                      onClick={() => setCartQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 border-x">
                      {item.quantity}
                    </span>
                    <button
                      className="p-2 text-gray-600 hover:text-gray-900"
                      onClick={() => setCartQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 p-2"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <span className="text-lg font-medium text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-5 mt-8 lg:mt-0">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                className="
                  w-full flex items-center justify-center 
                  px-6 py-3 border border-transparent 
                  text-base font-medium rounded-md text-white
                  bg-[#c1902f]
                  hover:bg-[#d4a43f]
                "
                onClick={() => navigate('/ordering/checkout')}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
