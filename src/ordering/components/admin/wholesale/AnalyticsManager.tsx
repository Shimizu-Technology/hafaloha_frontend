// src/ordering/components/admin/wholesale/AnalyticsManager.tsx

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Target,
  Download,
  RefreshCw
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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
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
    <div className="analytics-manager">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {fundraiserId ? 'Fundraiser Analytics' : 'Wholesale Analytics'}
          </h2>
          <p className="text-gray-600">
            {fundraiserId 
              ? 'Performance metrics and insights for this fundraiser'
              : 'Track fundraiser performance and revenue metrics'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={exportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
              <p className={`text-sm ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                {analytics.revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {formatPercentage(analytics.revenueGrowth)} vs previous period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalOrders}</p>
              <p className={`text-sm ${analytics.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                {analytics.ordersGrowth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {formatPercentage(analytics.ordersGrowth)} vs previous period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Participants</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalParticipants}</p>
              <p className="text-sm text-gray-600">
                {fundraiserId 
                  ? 'In this fundraiser'
                  : `Across ${analytics.activeFundraisers} fundraisers`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.averageOrderValue)}</p>
              <p className="text-sm text-gray-600">
                {analytics.conversionRate}% conversion rate
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Comparison Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Comparison</h3>
          <div className="space-y-4">
            {analytics.revenueByMonth.map((month) => (
              <div key={month.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{month.month}</span>
                  <span className="text-gray-600">
                    Wholesale: {formatCurrency(month.wholesale)} | Retail: {formatCurrency(month.retail)}
                  </span>
                </div>
                <div className="flex space-x-1 h-6">
                  <div 
                    className="bg-blue-500 rounded-l"
                    style={{ width: `${(month.wholesale / (month.wholesale + month.retail)) * 100}%` }}
                  />
                  <div 
                    className="bg-gray-300 rounded-r"
                    style={{ width: `${(month.retail / (month.wholesale + month.retail)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Wholesale</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
              <span>Retail</span>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status Distribution</h3>
          <div className="space-y-4">
            {analytics.ordersByStatus.map((status) => (
              <div key={status.status} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{status.status}</span>
                  <span className="text-sm text-gray-600">{status.count} orders ({status.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${status.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Tables Row */}
      <div className={`grid grid-cols-1 gap-8 ${fundraiserId ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {/* Top Fundraisers - Hidden in scoped mode */}
        {!fundraiserId && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Fundraisers</h3>
            <div className="space-y-4">
              {analytics.topFundraisers.map((fundraiser) => (
                <div key={fundraiser.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fundraiser.name}</p>
                    <p className="text-xs text-gray-600">{fundraiser.participants} participants • {fundraiser.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(fundraiser.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Participants */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {fundraiserId ? 'Participants' : 'Top Participants'}
          </h3>
          <div className="space-y-4">
            {analytics.topParticipants.map((participant) => (
              <div key={participant.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                    <p className="text-xs text-gray-600">{participant.fundraiser}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(participant.raised)}</p>
                    <p className="text-xs text-gray-600">{participant.progress}% of goal</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${Math.min(participant.progress, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Support Analytics */}
        {analytics.generalSupport.orders_count > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">General Support</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Organization Support Orders</p>
                  <p className="text-xs text-gray-600">
                    {analytics.generalSupport.percentage_of_total}% of total orders
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(analytics.generalSupport.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {analytics.generalSupport.orders_count} orders
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(analytics.generalSupport.percentage_of_total, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Top Items */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {fundraiserId ? 'Items Performance' : 'Top Selling Items'}
          </h3>
          <div className="space-y-4">
            {analytics.topItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-600">{item.quantity} sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Variant Analytics Section */}
      {analytics.variantAnalytics && (analytics.variantAnalytics.sizes.length > 0 || analytics.variantAnalytics.colors.length > 0) && (
        <>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Variant Analytics</h2>
            <p className="text-gray-600 mb-6">
              Track which sizes, colors, and combinations are most popular with customers
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Sizes */}
            {analytics.variantAnalytics.sizes.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Sizes</h3>
                <div className="space-y-3">
                  {analytics.variantAnalytics.sizes.slice(0, 8).map((size, index) => (
                    <div key={size.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3 ${
                          index === 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{size.name}</p>
                          <p className="text-xs text-gray-600">{size.orders_count} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{size.quantity_sold} sold</p>
                        <p className="text-xs text-gray-600">{formatCurrency(size.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Colors */}
            {analytics.variantAnalytics.colors.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Colors</h3>
                <div className="space-y-3">
                  {analytics.variantAnalytics.colors.slice(0, 8).map((color, index) => (
                    <div key={color.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3 ${
                          index === 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{color.name}</p>
                          <p className="text-xs text-gray-600">{color.orders_count} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{color.quantity_sold} sold</p>
                        <p className="text-xs text-gray-600">{formatCurrency(color.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Combinations */}
            {analytics.variantAnalytics.combinations.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Size/Color Combinations</h3>
                <div className="space-y-3">
                  {analytics.variantAnalytics.combinations.slice(0, 8).map((combo, index) => (
                    <div key={combo.combination} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3 ${
                          index === 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{combo.size} / {combo.color}</p>
                          <p className="text-xs text-gray-600">{combo.orders_count} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{combo.quantity_sold} sold</p>
                        <p className="text-xs text-gray-600">{formatCurrency(combo.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsManager;