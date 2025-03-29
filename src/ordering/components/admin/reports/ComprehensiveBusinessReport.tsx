// src/ordering/components/admin/reports/ComprehensiveBusinessReport.tsx
import React, { useState } from 'react';
import { 
  MenuItemReport, 
  CategoryReport, 
  PaymentMethodReport as PaymentMethodReportType,
  VipCustomerReport as VipCustomerReportType,
  VipReportSummary
} from '../../../../shared/api';

interface ComprehensiveBusinessReportProps {
  menuItems: MenuItemReport[];
  categories: CategoryReport[];
  paymentMethods: PaymentMethodReportType[];
  paymentTotals: { amount: number; count: number };
  vipCustomers: VipCustomerReportType[];
  vipSummary: VipReportSummary;
  onExport: () => void;
}

export function ComprehensiveBusinessReport({
  menuItems,
  categories,
  paymentMethods,
  paymentTotals,
  vipCustomers,
  vipSummary,
  onExport
}: ComprehensiveBusinessReportProps) {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    menuItems: false,
    paymentMethods: false,
    vipCustomers: false
  });

  // Toggle section expansion
  const toggleSection = (section: 'menuItems' | 'paymentMethods' | 'vipCustomers') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Comprehensive Business Report</h3>
        
        {/* Export button */}
        {(menuItems.length > 0 || paymentMethods.length > 0 || vipCustomers.length > 0) && (
          <button
            onClick={onExport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
          >
            <span className="mr-1">Export Comprehensive Report</span>
          </button>
        )}
      </div>
      
      {/* Executive Summary */}
      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-2">Executive Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
            <div className="text-2xl font-bold">${paymentTotals.amount.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Orders</div>
            <div className="text-2xl font-bold">{paymentTotals.count}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">VIP Customer Revenue</div>
            <div className="text-2xl font-bold">${Number(vipSummary.total_revenue).toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      {/* Cross-Report Analysis */}
      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-2">Cross-Report Analysis</h4>
        
        {/* Top Categories and Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          {/* Top Categories */}
          <div>
            <h5 className="font-medium text-base mb-2">Top Revenue Categories</h5>
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm border border-gray-200">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                    <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                    <th className="px-4 py-2 text-right font-semibold">Items Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {categories
                    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
                    .slice(0, 5)
                    .map((cat, idx) => (
                      <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-4 py-2">{cat.name}</td>
                        <td className="px-4 py-2 text-right">${Number(cat.revenue).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{cat.quantity_sold}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Top Payment Methods */}
          <div>
            <h5 className="font-medium text-base mb-2">Payment Method Distribution</h5>
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm border border-gray-200">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Method</th>
                    <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    <th className="px-4 py-2 text-right font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods
                    .sort((a, b) => Number(b.amount) - Number(a.amount))
                    .slice(0, 5)
                    .map((method, idx) => (
                      <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-4 py-2 capitalize">
                          {method.payment_method
                            .replace(/_/g, ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                        </td>
                        <td className="px-4 py-2 text-right">${Number(method.amount).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{Number(method.percentage).toFixed(2)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* VIP Customer Insights */}
        <div>
          <h5 className="font-medium text-base mb-2">VIP Customer Insights</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VIP Customer Stats */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total VIP Customers</div>
                  <div className="text-xl font-bold">{vipSummary.total_vip_customers}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg. Orders per VIP</div>
                  <div className="text-xl font-bold">{Number(vipSummary.average_orders_per_vip).toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg. Spend per VIP</div>
                  <div className="text-xl font-bold">${Number(vipSummary.average_spend_per_vip).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Repeat Customer Rate</div>
                  <div className="text-xl font-bold">{(Number(vipSummary.repeat_customer_rate) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
            
            {/* Top VIP Items */}
            <div>
              <h6 className="text-sm font-medium mb-2">Most Popular Items Among VIP Customers</h6>
              {vipCustomers.length > 0 ? (
                <div>
                  {/* Calculate most popular items across all VIP customers */}
                  {(() => {
                    const itemCounts: Record<string, number> = {};
                    vipCustomers.forEach(customer => {
                      customer.items.forEach(item => {
                        if (!itemCounts[item.name]) {
                          itemCounts[item.name] = 0;
                        }
                        itemCounts[item.name] += item.quantity;
                      });
                    });
                    
                    return Object.entries(itemCounts)
                      .sort(([, countA], [, countB]) => countB - countA)
                      .slice(0, 5)
                      .map(([itemName, count], idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b last:border-b-0">
                          <span>{itemName}</span>
                          <span className="font-medium">{count} ordered</span>
                        </div>
                      ));
                  })()}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No VIP customer data available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Collapsible Individual Reports */}
      <div>
        <h4 className="font-semibold text-lg mb-2">Detailed Reports</h4>
        <p className="text-sm text-gray-600 mb-4">
          Expand each section below to view detailed reports for specific aspects of your business.
        </p>
        
        <div className="space-y-4">
          {/* Menu Item Performance */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="bg-gray-50 px-4 py-2 font-medium cursor-pointer flex justify-between items-center"
              onClick={() => toggleSection('menuItems')}
            >
              <span>Menu Item Performance Details</span>
              <span>{expandedSections.menuItems ? '▼' : '▶'}</span>
            </div>
            {expandedSections.menuItems && (
              <div className="p-4">
                <h5 className="font-medium mb-2">Top 10 Menu Items by Revenue</h5>
                <div className="overflow-x-auto">
                  <table className="table-auto w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Item</th>
                        <th className="px-4 py-2 text-left font-semibold">Category</th>
                        <th className="px-4 py-2 text-right font-semibold">Quantity Sold</th>
                        <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                        <th className="px-4 py-2 text-right font-semibold">Avg. Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems
                        .sort((a, b) => Number(b.revenue) - Number(a.revenue))
                        .slice(0, 10)
                        .map((item, idx) => (
                          <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-4 py-2">{item.name}</td>
                            <td className="px-4 py-2">{item.category}</td>
                            <td className="px-4 py-2 text-right">{item.quantity_sold}</td>
                            <td className="px-4 py-2 text-right">${Number(item.revenue).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">${item.average_price ? Number(item.average_price).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Payment Method Details */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="bg-gray-50 px-4 py-2 font-medium cursor-pointer flex justify-between items-center"
              onClick={() => toggleSection('paymentMethods')}
            >
              <span>Payment Method Details</span>
              <span>{expandedSections.paymentMethods ? '▼' : '▶'}</span>
            </div>
            {expandedSections.paymentMethods && (
              <div className="p-4">
                <h5 className="font-medium mb-2">All Payment Methods</h5>
                <div className="overflow-x-auto">
                  <table className="table-auto w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Payment Method</th>
                        <th className="px-4 py-2 text-right font-semibold">Count</th>
                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                        <th className="px-4 py-2 text-right font-semibold">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods
                        .sort((a, b) => Number(b.amount) - Number(a.amount))
                        .map((method, idx) => (
                          <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-4 py-2 capitalize">
                              {method.payment_method
                                .replace(/_/g, ' ')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                            </td>
                            <td className="px-4 py-2 text-right">{method.count}</td>
                            <td className="px-4 py-2 text-right">${Number(method.amount).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{Number(method.percentage).toFixed(2)}%</td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-2 font-semibold">Total</td>
                        <td className="px-4 py-2 text-right font-semibold">{paymentTotals.count}</td>
                        <td className="px-4 py-2 text-right font-semibold">${Number(paymentTotals.amount).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-semibold">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* VIP Customer Details */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="bg-gray-50 px-4 py-2 font-medium cursor-pointer flex justify-between items-center"
              onClick={() => toggleSection('vipCustomers')}
            >
              <span>VIP Customer Details</span>
              <span>{expandedSections.vipCustomers ? '▼' : '▶'}</span>
            </div>
            {expandedSections.vipCustomers && (
              <div className="p-4">
                <h5 className="font-medium mb-2">Top VIP Customers by Spending</h5>
                <div className="overflow-x-auto">
                  <table className="table-auto w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Customer</th>
                        <th className="px-4 py-2 text-right font-semibold">Total Spent</th>
                        <th className="px-4 py-2 text-right font-semibold">Orders</th>
                        <th className="px-4 py-2 text-right font-semibold">Avg. Order Value</th>
                        <th className="px-4 py-2 text-left font-semibold">Most Ordered Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vipCustomers
                        .sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
                        .slice(0, 10)
                        .map((customer, idx) => {
                          // Get top 3 items
                          const topItems = customer.items
                            .sort((a, b) => Number(b.quantity) - Number(a.quantity))
                            .slice(0, 3)
                            .map(item => `${item.name} (${item.quantity})`)
                            .join(', ');
                            
                          return (
                            <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <div>{customer.user_name}</div>
                                <div className="text-xs text-gray-500">{customer.email}</div>
                              </td>
                              <td className="px-4 py-2 text-right">${Number(customer.total_spent).toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">{Number(customer.order_count)}</td>
                              <td className="px-4 py-2 text-right">${Number(customer.average_order_value).toFixed(2)}</td>
                              <td className="px-4 py-2">{topItems}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}