// src/wholesale/WholesaleApp.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WholesaleCartProvider } from './context/WholesaleCartProvider';
import FundraiserList from './components/FundraiserList';
import FundraiserDetail from './components/FundraiserDetail';
import WholesaleCart from './components/WholesaleCart';
import WholesaleCheckout from './components/WholesaleCheckout';
import OrderConfirmation from './components/OrderConfirmation';
import OrderHistory from './components/OrderHistory';
import OrderDetail from './components/OrderDetail';

export default function WholesaleApp() {
  return (
    <WholesaleCartProvider>
      <div className="wholesale-app min-h-screen bg-gray-50">
        {/* Wholesale-specific header/navigation could go here */}
        <div className="container mx-auto px-4 py-6">
          <Routes>
            {/* Homepage - List all fundraisers */}
            <Route path="/" element={<FundraiserList />} />
            
            {/* Cart page */}
            <Route path="/cart" element={<WholesaleCart />} />
            
            {/* Checkout page */}
            <Route path="/checkout" element={<WholesaleCheckout />} />
            
            {/* Order management pages - MUST come before /:fundraiserSlug */}
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:orderId/confirmation" element={<OrderConfirmation />} />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            
            {/* Individual fundraiser pages by slug - MUST be last dynamic route */}
            <Route path="/:fundraiserSlug" element={<FundraiserDetail />} />
            
            {/* Redirect any unknown paths to the homepage */}
            <Route path="*" element={<Navigate to="/wholesale" replace />} />
          </Routes>
        </div>
      </div>
    </WholesaleCartProvider>
  );
}