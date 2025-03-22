import { api } from '../apiClient';

export interface StaffDiscountSummary {
  total_count: number;
  total_discount_amount: number;
  total_original_amount: number;
  avg_discount_percentage: number;
  working_count: number;
  non_working_count: number;
  house_account_count: number;
  immediate_payment_count: number;
}

export interface StaffDiscountByEmployee {
  user_id: number;
  user_name: string;
  discount_count: number;
  total_discount_amount: number;
  total_original_amount: number;
  avg_discount_percentage: number;
  house_account_balance: number;
  house_account_usage: number;
}

export interface StaffDiscountByBeneficiary {
  beneficiary_id: number | null;
  beneficiary_name: string;
  discount_count: number;
  total_discount_amount: number;
}

export interface StaffDiscountByPaymentMethod {
  date: string;
  immediate_payment: number;
  house_account: number;
}

export const getStaffDiscountSummary = async (
  startDate: string,
  endDate: string
): Promise<{ summary: StaffDiscountSummary }> => {
  const response = await api.get('/staff_discounts/summary', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getStaffDiscountByEmployee = async (
  startDate: string,
  endDate: string
): Promise<{ employees: StaffDiscountByEmployee[] }> => {
  const response = await api.get('/staff_discounts/by_employee', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getStaffDiscountByBeneficiary = async (
  startDate: string,
  endDate: string
): Promise<{ beneficiaries: StaffDiscountByBeneficiary[] }> => {
  const response = await api.get('/staff_discounts/by_beneficiary', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const getStaffDiscountByPaymentMethod = async (
  startDate: string,
  endDate: string
): Promise<{ payment_methods: StaffDiscountByPaymentMethod[] }> => {
  const response = await api.get('/staff_discounts/by_payment_method', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

export const staffDiscountsApi = {
  getStaffDiscountSummary,
  getStaffDiscountByEmployee,
  getStaffDiscountByBeneficiary,
  getStaffDiscountByPaymentMethod
};
