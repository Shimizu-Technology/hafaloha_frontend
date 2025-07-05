// src/shared/api/endpoints/reports.ts

import { apiClient } from '../apiClient';

// Menu Item Report Types
export interface MenuItemReport {
  id: number;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  average_price: number;
  customizations?: Record<string, any>;
}

export interface CategoryReport {
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface MenuItemReportResponse {
  items: MenuItemReport[];
  categories: CategoryReport[];
}

// Payment Method Report Types
export interface PaymentMethodReport {
  payment_method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentMethodReportResponse {
  payment_methods: PaymentMethodReport[];
  total_amount: number;
  total_count: number;
}

// VIP Customer Report Types
export interface VipCustomerReport {
  user_id: number | null;
  user_name: string;
  email: string;
  total_spent: number;
  order_count: number;
  first_order_date: string;
  last_order_date: string;
  average_order_value: number;
  items: {
    name: string;
    quantity: number;
  }[];
}

export interface VipReportSummary {
  total_vip_customers: number;
  total_orders: number;
  total_revenue: number;
  average_orders_per_vip: number;
  average_spend_per_vip: number;
  repeat_customer_rate: number;
}

export interface VipReportResponse {
  vip_customers: VipCustomerReport[];
  summary: VipReportSummary;
}

// Refunds Report Types
export interface RefundDetail {
  id: number;
  order_id: number;
  order_number: string;
  amount: number;
  payment_method: string;
  status: string;
  description: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  refunded_items: any[];
  original_order_total: number;
}

export interface RefundsByMethod {
  payment_method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface RefundDailyTrend {
  date: string;
  amount: number;
}

export interface RefundSummary {
  total_refunds_count: number;
  total_refund_amount: number;
  average_refund_amount: number;
  refund_rate_by_orders: number;
  refund_rate_by_amount: number;
  total_orders_in_period: number;
  total_revenue_in_period: number;
}

export interface RefundsReportResponse {
  summary: RefundSummary;
  refunds_by_method: RefundsByMethod[];
  daily_trends: RefundDailyTrend[];
  refund_details: RefundDetail[];
}

// API Functions
export const getMenuItemReport = (startDate: string, endDate: string) => {
  return apiClient.get<MenuItemReportResponse>('/admin/reports/menu_items', {
    params: { start_date: startDate, end_date: endDate }
  });
};

export const getPaymentMethodReport = (startDate: string, endDate: string) => {
  return apiClient.get<PaymentMethodReportResponse>('/admin/reports/payment_methods', {
    params: { start_date: startDate, end_date: endDate }
  });
};

export const getVipCustomerReport = (startDate: string, endDate: string) => {
  return apiClient.get<VipReportResponse>('/admin/reports/vip_customers', {
    params: { start_date: startDate, end_date: endDate }
  });
};

export const getRefundsReport = (startDate: string, endDate: string) => {
  return apiClient.get<RefundsReportResponse>('/admin/reports/refunds', {
    params: { start_date: startDate, end_date: endDate }
  });
};