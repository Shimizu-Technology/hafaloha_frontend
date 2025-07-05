// src/ordering/components/admin/reports/VipCustomerReport.tsx
import React, { useState, useMemo } from 'react';
import { VipCustomerReport as VipCustomerReportType, VipReportSummary } from '../../../../shared/api';
import * as XLSX from 'xlsx';

interface VipCustomerReportProps {
  vipCustomers: VipCustomerReportType[];
  summary: VipReportSummary;
}

export function VipCustomerReport({ vipCustomers, summary }: VipCustomerReportProps) {
  // State for sorting
  const [sortField, setSortField] = useState<'user_name' | 'total_spent' | 'order_count'>('total_spent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle sort click
  const handleSortClick = (field: 'user_name' | 'total_spent' | 'order_count') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sorted VIP customers
  const sortedVipCustomers = useMemo(() => {
    return [...vipCustomers].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'user_name') {
        comparison = a.user_name.localeCompare(b.user_name);
      } else if (sortField === 'total_spent') {
        comparison = Number(a.total_spent) - Number(b.total_spent);
      } else if (sortField === 'order_count') {
        comparison = Number(a.order_count) - Number(b.order_count);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [vipCustomers, sortField, sortDirection]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (vipCustomers.length === 0) {
      alert('No data to export');
      return;
    }

    // Format summary data for export
    const summaryData = [
      { 'Metric': 'Total VIP Customers', 'Value': summary.total_vip_customers },
      { 'Metric': 'Total Orders', 'Value': summary.total_orders },
      { 'Metric': 'Total Revenue', 'Value': `$${Number(summary.total_revenue).toFixed(2)}` },
      { 'Metric': 'Average Orders per VIP', 'Value': Number(summary.average_orders_per_vip).toFixed(1) },
      { 'Metric': 'Average Spend per VIP', 'Value': `$${Number(summary.average_spend_per_vip).toFixed(2)}` },
      { 'Metric': 'Repeat Customer Rate', 'Value': `${(Number(summary.repeat_customer_rate) * 100).toFixed(0)}%` }
    ];

    // Format customer data for export
    const customerData = sortedVipCustomers.map(customer => {
      // Get top 3 items
      const topItems = customer.items
        .sort((a, b) => Number(b.quantity) - Number(a.quantity))
        .slice(0, 3)
        .map(item => `${item.name} (${item.quantity})`)
        .join(', ');

      return {
        'Customer': customer.user_name,
        'Email': customer.email,
        'Total Spent': `$${Number(customer.total_spent).toFixed(2)}`,
        'Orders': Number(customer.order_count),
        'Avg. Order Value': `$${Number(customer.average_order_value).toFixed(2)}`,
        'First Order': formatDate(customer.first_order_date),
        'Most Ordered Items': topItems
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Add customers sheet
    const customerSheet = XLSX.utils.json_to_sheet(customerData);
    XLSX.utils.book_append_sheet(wb, customerSheet, 'VIP Customers');

    // Write file
    const now = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `VIP_Customer_Report_${now}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-lg sm:text-xl font-bold">VIP Customer Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">
            {vipCustomers.length} VIP customers • ${Number(summary.total_revenue).toFixed(2)} total revenue
          </p>
        </div>
        
        {/* Export button */}
        {vipCustomers.length > 0 && (
          <button
            onClick={exportToExcel}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center text-base sm:text-sm"
          >
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="sm:hidden">Export</span>
          </button>
        )}
      </div>
      
      {vipCustomers.length > 0 ? (
        <>
          {/* Summary statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total VIP Customers</div>
              <div className="text-2xl font-bold">{summary.total_vip_customers}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Average Orders per VIP</div>
              <div className="text-2xl font-bold">{Number(summary.average_orders_per_vip).toFixed(1)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg sm:col-span-2 lg:col-span-1">
              <div className="text-sm text-purple-600 font-medium">Repeat Customer Rate</div>
              <div className="text-2xl font-bold">{(summary.repeat_customer_rate * 100).toFixed(0)}%</div>
            </div>
          </div>
          
          {/* Customer details section */}
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-4">VIP Customer Details</h4>
            
            {/* Sort controls for mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSortClick('total_spent')}
                  className={`px-4 py-2 sm:px-3 sm:py-1 rounded text-base sm:text-sm transition-colors ${
                    sortField === 'total_spent'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Total Spent {sortField === 'total_spent' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortClick('order_count')}
                  className={`px-4 py-2 sm:px-3 sm:py-1 rounded text-base sm:text-sm transition-colors ${
                    sortField === 'order_count'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Orders {sortField === 'order_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortClick('user_name')}
                  className={`px-4 py-2 sm:px-3 sm:py-1 rounded text-base sm:text-sm transition-colors ${
                    sortField === 'user_name'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Name {sortField === 'user_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile card view */}
          <div className="sm:hidden space-y-4">
            {sortedVipCustomers.map((customer, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{customer.user_name}</div>
                    <div className="text-sm text-gray-600">{customer.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      First order: {formatDate(customer.first_order_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      ${Number(customer.total_spent).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total spent</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-gray-600">Orders</div>
                    <div className="font-semibold">{Number(customer.order_count)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Avg. Order Value</div>
                    <div className="font-semibold">${Number(customer.average_order_value).toFixed(2)}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Most Ordered Items</div>
                  <div className="space-y-1">
                    {customer.items
                      .sort((a, b) => Number(b.quantity) - Number(a.quantity))
                      .slice(0, 3)
                      .map((item, i) => (
                        <div key={i} className="text-sm">
                          {item.name} <span className="text-gray-500">({item.quantity})</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="table-auto w-full text-sm border border-gray-200">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSortClick('user_name')}
                  >
                    Customer {sortField === 'user_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSortClick('total_spent')}
                  >
                    Total Spent {sortField === 'total_spent' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSortClick('order_count')}
                  >
                    Orders {sortField === 'order_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Avg. Order Value</th>
                  <th className="px-4 py-3 text-left font-semibold">Most Ordered Items</th>
                </tr>
              </thead>
              <tbody>
                {sortedVipCustomers.map((customer, idx) => (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{customer.user_name}</div>
                      <div className="text-xs text-gray-500">{customer.email}</div>
                      <div className="text-xs text-gray-500">
                        First order: {formatDate(customer.first_order_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">${Number(customer.total_spent).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{Number(customer.order_count)}</td>
                    <td className="px-4 py-3 text-right">${Number(customer.average_order_value).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {customer.items
                        .sort((a, b) => Number(b.quantity) - Number(a.quantity))
                        .slice(0, 3)
                        .map((item, i) => (
                          <div key={i} className="text-sm">
                            {item.name} <span className="text-gray-500">({item.quantity})</span>
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No VIP Customers</h4>
          <p className="text-gray-500">VIP customer data will appear here once customers make qualifying purchases.</p>
        </div>
      )}
    </div>
  );
}