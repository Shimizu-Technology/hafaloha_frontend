// src/ordering/components/admin/PaymentStatusSelector.tsx
import React from 'react';

interface PaymentStatusSelectorProps {
  value: 'needs_payment' | 'already_paid';
  onChange: (status: 'needs_payment' | 'already_paid') => void;
}

export function PaymentStatusSelector({ value, onChange }: PaymentStatusSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Payment Status
      </label>
      <div className="flex space-x-2">
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            value === 'needs_payment'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
          onClick={() => onChange('needs_payment')}
        >
          <div className="flex items-center justify-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Needs Payment
          </div>
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            value === 'already_paid'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
          onClick={() => onChange('already_paid')}
        >
          <div className="flex items-center justify-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Already Paid
          </div>
        </button>
      </div>
    </div>
  );
}
