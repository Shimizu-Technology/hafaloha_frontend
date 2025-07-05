// src/shared/api/endpoints/analytics.ts

import { api } from '../apiClient';

// Types for analytics responses
export interface CustomerOrderItem {
  name: string;
  quantity: number;
  customizations?: Record<string, any>; // More flexible to handle different data structures
}

export interface DetailedOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  payment_amount?: number;
  transaction_id: string;
  created_at: string;
  estimated_pickup_time?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  special_instructions?: string;
  location_name?: string;
  location_address?: string;
  vip_code?: string;
  is_staff_order: boolean;
  staff_member_name?: string;
  created_by_staff_name?: string;
  created_by_user_name?: string;
  has_refunds: boolean;
  total_refunded: number;
  pre_discount_total?: number;
  discount_amount?: number;
  items: any[];
  merchandise_items: any[];
}

export interface CustomerOrderReport {
  user_id: number | null;
  user_name: string;
  user_email?: string;
  total_spent: number;
  order_count: number;
  items: CustomerOrderItem[];
  order_type?: 'customer' | 'guest' | 'staff';
  created_by_user_id?: number | null;
  // Enhanced detailed information
  detailed_orders: DetailedOrder[];
  primary_contact_phone?: string;
  primary_contact_email?: string;
  primary_contact_name?: string;
  first_order_date: string;
  last_order_date: string;
  payment_methods_used: string[];
  staff_order_details?: {
    total_orders_for_staff: number;
    average_order_value: number;
    employee_name?: string;
    employee_email?: string;
  };
}

export interface CustomerOrdersResponse {
  results: CustomerOrderReport[];
  customer_orders: CustomerOrderReport[];
  guest_orders: CustomerOrderReport[];
  staff_orders: CustomerOrderReport[];
  start_date: string;
  end_date: string;
  restaurant_id: number;
  restaurant_name: string;
}

export interface RevenueTrendItem {
  label: string;
  revenue: number;
}

export interface RevenueTrendResponse {
  data: RevenueTrendItem[];
}

export interface TopItem {
  item_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface TopItemsResponse {
  top_items: TopItem[];
}

export interface IncomeStatementRow {
  month: string;
  revenue: number;
}

export interface IncomeStatementResponse {
  income_statement: IncomeStatementRow[];
}

export interface UserSignupItem {
  date: string;
  count: number;
}

export interface UserSignupsResponse {
  signups: UserSignupItem[];
}

export interface HeatmapDataPoint {
  day: number;
  hour: number;
  value: number;
}

export interface UserActivityHeatmapResponse {
  day_names: string[];
  heatmap: HeatmapDataPoint[];
}

/**
 * Get customer orders report
 */
export const getCustomerOrdersReport = async (
  startDate: string, 
  endDate: string,
  staffMemberId?: string | null
): Promise<CustomerOrdersResponse> => {
  const params: Record<string, string> = { start: startDate, end: endDate };
  
  // Add staff member filter if provided
  if (staffMemberId && staffMemberId !== 'all') {
    params.staff_member_id = staffMemberId;
  }
  
  return api.get<CustomerOrdersResponse>('/admin/analytics/customer_orders', params);
};

/**
 * Get revenue trend
 */
export const getRevenueTrend = async (interval: string, startDate: string, endDate: string): Promise<RevenueTrendResponse> => {
  return api.get<RevenueTrendResponse>('/admin/analytics/revenue_trend', { interval, start: startDate, end: endDate });
};

/**
 * Get top items
 */
export const getTopItems = async (limit: number, startDate: string, endDate: string): Promise<TopItemsResponse> => {
  return api.get<TopItemsResponse>('/admin/analytics/top_items', { limit, start: startDate, end: endDate });
};

/**
 * Get income statement
 */
export const getIncomeStatement = async (year: number): Promise<IncomeStatementResponse> => {
  return api.get<IncomeStatementResponse>('/admin/analytics/income_statement', { year });
};

/**
 * Get user signups per day
 */
export const getUserSignups = async (startDate: string, endDate: string): Promise<UserSignupsResponse> => {
  return api.get<UserSignupsResponse>('/admin/analytics/user_signups', { start: startDate, end: endDate });
};

/**
 * Get user activity heatmap data (by day of week and hour)
 */
export const getUserActivityHeatmap = async (startDate: string, endDate: string): Promise<UserActivityHeatmapResponse> => {
  return api.get<UserActivityHeatmapResponse>('/admin/analytics/user_activity_heatmap', { start: startDate, end: endDate });
};

/**
 * Get staff users for filtering (users who have created staff orders)
 */
export const getStaffUsers = async (): Promise<{ staff_users: Array<{ id: number; name: string; email: string; role: string; }> }> => {
  return api.get('/admin/analytics/staff_users');
};
