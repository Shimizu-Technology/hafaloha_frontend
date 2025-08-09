// src/wholesale/components/CartConflictModal.tsx
import React from 'react';

interface CartConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFundraiser: string;
  newFundraiser: string;
  itemCount: number;
  onClearAndContinue: () => void;
  onCancelAndStay: () => void;
}

export default function CartConflictModal({
  isOpen,
  onClose,
  currentFundraiser,
  newFundraiser,
  itemCount,
  onClearAndContinue,
  onCancelAndStay
}: CartConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Switch Fundraisers?
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              You currently have <strong>{itemCount} item{itemCount !== 1 ? 's' : ''}</strong> in your cart from{' '}
              <strong className="text-[#c1902f]">{currentFundraiser}</strong>.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Why can I only order from one fundraiser at a time?</p>
                  <p>Each fundraiser has its own shipping and processing requirements. This ensures your order is handled correctly and efficiently.</p>
                </div>
              </div>
            </div>

            <p className="text-gray-700">
              To add items from <strong className="text-[#c1902f]">{newFundraiser}</strong>, you'll need to:
            </p>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-[#c1902f] rounded-full mr-3"></span>
                Clear your current cart, OR
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-[#c1902f] rounded-full mr-3"></span>
                Complete your order with {currentFundraiser} first
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClearAndContinue}
              className="flex-1 bg-[#c1902f] text-white px-4 py-2 rounded-lg hover:bg-[#d4a43f] transition-colors font-medium"
            >
              Clear Cart & Continue
            </button>
            <button
              onClick={onCancelAndStay}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Keep Current Cart
            </button>
          </div>

          {/* Alternative suggestion */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-center text-gray-600">
              <strong>Tip:</strong> You can also{' '}
              <button 
                onClick={onCancelAndStay}
                className="text-[#c1902f] hover:text-[#d4a43f] underline font-medium"
              >
                complete your current order
              </button>
              {' '}first, then come back to shop from {newFundraiser}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}