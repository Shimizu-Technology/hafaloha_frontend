// src/ordering/components/admin/reports/PaymentMethodReport.tsx
import React, { useState } from 'react';
import { PaymentMethodReport as PaymentMethodReportType } from '../../../../shared/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

// Simplified color palette
const COLORS = [
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16'  // Lime
];

interface PaymentMethodReportProps {
  paymentMethods: PaymentMethodReportType[];
  totalAmount: number;
  totalCount: number;
}

export function PaymentMethodReport({ paymentMethods, totalAmount, totalCount }: PaymentMethodReportProps) {
  const [sortBy, setSortBy] = useState<'amount' | 'count' | 'name'>('amount');

  // Format payment method name for display
  const formatMethodName = (method: string) => {
    const methodMap: Record<string, string> = {
      'house_account': 'House Account',
      'credit_card': 'Credit Card',
      'stripe_reader': 'Card Reader',
      'stripe': 'Stripe',
      'paypal': 'PayPal',
      'cash': 'Cash',
      'other': 'Other',
      'clover': 'Clover',
      'revel': 'Revel'
    };
    
    return methodMap[method.toLowerCase()] || method
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Sort payment methods (simplified - just by amount or count)
  const sortedPaymentMethods = [...paymentMethods].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return Number(b.amount) - Number(a.amount);
      case 'count':
        return b.count - a.count;
      case 'name':
        return formatMethodName(a.payment_method).localeCompare(formatMethodName(b.payment_method));
      default:
        return Number(b.amount) - Number(a.amount);
    }
  });

  // Simplified export function
  const exportToExcel = () => {
    if (paymentMethods.length === 0) {
      alert('No data to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Simple payment method data
    const paymentData: any[] = sortedPaymentMethods.map((method, index) => ({
      'Rank': index + 1,
      'Payment Method': formatMethodName(method.payment_method),
      'Transactions': method.count,
      'Revenue': `$${Number(method.amount).toFixed(2)}`,
      'Percentage': `${Number(method.percentage).toFixed(1)}%`,
      'Avg per Transaction': `$${(Number(method.amount) / method.count).toFixed(2)}`
    }));

    // Add total
    paymentData.push({
      'Rank': '',
      'Payment Method': 'TOTAL',
      'Transactions': totalCount,
      'Revenue': `$${Number(totalAmount).toFixed(2)}`,
      'Percentage': '100.0%',
      'Avg per Transaction': `$${(Number(totalAmount) / totalCount).toFixed(2)}`
    });

    const sheet = XLSX.utils.json_to_sheet(paymentData);
    XLSX.utils.book_append_sheet(wb, sheet, 'Payment Methods');

    const now = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Payment_Methods_${now}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Simple Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Method Breakdown</h3>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} transactions • ${Number(totalAmount).toFixed(2)} total revenue
            </p>
          </div>
          
          {paymentMethods.length > 0 && (
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Export to Excel
            </button>
          )}
        </div>
      </div>

      {paymentMethods.length > 0 ? (
        <div className="p-6">
          {/* Simple Sort Controls */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-gray-600">Sort by:</span>
            {[
              { key: 'amount', label: 'Revenue' },
              { key: 'count', label: 'Transactions' },
              { key: 'name', label: 'Name' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key as typeof sortBy)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  sortBy === key
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Clean Payment Method List */}
          <div className="space-y-3 mb-8">
            {sortedPaymentMethods.map((method, index) => {
              const percentage = Number(method.percentage);
              const amount = Number(method.amount);
              
              return (
                <div
                  key={method.payment_method}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center flex-1">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-medium mr-4">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {formatMethodName(method.payment_method)}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{method.count} transactions</span>
                        <span>${amount.toFixed(2)} revenue</span>
                        <span>${(amount / method.count).toFixed(2)} avg</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {percentage.toFixed(1)}%
                    </div>
                    
                    {/* Simple progress bar */}
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                      <div
                        className="h-2 bg-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Pie Chart */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Revenue Distribution</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods.map(method => ({
                      ...method,
                      amount: Number(method.amount),
                      name: formatMethodName(method.payment_method)
                    }))}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({name, percent}) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No Payment Data</h4>
          <p className="text-gray-500">Payment method breakdown will appear here once transactions are processed.</p>
        </div>
      )}
    </div>
  );
}