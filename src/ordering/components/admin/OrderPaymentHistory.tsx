// src/ordering/components/admin/OrderPaymentHistory.tsx

import React from 'react';

interface OrderPayment {
  id: number;
  payment_type: 'initial' | 'additional' | 'refund';
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  description?: string;
  transaction_id?: string;
}

interface OrderPaymentHistoryProps {
  payments: OrderPayment[];
}

export function OrderPaymentHistory({ payments }: OrderPaymentHistoryProps) {
  // Calculate totals
  const totalPaid = payments
    .filter(p => p.payment_type !== 'refund')
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
  
  const totalRefunded = payments
    .filter(p => p.payment_type === 'refund')
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
  
  const netAmount = totalPaid - totalRefunded;

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to get payment type badge
  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case 'initial':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Initial</span>;
      case 'additional':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Additional</span>;
      case 'refund':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Refund</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{type}</span>;
    }
  };

  // Helper function to get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Completed</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Failed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  // Helper function to format payment method
  const formatPaymentMethod = (method: string) => {
    switch (method.toLowerCase()) {
      case 'credit_card':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'stripe':
        return 'Stripe';
      case 'cash':
        return 'Cash';
      default:
        return method;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Payment history table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(payment.created_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getPaymentTypeBadge(payment.payment_type)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatPaymentMethod(payment.payment_method)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getPaymentStatusBadge(payment.status)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-right ${
                  payment.payment_type === 'refund' ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {payment.payment_type === 'refund' ? '-' : ''}${parseFloat(String(payment.amount)).toFixed(2)}
                </td>
              </tr>
            ))}
            
            {/* If no payments, show a message */}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-sm text-center text-gray-500">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Summary footer */}
          {payments.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700 text-right">
                  Total Paid:
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  ${totalPaid.toFixed(2)}
                </td>
              </tr>
              {totalRefunded > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700 text-right">
                    Total Refunded:
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                    -${totalRefunded.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                  Net Amount:
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                  ${netAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
