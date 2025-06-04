// src/ordering/wholesale/components/WholesaleConfirmationPage.tsx

import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Calendar, ArrowLeft, Users, Heart, Share, User } from 'lucide-react';
import { CartItem } from '../store/cartStore';
import useFundraiserStore from '../store/fundraiserStore';
import toastUtils from '../../../shared/utils/toastUtils';

interface LocationState {
  orderNumber: string;
  orderTotal: number;
  items: CartItem[];
  orderId?: number;
  fundraiserId?: number;
}

const WholesaleConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { fetchFundraiserById, currentFundraiser } = useFundraiserStore();
  
  // If no order data is available, redirect to wholesale page
  if (!state || !state.orderNumber) {
    useEffect(() => {
      navigate('/wholesale');
    }, [navigate]);
    return null;
  }
  
  const { orderNumber, orderTotal, items, fundraiserId } = state;
  
  // Fetch fundraiser information if available
  useEffect(() => {
    if (fundraiserId && !currentFundraiser) {
      fetchFundraiserById(fundraiserId);
    }
  }, [fundraiserId, currentFundraiser, fetchFundraiserById]);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // We're not calculating delivery dates as we're using in-store pickup only
  
  // Group items by participant - using a string key to handle 'general' support items
  const itemsByParticipant = items.reduce((groups, item) => {
    // Handle both general support (null participantId) and regular participants
    const participantIdKey = item.participantId ? String(item.participantId) : 'general';
    const participantName = item.participantName || 'General Support';
    
    if (!groups[participantIdKey]) {
      groups[participantIdKey] = {
        participantId: item.participantId,
        participantName: participantName,
        items: []
      };
    }
    
    groups[participantIdKey].items.push(item);
    
    return groups;
  }, {} as Record<string, { participantId: number | null; participantName: string; items: typeof items }>);
  
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back button */}
      <button
        onClick={() => navigate('/wholesale')}
        className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium mb-6"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to Fundraisers
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-green-50 p-8 text-center border-b border-gray-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your order. Your order number is <span className="font-semibold">{orderNumber}</span>.
          </p>
        </div>
        
        {/* Order details */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg flex items-start">
              <div className="bg-[#c1902f] bg-opacity-10 p-2 rounded-full mr-4">
                <Calendar size={24} className="text-[#c1902f]" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Order Date</h3>
                <p className="text-gray-600">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            {/* Estimated delivery section removed - using in-store pickup only */}
            
            {/* Shipping method section removed - using in-store pickup only */}
          </div>
          
          {/* Order summary */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Order Summary</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Order #{orderNumber}
                  </p>
                </div>
                <div className="bg-[#c1902f] bg-opacity-10 px-4 py-2 rounded-full">
                  <p className="text-[#c1902f] font-medium">
                    {items.reduce((total, item) => total + (item?.quantity || 0), 0)} Items
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {/* Items by participant */}
              {Object.values(itemsByParticipant).map(group => {
                const groupTotal = group.items.reduce(
                  (sum, item) => sum + ((item?.item?.price || 0) * (item?.quantity || 0)), 0
                );
                
                return (
                  <div key={group.participantId} className="mb-6 last:mb-0">
                    <div className="flex justify-between items-center bg-[#f9f5e8] p-3 rounded-t-lg border border-[#f0e8d0]">
                      <div className="flex items-center">
                        <User size={18} className="text-[#c1902f] mr-2" />
                        <h4 className="font-medium text-gray-800">
                          Supporting: <span className="text-[#c1902f] font-semibold">{group.participantName}</span>
                        </h4>
                      </div>
                      <span className="text-[#c1902f] font-semibold">{formatCurrency(groupTotal)}</span>
                    </div>
                    
                    <div className="border border-gray-200 border-t-0 rounded-b-lg overflow-hidden">
                      {group.items.map((cartItem, index) => (
                        <div key={cartItem?.item?.id || `participant-${group.participantId}-item-${index}`} 
                             className="flex items-center p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                          {/* Item image */}
                          <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden mr-4 flex-shrink-0">
                            {cartItem && cartItem.item && cartItem.item.image_url ? (
                              <img 
                                src={cartItem.item.image_url} 
                                alt={cartItem.item.name || 'Product'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No image</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Item details */}
                          <div className="flex-grow">
                            <h5 className="font-medium text-gray-900">{cartItem?.item?.name || 'Product'}</h5>
                            <div className="flex flex-col gap-1 mt-1">
                              {cartItem?.item?.description && (
                                <p className="text-sm text-gray-600">{cartItem.item.description}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Unit Price:</span> {formatCurrency(cartItem?.item?.price || 0)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Quantity and price */}
                          <div className="text-right ml-4">
                            <p className="text-gray-600">Qty: <span className="font-medium">{cartItem?.quantity || 0}</span></p>
                            <p className="font-medium text-gray-900">{formatCurrency((cartItem?.item?.price || 0) * (cartItem?.quantity || 0))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Order Details Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(orderTotal)}</span>
                  </div>
                  
                  {/* We can add tax information here if needed */}
                  {/* <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">{formatCurrency(0)}</span>
                  </div> */}
                  
                  {/* Final Total - Prominent display */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-[#c1902f]">{formatCurrency(orderTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fundraiser Impact Section */}
          {currentFundraiser && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-100 mb-6">
              <div className="flex items-center mb-4">
                <Heart size={20} className="text-[#c1902f] mr-2" />
                <h3 className="font-semibold text-gray-900 text-lg">Your Impact</h3>
              </div>
              
              <div className="mb-4 bg-white p-4 rounded-lg border border-green-100">
                <div className="flex items-center">
                  <User size={18} className="text-[#c1902f] mr-2 flex-shrink-0" />
                  <p className="text-gray-700">
                    Thank you for supporting <span className="text-[#c1902f] font-semibold">{currentFundraiser.name}</span>!
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-100">
                <div className="flex items-center mb-2">
                  <Users size={18} className="text-[#c1902f] mr-2" />
                  <h4 className="font-medium text-gray-800">Fundraiser Details</h4>
                </div>
                <p className="text-gray-600">{currentFundraiser.description}</p>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => {
                    const shareText = `I just supported ${currentFundraiser.name} through Hafaloha! Join me in making a difference.`;
                    if (navigator.share) {
                      navigator.share({
                        title: 'Support this Fundraiser',
                        text: shareText,
                        url: window.location.origin + '/wholesale/' + currentFundraiser.slug,
                      }).catch(err => console.error('Error sharing:', err));
                    } else {
                      // Fallback for browsers that don't support Web Share API
                      navigator.clipboard.writeText(shareText + ' ' + window.location.origin + '/wholesale/' + currentFundraiser.slug)
                        .then(() => toastUtils.success('Share link copied to clipboard!'))
                        .catch(err => console.error('Error copying to clipboard:', err));
                    }
                  }}
                  className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium"
                >
                  <Share size={16} className="mr-1" />
                  Share Fundraiser
                </button>
              </div>
            </div>
          )}
          
          {/* Next steps */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
            <p className="text-gray-600 mb-4">
              You will receive an email confirmation shortly with your order details. We'll notify you when your order is ready for pickup.
            </p>
            <p className="text-gray-600">
              If you have any questions about your order, please contact our customer service team at <a href="mailto:sales@hafaloha.com" className="text-[#c1902f] hover:text-[#d4a43f]">sales@hafaloha.com</a>.
            </p>
          </div>
          
          <div className="mt-8 text-center space-y-4">
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/wholesale"
                className="px-6 py-3 bg-[#c1902f] hover:bg-[#d4a43f] text-white font-medium rounded-lg transition-colors duration-300 inline-block"
              >
                Browse More Fundraisers
              </Link>
              
              {fundraiserId && (
                <button
                  onClick={() => navigate(`/wholesale/${currentFundraiser?.slug}`)}
                  className="px-6 py-3 border border-[#c1902f] text-[#c1902f] hover:bg-[#c1902f] hover:text-white font-medium rounded-lg transition-colors duration-300 inline-block"
                >
                  Return to This Fundraiser
                </button>
              )}
            </div>
            
            {/* Fundraiser organizer section removed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleConfirmationPage;
