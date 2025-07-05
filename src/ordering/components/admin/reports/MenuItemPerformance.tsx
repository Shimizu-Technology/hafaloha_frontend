// src/ordering/components/admin/reports/MenuItemPerformance.tsx
import React, { useState, useMemo } from 'react';
import { MenuItemReport, CategoryReport, MenuItemOrderDetail } from '../../../../shared/api';
import * as XLSX from 'xlsx';

interface MenuItemPerformanceProps {
  menuItems: MenuItemReport[];
  categories: CategoryReport[];
  detailedOrders: MenuItemOrderDetail[];
}

// Enhanced interfaces using real data
interface EnhancedMenuItemReport extends MenuItemReport {
  orders?: MenuItemOrderDetail[];
  payment_breakdown?: {
    cash: number;
    card: number;
    online: number;
    other: number;
  };
  customer_breakdown?: {
    guest: number;
    registered: number;
    staff: number;
  };
  peak_hours?: { hour: number; quantity: number }[];
  daily_trends?: { date: string; quantity: number; revenue: number }[];
}

interface EnhancedCategoryReport extends CategoryReport {
  items?: EnhancedMenuItemReport[];
  payment_breakdown?: {
    cash: number;
    card: number;
    online: number;
    other: number;
  };
  customer_breakdown?: {
    guest: number;
    registered: number;
    staff: number;
  };
  daily_trends?: { date: string; quantity: number; revenue: number }[];
  peak_hours?: { hour: number; quantity: number }[];
  top_customizations?: { customization: string; count: number }[];
}

// Interface for grouped menu items
interface GroupedMenuItem {
  id: number;
  name: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  variants: EnhancedMenuItemReport[];
}

// Comprehensive Order Card Component
interface ComprehensiveOrderCardProps {
  order: MenuItemOrderDetail;
  orderIndex: number;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getCustomerType: (order: MenuItemOrderDetail) => 'guest' | 'registered' | 'staff';
}

