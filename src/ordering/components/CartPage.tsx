// src/ordering/components/CartPage.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, Minus, Plus } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import type { CartItem } from '../types/menu';

export function CartPage() {
  const navigate = useNavigate();
  const { cartItems, setCartQuantity, removeFromCart } = useOrderStore();

  // Sum up the total
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add some delicious items to get started!</p>
        <Link
          to="/ordering/menu"
          className="inline-flex items-center px-6 py-3 border border-transparent
                     text-base font-medium rounded-md text-white
                     bg-[#c1902f] hover:bg-[#d4a43f]"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Cart items list */}
        <div className="lg:col-span-7">
          {cartItems.map((item: CartItem) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-start
                         space-y-4 sm:space-y-0 sm:space-x-4 py-6 border-b"
            >
              {/* Image */}
              <img
                src={item.image}
                alt={item.name}
                className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-md"
              />

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                )}

                {/* If customizations exist, show them */}
                {item.customizations && (
                  <div className="mt-1 text-sm text-gray-600">
                    {Object.entries(item.customizations).map(([groupName, picks]) => (
                      <p key={groupName}>
                        <strong>{groupName}:</strong> {picks.join(', ')}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  {/* Quantity controls */}
                  <div className="flex items-center border rounded-md">
                    <button
                      className="p-2 text-gray-600 hover:text-gray-900"
                      onClick={() => setCartQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 border-x">{item.quantity}</span>
                    <button
                      className="p-2 text-gray-600 hover:text-gray-900"
                      onClick={() => setCartQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Remove item */}
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                className="w-full flex items-center justify-center px-6 py-3 border
                           border-transparent text-base font-medium rounded-md text-white
                           bg-[#c1902f] hover:bg-[#d4a43f]"
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
