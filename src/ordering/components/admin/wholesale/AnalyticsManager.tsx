// src/ordering/components/admin/wholesale/AnalyticsManager.tsx

import { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  Users,
  ShoppingBag,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Award,
  Eye,
  Package
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient } from '../../../../shared/api/apiClient';

interface AnalyticsData {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  activeFundraisers: number;
  totalParticipants: number;
  averageOrderValue: number;
  conversionRate: number;
  topFundraisers: Array<{
    id: number;
    name: string;
    revenue: number;
    orders: number;
    participants: number;
  }>;
  topParticipants: Array<{
    id: number;
    name: string;
    fundraiser: string;
    raised: number;
    goal: number;
    progress: number;
    orders_count?: number;
    average_order_value?: number;
    goal_percentage?: number;
  }>;
  generalSupport: {
    orders_count: number;
    total_revenue: number;
    percentage_of_total: number;
  };
  topItems: Array<{
    id: number;
    name: string;
    quantity: number;
    revenue: number;
    orders_count?: number;
    average_quantity_per_order?: number;
    variant_count?: number;
    top_variants?: Array<{
      options: Record<string, string>;
      quantity: number;
      revenue: number;
      percentage_of_item: number;
    }>;
  }>;
  itemVariantBreakdown?: Array<{
    item_name: string;
    sizes: Array<{
      size: string;
      quantity: number;
      revenue: number;
      colors: Array<{
        color: string;
        quantity: number;
        revenue: number;
      }>;
    }>;
  }>;
  dailyTrends?: Array<{
    date: string;
    orders: number;
    revenue: number;
    statuses: Record<string, number>;
  }>;
  revenueByMonth: Array<{
    month: string;
    wholesale: number;
    retail: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  variantAnalytics?: {
    sizes: Array<{
      name: string;
      quantity_sold: number;
      revenue: number;
      orders_count: number;
    }>;
    colors: Array<{
      name: string;
      quantity_sold: number;
      revenue: number;
      orders_count: number;
    }>;
    combinations: Array<{
      size: string;
      color: string;
      combination: string;
      quantity_sold: number;
      revenue: number;
      orders_count: number;
    }>;
  };
}

interface AnalyticsManagerProps {
  restaurantId: string;
  fundraiserId?: number; // Optional for backwards compatibility
}

export function AnalyticsManager({ restaurantId, fundraiserId }: AnalyticsManagerProps) {
  // State management
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('30d');
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    variantDetails: false,
    dailyTrends: false,
    advancedMetrics: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load analytics on component mount
  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, fundraiserId, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use apiClient for proper base URL and authentication
      let url = `/wholesale/admin/analytics?period=${dateRange}`;
      if (fundraiserId) {
        // Scoped mode: Load analytics for specific fundraiser
        url += `&fundraiser_id=${fundraiserId}`;
      }
      const response = await apiClient.get(url);
      
      // Extract analytics from API response, or set empty defaults
      if (response.data.success && response.data.data) {
        setAnalytics(response.data.data);
      } else {
        // Set empty state for analytics when no data
        setAnalytics({
          totalRevenue: 0,
          revenueGrowth: 0,
          totalOrders: 0,
          ordersGrowth: 0,
          activeFundraisers: 0,
          totalParticipants: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          topFundraisers: [],
          topParticipants: [],
      generalSupport: { orders_count: 0, total_revenue: 0, percentage_of_total: 0 },
          topItems: [],
          revenueByMonth: [],
          ordersByStatus: []
        });
      }
      
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
      toastUtils.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await apiClient.get(`/wholesale/admin/analytics/export?period=${dateRange}`, {
        responseType: 'blob'
      });
      
      // Handle file download - response.data is already the blob when responseType is 'blob'
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wholesale-analytics-${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toastUtils.success('Analytics report exported successfully');
    } catch (err) {
      console.error('Error exporting analytics:', err);
      toastUtils.error('Failed to export analytics');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          onClick={loadAnalytics}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fundraiser Analytics</h1>
          <p className="text-gray-600">Key insights and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Section 1: Key Performance Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Revenue - Most Important */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {analytics.totalOrders} orders • {formatCurrency(analytics.averageOrderValue)} avg
                </p>
              </div>
              <div className="text-right">
                <DollarSign className="w-12 h-12 text-green-600 mb-2" />
                <div className="text-xs text-gray-500">
                  Recent activity
                </div>
              </div>
            </div>
          </div>

          {/* Participants Count */}
          <div className="text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{analytics.totalParticipants}</p>
            <p className="text-sm text-gray-600">Active Participants</p>
          </div>

          {/* Order Status Visual */}
          <div className="text-center">
            <Package className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
          </div>
        </div>

        {/* Order Status Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-600">Order Status Distribution</span>
            <span className="text-gray-500">{analytics.totalOrders} total orders</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
            {analytics.ordersByStatus.map((status, index) => {
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-gray-400'];
              return (
                <div
                  key={status.status}
                  className={colors[index] || 'bg-gray-300'}
                  style={{ width: `${status.percentage}%` }}
                  title={`${status.status}: ${status.count} orders (${status.percentage}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {analytics.ordersByStatus.map((status, index) => {
              const colors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-gray-600'];
              return (
                <span key={status.status} className={colors[index] || 'text-gray-600'}>
                  {status.status}: {status.count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Participants */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          
          <div className="space-y-4">
            {/* General Support First - Most Important */}
            {analytics.generalSupport.orders_count > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">General Organization Support</p>
                    <p className="text-sm text-blue-700">
                      {analytics.generalSupport.orders_count} orders • {analytics.generalSupport.percentage_of_total}% of total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-900">
                      {formatCurrency(analytics.generalSupport.total_revenue)}
                    </p>
                    <p className="text-xs text-blue-600">Best performer</p>
                  </div>
                </div>
              </div>
            )}

            {/* Individual Participants */}
            {analytics.topParticipants.slice(0, 3).map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{participant.name}</p>
                    <p className="text-xs text-gray-500">
                      {participant.orders_count || 0} orders
                      {participant.average_order_value && ` • ${formatCurrency(participant.average_order_value)} avg`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(participant.raised)}</p>
                  {participant.goal > 0 && (
                    <p className="text-xs text-gray-500">{participant.progress}% of goal</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Best Selling Items</h3>
            <ShoppingBag className="w-5 h-5 text-green-600" />
          </div>
          
          <div className="space-y-4">
            {analytics.topItems.slice(0, 4).map((item, index) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3 ${
                      index === 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} sold
                        {item.orders_count && ` • ${item.orders_count} orders`}
                        {item.variant_count && item.variant_count > 0 && ` • ${item.variant_count} variants`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
                
                {/* Show most popular variant */}
                {item.top_variants && item.top_variants.length > 0 && (
                  <div className="ml-9 text-xs text-gray-600">
                    Most popular: {Object.entries(item.top_variants[0].options).map(([, value]) => `${value}`).join(', ')} 
                    ({item.top_variants[0].percentage_of_item}%)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Additional Insights (Collapsible) */}
      <div className="space-y-4">
        {/* Product Variants - Collapsible */}
        {analytics.variantAnalytics && (analytics.variantAnalytics.sizes.length > 0 || analytics.variantAnalytics.colors.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <button
              onClick={() => toggleSection('variantDetails')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Eye className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Product Variant Insights</h3>
                <span className="ml-2 text-sm text-gray-500">
                  {analytics.itemVariantBreakdown && analytics.itemVariantBreakdown.length > 0 ? (
                    `(${analytics.itemVariantBreakdown.length} items with variants)`
                  ) : (
                    `(${analytics.variantAnalytics.sizes.length} sizes, ${analytics.variantAnalytics.colors.length} colors)`
                  )}
                </span>
              </div>
              {expandedSections.variantDetails ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.variantDetails && (
              <div className="px-6 pb-6 border-t">
                {/* Show Item-Specific Variant Breakdown */}
                {analytics.itemVariantBreakdown && analytics.itemVariantBreakdown.length > 0 ? (
                  <div className="space-y-6 mt-4">
                    {analytics.itemVariantBreakdown.slice(0, 3).map((itemBreakdown) => (
                      <div key={itemBreakdown.item_name} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                          {itemBreakdown.item_name} Variants
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Sizes for this item */}
                          {itemBreakdown.sizes.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-700 mb-2">Popular Sizes</h5>
                              <div className="space-y-2">
                                {itemBreakdown.sizes.slice(0, 4).map((size) => (
                                  <div key={size.size} className="flex justify-between text-sm">
                                    <span className="font-medium">{size.size}</span>
                                    <span className="text-gray-600">{size.quantity} sold</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Colors for this item */}
                          {itemBreakdown.sizes.some(size => size.colors.length > 0) && (
                            <div>
                              <h5 className="font-medium text-gray-700 mb-2">Popular Colors</h5>
                              <div className="space-y-2">
                                {itemBreakdown.sizes
                                  .flatMap(size => size.colors)
                                  .reduce((acc, color) => {
                                    const existing = acc.find(c => c.color === color.color);
                                    if (existing) {
                                      existing.quantity += color.quantity;
                                    } else {
                                      acc.push({ ...color });
                                    }
                                    return acc;
                                  }, [] as any[])
                                  .sort((a, b) => b.quantity - a.quantity)
                                  .slice(0, 4)
                                  .map((color) => (
                                    <div key={color.color} className="flex justify-between text-sm">
                                      <span className="font-medium capitalize">{color.color}</span>
                                      <span className="text-gray-600">{color.quantity} sold</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}

                          {/* Top size/color combinations for this item */}
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Top Combinations</h5>
                            <div className="space-y-2">
                              {itemBreakdown.sizes
                                .flatMap(size => 
                                  size.colors.map(color => ({
                                    combination: `${size.size} / ${color.color}`,
                                    quantity: color.quantity,
                                    revenue: color.revenue
                                  }))
                                )
                                .sort((a, b) => b.quantity - a.quantity)
                                .slice(0, 4)
                                .map((combo) => (
                                  <div key={combo.combination} className="text-sm">
                                    <div className="font-medium">{combo.combination}</div>
                                    <div className="text-gray-600">{combo.quantity} sold</div>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Fallback to overall variant analytics if item breakdown not available */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {/* Most Popular Sizes */}
                    {analytics.variantAnalytics.sizes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Most Popular Sizes (All Items)</h4>
                        <div className="space-y-2">
                          {analytics.variantAnalytics.sizes.slice(0, 5).map((size) => (
                            <div key={size.name} className="flex justify-between text-sm">
                              <span className="font-medium">{size.name}</span>
                              <span className="text-gray-600">{size.quantity_sold} sold</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Most Popular Colors */}
                    {analytics.variantAnalytics.colors.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Most Popular Colors (All Items)</h4>
                        <div className="space-y-2">
                          {analytics.variantAnalytics.colors.slice(0, 5).map((color) => (
                            <div key={color.name} className="flex justify-between text-sm">
                              <span className="font-medium capitalize">{color.name}</span>
                              <span className="text-gray-600">{color.quantity_sold} sold</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Combinations */}
                    {analytics.variantAnalytics.combinations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Top Combinations (All Items)</h4>
                        <div className="space-y-2">
                          {analytics.variantAnalytics.combinations.slice(0, 5).map((combo) => (
                            <div key={combo.combination} className="text-sm">
                              <div className="font-medium">{combo.size} / {combo.color}</div>
                              <div className="text-gray-600">{combo.quantity_sold} sold</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Daily Trends - Collapsible */}
        {analytics.dailyTrends && analytics.dailyTrends.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <button
              onClick={() => toggleSection('dailyTrends')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Daily Trends</h3>
                <span className="ml-2 text-sm text-gray-500">
                  (Last {analytics.dailyTrends.length} days)
                </span>
              </div>
              {expandedSections.dailyTrends ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.dailyTrends && (
              <div className="px-6 pb-6 border-t">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mt-4">
                  {analytics.dailyTrends.slice(-7).map((day) => (
                    <div key={day.date} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">{day.orders}</p>
                      <p className="text-xs text-gray-600">orders</p>
                      <p className="text-sm font-medium text-green-600 mt-1">{formatCurrency(day.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsManager;