function ComprehensiveOrderCard({ order, orderIndex, formatCurrency, formatDate, getCustomerType }: ComprehensiveOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const customerType = getCustomerType(order);

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Order Summary Row */}
      <div className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
              customerType === 'staff' ? 'bg-green-500' : customerType === 'registered' ? 'bg-blue-500' : 'bg-amber-500'
            }`}>
              {orderIndex + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 text-sm">{order.order_number}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  customerType === 'staff' ? 'bg-green-100 text-green-700' :
                  customerType === 'registered' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {customerType === 'staff' ? 'Staff' : customerType === 'registered' ? 'Registered' : 'Guest'}
                </span>
                {order.vip_code && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    VIP: {order.vip_code}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {order.customer_name || order.staff_member_name} • {formatDate(order.created_at)}
              </div>
            </div>
            <button className="p-1 rounded-full hover:bg-gray-200 transition-colors">
              <svg className={`w-4 h-4 transform transition-transform text-gray-400 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(order.order_total)}</div>
              <div className="text-xs text-gray-600">{order.payment_method}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-600">{order.quantity}x</div>
              <div className="text-xs text-gray-600">{formatCurrency(order.total_price)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Customer/Staff Information */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">
                {customerType === 'staff' ? 'Staff Information' : 'Customer Information'}
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{order.customer_name || order.staff_member_name || 'N/A'}</span>
                </div>
                {order.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium break-all">{order.customer_email}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{order.customer_phone}</span>
                  </div>
                )}
                {customerType === 'staff' && order.staff_member_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staff Member:</span>
                    <span className="font-medium">{order.staff_member_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">Order Details</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.order_status)}`}>
                    {order.order_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.payment_status)}`}>
                    {order.payment_status}
                  </span>
                </div>
                {order.location_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{order.location_name}</span>
                  </div>
                )}
                {order.estimated_pickup_time && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup:</span>
                    <span className="font-medium">{formatDate(order.estimated_pickup_time)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Item Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">Item Details</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-medium">{order.item_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{order.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">{formatCurrency(order.unit_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Item Total:</span>
                  <span className="font-medium text-orange-600">{formatCurrency(order.total_price)}</span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">Additional Information</h5>
              <div className="space-y-2 text-sm">
                {order.special_instructions && (
                  <div>
                    <span className="text-gray-600">Instructions:</span>
                    <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      {order.special_instructions}
                    </div>
                  </div>
                )}
                {order.customizations && Object.keys(order.customizations).length > 0 && (
                  <div>
                    <span className="text-gray-600">Customizations:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(order.customizations).map(([group, selection], idx) => (
                        <div key={idx} className="text-xs p-2 bg-orange-50 border border-orange-200 rounded">
                          <span className="font-medium">{group}:</span> {Array.isArray(selection) ? selection.join(', ') : String(selection)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {order.created_by_staff_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created by:</span>
                    <span className="font-medium">{order.created_by_staff_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuItemPerformance({ menuItems, categories, detailedOrders }: MenuItemPerformanceProps) {
  // Enhanced State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'name'>('revenue');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  
  // Advanced Filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Detailed View Controls
  const [categoryDetailView, setCategoryDetailView] = useState<string>('overview'); // overview, orders, trends, analytics
  const [itemDetailView, setItemDetailView] = useState<string>('overview');
  
  const ITEMS_PER_PAGE = 10;
  const CATEGORIES_PER_PAGE = 5;

  // Helper function to determine customer type from order data
  const getCustomerType = (order: MenuItemOrderDetail): 'guest' | 'registered' | 'staff' => {
    if (order.is_staff_order) return 'staff';
    // If customer has email and name, consider them registered; otherwise guest
    return (order.customer_email && order.customer_name) ? 'registered' : 'guest';
  };

  // Process real order data for enhanced analytics
  const processOrderData = (itemId: number, itemName: string, customizations?: Record<string, any>) => {
    // Filter orders for this specific item variant
    const itemOrders = detailedOrders.filter(order => 
      order.item_id === itemId && 
      order.item_name === itemName &&
      JSON.stringify(order.customizations || {}) === JSON.stringify(customizations || {})
    );
    
    // Calculate payment breakdown
    const paymentBreakdown = itemOrders.reduce((acc, order) => {
      const method = order.payment_method?.toLowerCase() || 'other';
      if (method.includes('cash')) acc.cash++;
      else if (method.includes('credit') || method.includes('debit') || method.includes('card')) acc.card++;
      else if (method.includes('online') || method.includes('stripe')) acc.online++;
      else acc.other++;
      return acc;
    }, { cash: 0, card: 0, online: 0, other: 0 });

    // Calculate customer breakdown
    const customerBreakdown = itemOrders.reduce((acc, order) => {
      const customerType = getCustomerType(order);
      acc[customerType]++;
      return acc;
    }, { guest: 0, registered: 0, staff: 0 });

    // Calculate peak hours (24-hour format)
    const hourlyData = itemOrders.reduce((acc, order) => {
      const hour = new Date(order.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + order.quantity;
      return acc;
    }, {} as Record<number, number>);

    const peak_hours = Array.from({length: 24}, (_, hour) => ({ 
      hour, 
      quantity: hourlyData[hour] || 0
    }));

    // Calculate daily trends (last 7 days)
    const now = new Date();
    const dailyData = itemOrders.reduce((acc, order) => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      if (!acc[orderDate]) {
        acc[orderDate] = { quantity: 0, revenue: 0 };
      }
      acc[orderDate].quantity += order.quantity;
      acc[orderDate].revenue += order.total_price;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const daily_trends = Array.from({length: 7}, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return {
        date,
        quantity: dailyData[date]?.quantity || 0,
        revenue: dailyData[date]?.revenue || 0
      };
    }).reverse();

    return {
      orders: itemOrders,
      payment_breakdown: paymentBreakdown,
      customer_breakdown: customerBreakdown,
      peak_hours,
      daily_trends
    };
  };

  // Enhanced menu items with real data
  const enhancedMenuItems = useMemo(() => {
    return menuItems.map(item => {
      const enhancedData = processOrderData(item.id, item.name, item.customizations);
      
      return {
        ...item,
        ...enhancedData
      } as EnhancedMenuItemReport;
    });
  }, [menuItems, detailedOrders]);

  // Enhanced categories with real data
  const enhancedCategories = useMemo(() => {
    return categories.map(cat => {
      const categoryItems = enhancedMenuItems.filter(item => item.category === cat.name);
      const orders = categoryItems.flatMap(item => item.orders || []);
      
      const paymentBreakdown = orders.reduce((acc, order) => {
        const method = order.payment_method?.toLowerCase() || 'other';
        if (method.includes('cash')) acc.cash++;
        else if (method.includes('credit') || method.includes('debit') || method.includes('card')) acc.card++;
        else if (method.includes('online') || method.includes('stripe')) acc.online++;
        else acc.other++;
        return acc;
      }, { cash: 0, card: 0, online: 0, other: 0 });

      const customerBreakdown = orders.reduce((acc, order) => {
        const customerType = getCustomerType(order);
        acc[customerType]++;
        return acc;
      }, { guest: 0, registered: 0, staff: 0 });

      // Calculate daily trends for category
      const now = new Date();
      const dailyData = orders.reduce((acc, order) => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[orderDate]) {
          acc[orderDate] = { quantity: 0, revenue: 0 };
        }
        acc[orderDate].quantity += order.quantity;
        acc[orderDate].revenue += order.total_price;
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number }>);

      const daily_trends = Array.from({length: 7}, (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          date,
          quantity: dailyData[date]?.quantity || 0,
          revenue: dailyData[date]?.revenue || 0
        };
      }).reverse();

      // Calculate peak hours for category
      const hourlyData = orders.reduce((acc, order) => {
        const hour = new Date(order.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + order.quantity;
        return acc;
      }, {} as Record<number, number>);

      const peak_hours = Array.from({length: 24}, (_, hour) => ({ 
        hour, 
        quantity: hourlyData[hour] || 0
      }));

      // Get top customizations
      const customizationCounts = orders.reduce((acc, order) => {
        if (order.customizations) {
          Object.entries(order.customizations).forEach(([key, value]) => {
            const customization = `${key}: ${Array.isArray(value) ? value.join(', ') : value}`;
            acc[customization] = (acc[customization] || 0) + 1;
          });
        }
        return acc;
      }, {} as Record<string, number>);

      const top_customizations = Object.entries(customizationCounts)
        .map(([customization, count]) => ({ customization, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        ...cat,
        items: categoryItems,
        payment_breakdown: paymentBreakdown,
        customer_breakdown: customerBreakdown,
        daily_trends,
        peak_hours,
        top_customizations
      };
    }) as EnhancedCategoryReport[];
  }, [categories, enhancedMenuItems, detailedOrders]);

  // Helper function to format customizations for display
  const formatCustomizationsForDisplay = (customizations: Record<string, any>): string => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return 'Standard (No Customizations)';
    }
    
    return Object.entries(customizations).map(([optionGroup, selections]) => {
      let selectionsText = '';
      if (Array.isArray(selections)) {
        selectionsText = selections.join(', ');
      } else if (typeof selections === 'string') {
        selectionsText = selections;
      } else {
        selectionsText = String(selections);
      }
      return `${optionGroup}: ${selectionsText}`;
    }).join(' | ');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format time
  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Group menu items by name and category
  const groupedMenuItems = useMemo(() => {
    const groups: Record<string, GroupedMenuItem> = {};
    
    enhancedMenuItems.forEach(item => {
      const key = `${item.name}_${item.category}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: item.id,
          name: item.name,
          category: item.category,
          totalQuantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
          variants: []
        };
      }
      
      groups[key].variants.push(item);
      groups[key].totalQuantitySold += item.quantity_sold;
      groups[key].totalRevenue += Number(item.revenue);
    });
    
    // Calculate average prices
    Object.values(groups).forEach(group => {
      group.averagePrice = group.totalQuantitySold > 0 ? group.totalRevenue / group.totalQuantitySold : 0;
    });
    
    return Object.values(groups);
  }, [enhancedMenuItems]);

  // Apply filters to categories
  const filteredCategories = useMemo(() => {
    let filtered = [...enhancedCategories];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }, [enhancedCategories, searchTerm]);

  // Apply filters to menu items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = groupedMenuItems;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'quantity':
          return b.totalQuantitySold - a.totalQuantitySold;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });
  }, [groupedMenuItems, searchTerm, sortBy]);

  // Pagination for categories
  const paginatedCategories = useMemo(() => {
    const startIndex = (categoryPage - 1) * CATEGORIES_PER_PAGE;
    return filteredCategories.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);
  }, [filteredCategories, categoryPage]);

  // Pagination for menu items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedItems, currentPage]);

  const totalCategoryPages = Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE);
  const totalPages = Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE);

  // Toggle functions
  const toggleCategoryExpanded = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleItemExpanded = (groupKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedItems(newExpanded);
  };

  // Get filtered orders for a specific item based on current filters
  const getFilteredOrders = (orders: any[] = []) => {
    return orders.filter(order => {
      if (paymentMethodFilter !== 'all' && !order.payment_method.includes(paymentMethodFilter)) return false;
      if (customerTypeFilter !== 'all' && getCustomerType(order) !== customerTypeFilter) return false;
      return true;
    });
  };

  // Enhanced Export to Excel function
  const exportToExcel = () => {
    if (enhancedCategories.length === 0 && groupedMenuItems.length === 0) {
      alert('No data to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Enhanced Categories Export
    if (enhancedCategories.length > 0) {
      const categoryData = enhancedCategories.map((cat, index) => ({
      'Rank': index + 1,
      'Category': cat.name,
      'Items Sold': cat.quantity_sold,
      'Revenue': `$${Number(cat.revenue).toFixed(2)}`,
        'Avg per Item': `$${(Number(cat.revenue) / cat.quantity_sold).toFixed(2)}`,
        'Cash Orders': cat.payment_breakdown?.cash || 0,
        'Card Orders': cat.payment_breakdown?.card || 0,
        'Online Orders': cat.payment_breakdown?.online || 0,
        'Guest Orders': cat.customer_breakdown?.guest || 0,
        'Registered Orders': cat.customer_breakdown?.registered || 0,
        'Staff Orders': cat.customer_breakdown?.staff || 0
      }));

      const catSheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, catSheet, 'Category Analytics');
    }

    // Enhanced Menu Items Export
    const itemData: any[] = [];
    filteredAndSortedItems.forEach((group) => {
      // Main item summary
      const totalOrders = group.variants.reduce((sum, v) => sum + (v.orders?.length || 0), 0);
      
      itemData.push({
        'Item': group.name,
        'Category': group.category,
        'Type': 'TOTAL',
        'Quantity Sold': group.totalQuantitySold,
        'Revenue': `$${group.totalRevenue.toFixed(2)}`,
        'Avg Price': `$${group.averagePrice.toFixed(2)}`,
        'Variants': group.variants.length,
        'Total Orders': totalOrders,
        'Unique Customers': '...' // Would be calculated from actual data
      });
      
      // Variant details
      group.variants.forEach((variant, idx) => {
        const orders = variant.orders || [];
        itemData.push({
          'Item': `  └─ Variant ${idx + 1}`,
          'Category': variant.category,
          'Type': 'VARIANT',
          'Quantity Sold': variant.quantity_sold,
          'Revenue': `$${Number(variant.revenue).toFixed(2)}`,
          'Avg Price': `$${variant.average_price ? Number(variant.average_price).toFixed(2) : '0.00'}`,
          'Variants': '',
          'Total Orders': orders.length,
          'Cash Orders': variant.payment_breakdown?.cash || 0,
          'Card Orders': variant.payment_breakdown?.card || 0,
          'Online Orders': variant.payment_breakdown?.online || 0,
          'Guest Orders': variant.customer_breakdown?.guest || 0,
          'Registered Orders': variant.customer_breakdown?.registered || 0,
          'Staff Orders': variant.customer_breakdown?.staff || 0,
          'Customizations': formatCustomizationsForDisplay(variant.customizations || {})
        });
      });
    });

    // Detailed Orders Export
    const orderData: any[] = [];
    filteredAndSortedItems.forEach((group) => {
      group.variants.forEach((variant) => {
        const orders = variant.orders || [];
        orders.forEach(order => {
          orderData.push({
            'Item Name': variant.name,
            'Category': variant.category,
            'Order Number': order.order_number,
            'Customer/Staff Name': order.customer_name || order.staff_member_name || 'N/A',
            'Customer Type': getCustomerType(order),
            'Contact Email': order.customer_email || 'N/A',
            'Contact Phone': order.customer_phone || 'N/A',
            'Payment Method': order.payment_method,
            'Payment Status': order.payment_status,
            'Order Status': order.order_status,
            'Order Date': formatDate(order.created_at),
            'Order Total': `$${order.order_total.toFixed(2)}`,
            'Item Quantity': order.quantity,
            'Item Total': `$${order.total_price.toFixed(2)}`,
            'Unit Price': `$${order.unit_price.toFixed(2)}`,
            'Location': order.location_name || 'N/A',
            'VIP Code': order.vip_code || 'N/A',
            'Staff Member': order.staff_member_name || 'N/A',
            'Created By Staff': order.created_by_staff_name || 'N/A',
            'Special Instructions': order.special_instructions || 'N/A',
            'Pickup Time': order.estimated_pickup_time ? formatDate(order.estimated_pickup_time) : 'N/A',
            'Customizations': order.customizations ? Object.entries(order.customizations).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' | ') : 'None'
          });
        });
      });
    });

    // Add sheets
    const itemSheet = XLSX.utils.json_to_sheet(itemData);
    XLSX.utils.book_append_sheet(wb, itemSheet, 'Menu Item Analytics');

    if (orderData.length > 0) {
      const orderSheet = XLSX.utils.json_to_sheet(orderData);
      XLSX.utils.book_append_sheet(wb, orderSheet, 'Detailed Orders');
    }

    // Export
    const now = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Enhanced_Menu_Performance_${now}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6 mb-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="mb-4 lg:mb-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Menu Performance Analytics</h3>
          <p className="text-gray-600 text-sm mt-1">
            {groupedMenuItems.length} items • {groupedMenuItems.reduce((sum, item) => sum + item.variants.length, 0)} variants • {enhancedCategories.length} categories
          </p>
          
          {/* Comprehensive Order Summary */}
          {detailedOrders.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
                Staff Orders: {detailedOrders.filter(o => getCustomerType(o) === 'staff').length}
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-1"></div>
                Registered: {detailedOrders.filter(o => getCustomerType(o) === 'registered').length}
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-amber-400 rounded-full mr-1"></div>
                Guest: {detailedOrders.filter(o => getCustomerType(o) === 'guest').length}
              </span>
              <span className="text-gray-500">
                Total Orders: {detailedOrders.length}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-sm"
          >
            <span className="hidden sm:inline">{showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters</span>
            <span className="sm:hidden">Filters</span>
          </button>
          
          {(groupedMenuItems.length > 0 || enhancedCategories.length > 0) && (
          <button
            onClick={exportToExcel}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-base sm:text-sm"
          >
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
          </button>
        )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Advanced Filters</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit Card</option>
                <option value="debit">Debit Card</option>
                <option value="online">Online Payment</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Customer Type</label>
              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="all">All Customers</option>
                <option value="guest">Guest Orders</option>
                <option value="registered">Registered Customers</option>
                <option value="staff">Staff Orders</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="all">All Locations</option>
                <option value="main">Main Location</option>
                <option value="downtown">Downtown</option>
                <option value="mall">Mall Location</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Categories Section */}
      {paginatedCategories.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">Category Performance</h4>
            <div className="flex items-center space-x-2">
              <select
                value={categoryDetailView}
                onChange={(e) => setCategoryDetailView(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="overview">Overview</option>
                <option value="analytics">Analytics</option>
                <option value="trends">Trends</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            {paginatedCategories.map((cat, idx) => {
              const isExpanded = expandedCategories.has(cat.name);
              const totalRevenue = paginatedCategories.reduce((sum, c) => sum + Number(c.revenue), 0);
              const categoryPercentage = ((Number(cat.revenue) / totalRevenue) * 100).toFixed(1);
              
              return (
                <div key={cat.name} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCategoryExpanded(cat.name)}
                  >
                    <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                        <svg className={`w-5 h-5 transition-transform text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-orange-700">#{idx + 1}</span>
                  </div>
                  <div>
                          <div className="font-semibold text-gray-900 text-lg">
                            {cat.name.length > 40 ? `${cat.name.substring(0, 40)}...` : cat.name}
                    </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {cat.quantity_sold} items sold • {formatCurrency(Number(cat.revenue) / cat.quantity_sold)} avg • {cat.items?.length || 0} menu items
                    </div>
                  </div>
                </div>
                <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">{formatCurrency(Number(cat.revenue))}</div>
                        <div className="text-sm text-gray-600">{categoryPercentage}% of total</div>
                  </div>
                </div>
              </div>

                  {/* Expanded Category Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-4">
                        {/* Category Analytics Tabs */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {['overview', 'analytics', 'trends'].map((view) => (
                            <button
                              key={view}
                              onClick={() => setCategoryDetailView(view)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                categoryDetailView === view
                                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
            ))}
          </div>

                        {/* Overview Tab */}
                        {categoryDetailView === 'overview' && (
                          <div className="space-y-4">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Revenue</div>
                                <div className="text-lg font-semibold text-gray-900">{formatCurrency(Number(cat.revenue))}</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Items Sold</div>
                                <div className="text-lg font-semibold text-gray-900">{cat.quantity_sold}</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Menu Items</div>
                                <div className="text-lg font-semibold text-gray-900">{cat.items?.length || 0}</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Avg Price</div>
                                <div className="text-lg font-semibold text-gray-900">{formatCurrency(Number(cat.revenue) / cat.quantity_sold)}</div>
                              </div>
                            </div>

                            {/* Top Items in Category */}
                            {cat.items && cat.items.length > 0 && (
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Top Items in {cat.name}</h5>
                                <div className="space-y-2">
                                  {cat.items.slice(0, 3).map((item, itemIdx) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium text-orange-700">{itemIdx + 1}</span>
                                        </div>
                                        <div>
                                          <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                          <div className="text-xs text-gray-600">{item.quantity_sold} sold</div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(Number(item.revenue))}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
        </div>
      )}

                        {/* Analytics Tab */}
                        {categoryDetailView === 'analytics' && (
                          <div className="space-y-4">
                            {/* Payment Method Breakdown */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h5 className="font-medium text-gray-900 mb-3">Payment Methods</h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">{cat.payment_breakdown?.cash || 0}</div>
                                  <div className="text-xs text-gray-600">Cash</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">{cat.payment_breakdown?.card || 0}</div>
                                  <div className="text-xs text-gray-600">Card</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-600">{cat.payment_breakdown?.online || 0}</div>
                                  <div className="text-xs text-gray-600">Online</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-gray-600">{cat.payment_breakdown?.other || 0}</div>
                                  <div className="text-xs text-gray-600">Other</div>
                                </div>
                              </div>
                            </div>

                            {/* Customer Type Breakdown */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h5 className="font-medium text-gray-900 mb-3">Customer Types</h5>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-600">{cat.customer_breakdown?.guest || 0}</div>
                                  <div className="text-xs text-gray-600">Guest</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">{cat.customer_breakdown?.registered || 0}</div>
                                  <div className="text-xs text-gray-600">Registered</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">{cat.customer_breakdown?.staff || 0}</div>
                                  <div className="text-xs text-gray-600">Staff</div>
                                </div>
                              </div>
                            </div>

                            {/* Peak Hours */}
                            {cat.peak_hours && (
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Peak Hours</h5>
                                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                                  {cat.peak_hours.map((hour) => (
                                    <div key={hour.hour} className="text-center">
                                      <div className={`h-8 bg-orange-100 rounded flex items-end justify-center ${hour.quantity > 15 ? 'bg-orange-300' : hour.quantity > 10 ? 'bg-orange-200' : 'bg-orange-100'}`}>
                                        <div className="text-xs font-medium text-orange-800" style={{ height: `${Math.max(20, (hour.quantity / 30) * 100)}%` }}>
                                          {hour.quantity}
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">{formatTime(hour.hour)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recent Category Orders - Comprehensive Details */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h5 className="font-medium text-gray-900 mb-3">Recent Orders in {cat.name}</h5>
                              <div className="max-h-60 overflow-y-auto">
                                {cat.items?.flatMap(item => item.orders || []).slice(0, 10).map((order, orderIdx) => (
                                  <div key={order.order_id} className="p-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <div className={`w-4 h-4 rounded-full ${
                                          getCustomerType(order) === 'staff' ? 'bg-green-400' :
                                          getCustomerType(order) === 'registered' ? 'bg-blue-400' : 'bg-amber-400'
                                        }`}></div>
                                        <span className="text-sm font-medium">{order.order_number}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          getCustomerType(order) === 'staff' ? 'bg-green-100 text-green-700' :
                                          getCustomerType(order) === 'registered' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {getCustomerType(order) === 'staff' ? 'Staff' : getCustomerType(order) === 'registered' ? 'Reg' : 'Guest'}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium">{formatCurrency(order.order_total)}</div>
                                        <div className="text-xs text-gray-500">{order.payment_method}</div>
                                      </div>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600">
                                      <span>{order.customer_name || order.staff_member_name}</span>
                                      <span className="mx-1">•</span>
                                      <span>{order.item_name} ({order.quantity}x)</span>
                                      <span className="mx-1">•</span>
                                      <span>{formatDate(order.created_at).split(',')[0]}</span>
                                    </div>
                                  </div>
                                ))}
                                {(!cat.items || cat.items.every(item => !item.orders || item.orders.length === 0)) && (
                                  <div className="text-center py-4 text-gray-500 text-sm">
                                    No recent orders found for this category
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Trends Tab */}
                        {categoryDetailView === 'trends' && cat.daily_trends && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h5 className="font-medium text-gray-900 mb-3">7-Day Trend</h5>
                            <div className="space-y-2">
                              {cat.daily_trends.slice(0, 7).reverse().map((day, dayIdx) => (
                                <div key={day.date} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                  <div className="flex items-center space-x-3">
                                    <div className="text-sm font-medium text-gray-900 w-20">{formatDate(day.date)}</div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-orange-500 h-2 rounded-full" 
                                        style={{ width: `${Math.max(5, (day.quantity / Math.max(...(cat.daily_trends || []).map(d => d.quantity))) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div className="font-semibold text-gray-900">{day.quantity} items</div>
                                    <div className="text-gray-600">{formatCurrency(day.revenue)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Category Pagination */}
          {totalCategoryPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 gap-4">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                Showing {(categoryPage - 1) * CATEGORIES_PER_PAGE + 1} to {Math.min(categoryPage * CATEGORIES_PER_PAGE, filteredCategories.length)} of {filteredCategories.length} categories
              </div>
              
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCategoryPage(Math.max(1, categoryPage - 1))}
                  disabled={categoryPage === 1}
                  className="px-4 py-3 sm:px-3 sm:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-base sm:text-sm"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">←</span>
                </button>
                
                {Array.from({ length: Math.min(5, totalCategoryPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalCategoryPages - 4, categoryPage - 2)) + i;
                  if (pageNum <= totalCategoryPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCategoryPage(pageNum)}
                        className={`min-w-[40px] sm:min-w-0 px-4 py-3 sm:px-3 sm:py-2 border rounded-lg text-base sm:text-sm ${
                          categoryPage === pageNum
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCategoryPage(Math.min(totalCategoryPages, categoryPage + 1))}
                  disabled={categoryPage === totalCategoryPages}
                  className="px-4 py-3 sm:px-3 sm:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-base sm:text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Menu Items Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-0">Menu Items Analytics</h4>
          
          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-48 px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base sm:text-sm"
            />
            
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base sm:text-sm"
            >
              <option value="revenue">Revenue</option>
              <option value="quantity">Quantity</option>
              <option value="name">Name</option>
            </select>

            <select
              value={itemDetailView}
              onChange={(e) => setItemDetailView(e.target.value)}
              className="w-full sm:w-auto px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base sm:text-sm"
            >
              <option value="overview">Overview</option>
              <option value="orders">Orders</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
        </div>

        {paginatedItems.length > 0 ? (
          <div className="space-y-4">
            {paginatedItems.map((group) => {
              const groupKey = `${group.name}_${group.category}`;
              const isExpanded = expandedItems.has(groupKey);
              const allOrders = group.variants.flatMap(v => v.orders || []);
              const filteredOrders = getFilteredOrders(allOrders);
              
              return (
                <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Main Item Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleItemExpanded(groupKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className={`w-5 h-5 transition-transform text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-900 text-lg">{group.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {group.category} • {group.totalQuantitySold} sold • {group.variants.length} variant{group.variants.length !== 1 ? 's' : ''} • {allOrders.length} orders
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">{formatCurrency(group.totalRevenue)}</div>
                        <div className="text-sm text-gray-600">{formatCurrency(group.averagePrice)} avg</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Item Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-4">
                        {/* Item Analytics Tabs */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {['overview', 'orders', 'analytics'].map((view) => (
                            <button
                              key={view}
                              onClick={() => setItemDetailView(view)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                itemDetailView === view
                                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
                          ))}
                        </div>

                        {/* Overview Tab */}
                        {itemDetailView === 'overview' && (
                          <div className="space-y-4">
                            {/* Item Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Total Revenue</div>
                                <div className="text-lg font-semibold text-gray-900">{formatCurrency(group.totalRevenue)}</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Quantity Sold</div>
                                <div className="text-lg font-semibold text-gray-900">{group.totalQuantitySold}</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Variants</div>
                                <div className="text-lg font-semibold text-gray-900">{group.variants.length}</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Total Orders</div>
                                <div className="text-lg font-semibold text-gray-900">{allOrders.length}</div>
                              </div>
                            </div>

                            {/* Variants Overview */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h5 className="font-medium text-gray-900 mb-3">Variants Performance</h5>
                      <div className="space-y-3">
                        {group.variants.map((variant, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-orange-700">#{idx + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {variant.customizations && Object.keys(variant.customizations).length > 0 
                                      ? `Variant ${idx + 1}`
                                      : 'Standard'
                                    }
                                  </div>
                                  <div className="text-xs text-gray-600">
                                          {variant.quantity_sold} sold • {variant.orders?.length || 0} orders
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(Number(variant.revenue))}
                                </div>
                                <div className="text-xs text-gray-600">
                                        {formatCurrency(variant.average_price ? Number(variant.average_price) : 0)} each
                                </div>
                              </div>
                            </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Orders Tab */}
                        {itemDetailView === 'orders' && (
                          <div className="space-y-4">
                            {/* Order Filters */}
                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="text-sm font-medium text-gray-700">Filter Orders:</span>
                                <select
                                  value={paymentMethodFilter}
                                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded"
                                >
                                  <option value="all">All Payments</option>
                                  <option value="cash">Cash</option>
                                  <option value="credit">Credit</option>
                                  <option value="online">Online</option>
                                </select>
                                <select
                                  value={customerTypeFilter}
                                  onChange={(e) => setCustomerTypeFilter(e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded"
                                >
                                  <option value="all">All Customers</option>
                                  <option value="guest">Guest</option>
                                  <option value="registered">Registered</option>
                                  <option value="staff">Staff</option>
                                </select>
                                </div>
                              <div className="text-xs text-gray-600">
                                Showing {filteredOrders.length} of {allOrders.length} orders
                              </div>
                            </div>

                                                        {/* Orders List */}
                            <div className="bg-white rounded-lg border border-gray-200">
                              <div className="max-h-96 overflow-y-auto">
                                {filteredOrders.slice(0, 20).map((order, orderIdx) => (
                                  <ComprehensiveOrderCard 
                                    key={order.order_id} 
                                    order={order} 
                                    orderIndex={orderIdx} 
                                    formatCurrency={formatCurrency}
                                    formatDate={formatDate}
                                    getCustomerType={getCustomerType}
                                  />
                                ))}
                                {filteredOrders.length > 20 && (
                                  <div className="p-3 text-center text-sm text-gray-600">
                                    And {filteredOrders.length - 20} more orders...
                              </div>
                            )}
                          </div>
                            </div>
                          </div>
                        )}

                        {/* Analytics Tab */}
                        {itemDetailView === 'analytics' && (
                          <div className="space-y-4">
                            {/* Payment & Customer Analytics */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Payment Methods */}
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Payment Distribution</h5>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-center p-2 bg-green-50 rounded">
                                    <div className="text-lg font-bold text-green-600">
                                      {group.variants.reduce((sum, v) => sum + (v.payment_breakdown?.cash || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Cash</div>
                                  </div>
                                  <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="text-lg font-bold text-blue-600">
                                      {group.variants.reduce((sum, v) => sum + (v.payment_breakdown?.card || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Card</div>
                                  </div>
                                  <div className="text-center p-2 bg-purple-50 rounded">
                                    <div className="text-lg font-bold text-purple-600">
                                      {group.variants.reduce((sum, v) => sum + (v.payment_breakdown?.online || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Online</div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-lg font-bold text-gray-600">
                                      {group.variants.reduce((sum, v) => sum + (v.payment_breakdown?.other || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Other</div>
                                  </div>
                                </div>
                              </div>

                              {/* Customer Types */}
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Customer Distribution</h5>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="text-center p-2 bg-orange-50 rounded">
                                    <div className="text-lg font-bold text-orange-600">
                                      {group.variants.reduce((sum, v) => sum + (v.customer_breakdown?.guest || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Guest</div>
                                  </div>
                                  <div className="text-center p-2 bg-green-50 rounded">
                                    <div className="text-lg font-bold text-green-600">
                                      {group.variants.reduce((sum, v) => sum + (v.customer_breakdown?.registered || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Registered</div>
                                  </div>
                                  <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="text-lg font-bold text-blue-600">
                                      {group.variants.reduce((sum, v) => sum + (v.customer_breakdown?.staff || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-600">Staff</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Customizations Analysis */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h5 className="font-medium text-gray-900 mb-3">Customizations</h5>
                              <div className="space-y-2">
                                {group.variants.map((variant, idx) => (
                                  variant.customizations && Object.keys(variant.customizations).length > 0 && (
                                    <div key={idx} className="p-2 bg-orange-50 rounded border border-orange-200">
                                      <div className="text-sm font-medium text-orange-800">Variant {idx + 1}</div>
                                      <div className="text-xs text-orange-700">
                                        {formatCustomizationsForDisplay(variant.customizations)}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {variant.quantity_sold} sold • {formatCurrency(Number(variant.revenue))}
                                      </div>
                                    </div>
                                  )
                                ))}
                                {group.variants.every(v => !v.customizations || Object.keys(v.customizations).length === 0) && (
                                  <div className="text-center text-gray-500 text-sm py-4">
                                    No customizations for this item
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 gap-4">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
                </div>
                
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-3 sm:px-3 sm:py-1 text-base sm:text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">←</span>
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[40px] sm:min-w-0 px-4 py-3 sm:px-3 sm:py-1 text-base sm:text-sm border rounded ${
                            currentPage === pageNum
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-3 sm:px-3 sm:py-1 text-base sm:text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-2">No menu items found</div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-orange-600 hover:text-orange-700 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}