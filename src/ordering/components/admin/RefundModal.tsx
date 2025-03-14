// src/ordering/components/admin/RefundModal.tsx

import React, { useState } from 'react';
import { orderPaymentsApi } from '../../../shared/api/endpoints/orderPayments';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  maxRefundable: number;
  onRefundCreated: () => void;
}

export function RefundModal({
  isOpen,
  onClose,
  orderId,
  maxRefundable,
  onRefundCreated,
}: RefundModalProps) {
  const [amount, setAmount] = useState<string>(maxRefundable.toFixed(2));
  const [reason, setReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow valid numbers
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate amount
    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (refundAmount > maxRefundable) {
      setError(`Refund amount cannot exceed $${maxRefundable.toFixed(2)}`);
      return;
    }

    // Process refund
    setIsProcessing(true);
    try {
      await orderPaymentsApi.createRefund(orderId, {
        amount: refundAmount,
        reason: reason || 'Customer requested refund',
      });

      // Notify parent component
      onRefundCreated();
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Refund error:', err);
      setError('Failed to process refund. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  Process Refund
                </h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700 mb-1">
                        Refund Amount
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          id="refund-amount"
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="0.00"
                          value={amount}
                          onChange={handleAmountChange}
                          aria-describedby="refund-amount-description"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm" id="refund-amount-description">
                            USD
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Maximum refundable amount: ${maxRefundable.toFixed(2)}
                      </p>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for Refund
                      </label>
                      <textarea
                        id="refund-reason"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Reason for refund"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      ></textarea>
                    </div>

                    {error && (
                      <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                          isProcessing ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        {isProcessing ? 'Processing...' : 'Process Refund'}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
