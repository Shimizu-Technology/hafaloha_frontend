import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Clock, ShoppingBag, Calendar } from 'lucide-react';
import { useOrderStore } from '../../store/orderStore';

type TimeFrame = '7days' | '30days' | '90days' | '1year' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

export function AnalyticsManager() {
  const { orders } = useOrderStore();
  const [timeframe, setTimeframe] = useState<TimeFrame>('7days');
  const [customRange, setCustomRange] = useState<DateRange>({
    start: new Date(),
    end: new Date()
  });
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Get date range based on timeframe
  const getDateRange = (tf: TimeFrame): DateRange => {
    const end = new Date();
    const start = new Date();

    switch (tf) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '90days':
        start.setDate(end.getDate() - 90);
        break;
      case '1year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'custom':
        return customRange;
    }

    return { start, end };
  };

  const dateRange = getDateRange(timeframe);

  // Filter orders within date range
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  });

  // Calculate daily sales for the selected timeframe
  const getDailySales = () => {
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const datesArray = [...Array(days)].map((_, i) => {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    return datesArray.map(date => {
      const dayOrders = filteredOrders.filter(order => 
        order.createdAt.split('T')[0] === date &&
        order.status !== 'cancelled'
      );
      return {
        date: new Date(date).toLocaleDateString('en-US', 
          timeframe === '1year' ? { month: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric' }
        ),
        sales: dayOrders.reduce((sum, order) => sum + order.total, 0),
        orders: dayOrders.length
      };
    });
  };

  // Calculate hourly order distribution
  const hourlyOrders = Array(24).fill(0).map((_, hour) => ({
    hour: hour,
    orders: filteredOrders.filter(order => 
      new Date(order.createdAt).getHours() === hour &&
      order.status !== 'cancelled'
    ).length
  }));

  // Calculate top selling categories
  const categoryTotals = filteredOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      const category = item.id.split('-')[0];
      acc[category] = (acc[category] || 0) + (item.quantity * item.price);
    });
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Calculate total stats
  const totalStats = {
    revenue: filteredOrders.reduce((sum, order) => 
      order.status !== 'cancelled' ? sum + order.total : sum, 0
    ),
    orders: filteredOrders.filter(order => order.status !== 'cancelled').length,
    averageOrder: filteredOrders.length > 0 ? 
      filteredOrders.reduce((sum, order) => 
        order.status !== 'cancelled' ? sum + order.total : sum, 0
      ) / filteredOrders.filter(order => order.status !== 'cancelled').length : 0
  };

  const handleTimeframeChange = (tf: TimeFrame) => {
    setTimeframe(tf);
    if (tf === 'custom') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
    }
  };

  const handleCustomRangeChange = (type: 'start' | 'end', value: string) => {
    setCustomRange(prev => ({
      ...prev,
      [type]: new Date(value)
    }));
  };

  return (
    <div className="space-y-8">
      {/* Timeframe Selection */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 inline-block mr-2" />
            Time Range:
          </span>
          {[
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: '90days', label: 'Last 90 Days' },
            { id: '1year', label: 'Last Year' },
            { id: 'custom', label: 'Custom Range' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleTimeframeChange(id as TimeFrame)}
              className={`px-4 py-2 rounded-md text-sm ${
                timeframe === id
                  ? 'bg-[#c1902f] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {showCustomRange && (
          <div className="mt-4 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customRange.start.toISOString().split('T')[0]}
                onChange={(e) => handleCustomRangeChange('start', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customRange.end.toISOString().split('T')[0]}
                onChange={(e) => handleCustomRangeChange('end', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">${totalStats.revenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#c1902f]" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{totalStats.orders}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-[#c1902f]" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold">${totalStats.averageOrder.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-[#c1902f]" />
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getDailySales()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date"
                interval={timeframe === '1year' ? 30 : timeframe === '90days' ? 7 : 'preserveEnd'}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                stroke="#c1902f"
                name="Sales ($)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#82ca9d"
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-[#c1902f]" />
            <h3 className="text-lg font-semibold">Peak Order Times</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyOrders}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(hour) => `${hour}:00`}
                  formatter={(value) => [`${value} orders`, 'Orders']}
                />
                <Bar dataKey="orders" fill="#c1902f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="#c1902f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}