// src/ordering/wholesale/components/WholesaleRoutes.tsx

import { Routes, Route } from 'react-router-dom';
import WholesaleLandingPage from './WholesaleLandingPage';
import FundraiserDetailPage from './FundraiserDetailPage';
import FundraiserItemsPage from './FundraiserItemsPage';
import WholesaleCartPage from './WholesaleCartPage';
import WholesaleCheckoutPage from './WholesaleCheckoutPage';
import WholesaleConfirmationPage from './WholesaleConfirmationPage';
import FundraiserManager from './admin/FundraiserManager';
import FundraiserDetailsPage from './admin/FundraiserDetailsPage';

export function WholesaleRoutes() {
  return (
    <Routes>
      {/* Landing page - lists all fundraisers */}
      <Route path="/" element={<WholesaleLandingPage />} />
      
      {/* Fundraiser detail page - shows a specific fundraiser */}
      <Route path="/fundraisers/:id" element={<FundraiserDetailPage />} />
      
      {/* Fundraiser items page - shows all items for a specific fundraiser */}
      <Route path="/fundraisers/:id/items" element={<FundraiserItemsPage />} />
      
      {/* Cart page */}
      <Route path="/cart" element={<WholesaleCartPage />} />
      
      {/* Checkout page */}
      <Route path="/checkout" element={<WholesaleCheckoutPage />} />
      
      {/* Order confirmation page */}
      <Route path="/confirmation" element={<WholesaleConfirmationPage />} />
      
      {/* Admin pages */}
      <Route path="/admin/fundraisers" element={<FundraiserManager />} />
      <Route path="/admin/fundraisers/:id" element={<FundraiserDetailsPage />} />
    </Routes>
  );
}

export default WholesaleRoutes;
