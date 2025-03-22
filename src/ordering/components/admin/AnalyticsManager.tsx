// src/ordering/components/admin/AnalyticsManager.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import { 
  api, 
  getCustomerOrdersReport, 
  getRevenueTrend, 
  getTopItems, 
  getIncomeStatement,
  getUserSignups,
  getUserActivityHeatmap,
  CustomerOrderItem,
  CustomerOrderReport,
  RevenueTrendItem,
  TopItem,
  IncomeStatementRow,
  UserSignupItem,
  HeatmapDataPoint
} from '../../../shared/api';
import { 
  staffDiscountsApi, 
  StaffDiscountSummary, 
  StaffDiscountByEmployee, 
  StaffDiscountByBeneficiary, 
  StaffDiscountByPaymentMethod 
} from '../../../shared/api/endpoints/staffDiscounts';

// ------------------- Types -------------------
type SortColumn = 'user_name' | 'total_spent' | 'order_count';
type EmployeeSortColumn = 'user_name' | 'discount_count' | 'total_discount_amount' | 'house_account_balance';
type BeneficiarySortColumn = 'beneficiary_name' | 'discount_count' | 'total_discount_amount';
type SortDirection = 'asc' | 'desc';

// For date-range presets
type PresetRange = '1m' | '3m' | '6m' | '1y' | 'all' | null;

// ------------------- Helper to sort reports -------------------
function sortReports(
  data: CustomerOrderReport[],
  column: SortColumn,
  direction: SortDirection
) {
  const copy = [...data];
  copy.sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';

    if (column === 'user_name') {
      valA = a.user_name.toLowerCase();
      valB = b.user_name.toLowerCase();
    } else if (column === 'total_spent') {
      valA = a.total_spent;
      valB = b.total_spent;
    } else if (column === 'order_count') {
      valA = a.order_count;
      valB = b.order_count;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  return copy;
}

// ------------------- Main Component -------------------
interface AnalyticsManagerProps {
  restaurantId?: string;
}

export function AnalyticsManager({ restaurantId }: AnalyticsManagerProps) {
  // ----- 1) Date Range States + Preset -----
  // Default to last 30 days
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>(null);

  // Manually changing date => reset preset
  function handleChangeStartDate(value: string) {
    setStartDate(value);
    setSelectedPreset(null);
  }
  function handleChangeEndDate(value: string) {
    setEndDate(value);
    setSelectedPreset(null);
  }

  // Preset date range logic
  function setPresetRange(preset: Exclude<PresetRange, null>) {
    const now = new Date();
    let start = new Date();

    switch (preset) {
      case '1m':
        start.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        start.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        start = new Date('1970-01-01');
        break;
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setSelectedPreset(preset);
  }

  // ----- 2) Analytics States -----
  const [ordersData, setOrdersData] = useState<CustomerOrderReport[]>([]);
  const [guestSortCol, setGuestSortCol] = useState<SortColumn>('user_name');
  const [guestSortDir, setGuestSortDir] = useState<SortDirection>('asc');
  const [regSortCol, setRegSortCol] = useState<SortColumn>('user_name');
  const [regSortDir, setRegSortDir] = useState<SortDirection>('asc');

  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementRow[]>([]);
  const [userSignups, setUserSignups] = useState<UserSignupItem[]>([]);
  const [activityHeatmap, setActivityHeatmap] = useState<HeatmapDataPoint[]>([]);
  const [dayNames, setDayNames] = useState<string[]>([]);
  
  // Staff Discount Analytics States
  const [staffDiscountSummary, setStaffDiscountSummary] = useState<StaffDiscountSummary | null>(null);
  const [staffDiscountByEmployee, setStaffDiscountByEmployee] = useState<StaffDiscountByEmployee[]>([]);
  const [staffDiscountByBeneficiary, setStaffDiscountByBeneficiary] = useState<StaffDiscountByBeneficiary[]>([]);
  const [staffDiscountByPaymentMethod, setStaffDiscountByPaymentMethod] = useState<StaffDiscountByPaymentMethod[]>([]);
  const [employeeSortCol, setEmployeeSortCol] = useState<EmployeeSortColumn>('user_name');
  const [employeeSortDir, setEmployeeSortDir] = useState<SortDirection>('asc');
  const [beneficiarySortCol, setBeneficiarySortCol] = useState<BeneficiarySortColumn>('beneficiary_name');
  const [beneficiarySortDir, setBeneficiarySortDir] = useState<SortDirection>('asc');

  // ----- 3) Derived: Guest vs Registered -----
  const guestRows = useMemo(() => {
    const guests = ordersData.filter((r) => r.user_id === null);
    return sortReports(guests, guestSortCol, guestSortDir);
  }, [ordersData, guestSortCol, guestSortDir]);

  const registeredRows = useMemo(() => {
    const regs = ordersData.filter((r) => r.user_id !== null);
    return sortReports(regs, regSortCol, regSortDir);
  }, [ordersData, regSortCol, regSortDir]);
  
  // Sorted Employee Discounts
  const sortedEmployeeDiscounts = useMemo(() => {
    const sorted = [...staffDiscountByEmployee];
    sorted.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (employeeSortCol === 'user_name') {
        valA = a.user_name.toLowerCase();
        valB = b.user_name.toLowerCase();
      } else if (employeeSortCol === 'discount_count') {
        valA = a.discount_count;
        valB = b.discount_count;
      } else if (employeeSortCol === 'total_discount_amount') {
        valA = a.total_discount_amount;
        valB = b.total_discount_amount;
      } else if (employeeSortCol === 'house_account_balance') {
        valA = a.house_account_balance;
        valB = b.house_account_balance;
      }

      if (valA < valB) return employeeSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return employeeSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [staffDiscountByEmployee, employeeSortCol, employeeSortDir]);
  
  // Sorted Beneficiary Discounts
  const sortedBeneficiaryDiscounts = useMemo(() => {
    const sorted = [...staffDiscountByBeneficiary];
    sorted.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (beneficiarySortCol === 'beneficiary_name') {
        valA = a.beneficiary_name.toLowerCase();
        valB = b.beneficiary_name.toLowerCase();
      } else if (beneficiarySortCol === 'discount_count') {
        valA = a.discount_count;
        valB = b.discount_count;
      } else if (beneficiarySortCol === 'total_discount_amount') {
        valA = a.total_discount_amount;
        valB = b.total_discount_amount;
      }

      if (valA < valB) return beneficiarySortDir === 'asc' ? -1 : 1;
      if (valA > valB) return beneficiarySortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [staffDiscountByBeneficiary, beneficiarySortCol, beneficiarySortDir]);

  // ----- 4) Load Analytics -----
  async function loadAnalytics() {
    try {
      // 1) Customer Orders
      const custRes = await getCustomerOrdersReport(startDate, endDate);
      setOrdersData(custRes.results || []);

      // 2) Revenue Trend (day-based)
      const revTrend = await getRevenueTrend('day', startDate, endDate);
      setRevenueTrend(revTrend.data || []);

      // 3) Top Items => limit=5
      const topRes = await getTopItems(5, startDate, endDate);
      setTopItems(topRes.top_items || []);

      // 4) Income Statement => by year
      const incRes = await getIncomeStatement(year);
      setIncomeStatement(incRes.income_statement || []);

      // 5) User Signups => by day
      const signupsRes = await getUserSignups(startDate, endDate);
      setUserSignups(signupsRes.signups || []);

      // 6) User Activity Heatmap
      const heatmapRes = await getUserActivityHeatmap(startDate, endDate);
      setActivityHeatmap(heatmapRes.heatmap || []);
      setDayNames(heatmapRes.day_names || []);
      
      // 7) Staff Discount Summary
      const discountSummaryRes = await staffDiscountsApi.getStaffDiscountSummary(startDate, endDate);
      setStaffDiscountSummary(discountSummaryRes.summary);
      
      // 8) Staff Discount By Employee
      const discountByEmployeeRes = await staffDiscountsApi.getStaffDiscountByEmployee(startDate, endDate);
      setStaffDiscountByEmployee(discountByEmployeeRes.employees || []);
      
      // 9) Staff Discount By Beneficiary
      const discountByBeneficiaryRes = await staffDiscountsApi.getStaffDiscountByBeneficiary(startDate, endDate);
      setStaffDiscountByBeneficiary(discountByBeneficiaryRes.beneficiaries || []);
      
      // 10) Staff Discount By Payment Method
      const discountByPaymentMethodRes = await staffDiscountsApi.getStaffDiscountByPaymentMethod(startDate, endDate);
      setStaffDiscountByPaymentMethod(discountByPaymentMethodRes.payment_methods || []);

    } catch (err) {
      console.error('Failed to load analytics:', err);
      alert('Failed to load analytics. Check console for details.');
    }
  }

  // ----- 5) On Mount: Load default data -----
  React.useEffect(() => {
    // On first mount, fetch with the default date range
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- 6) Export to Excel (Customer Orders) -----
  function exportOrdersToExcel() {
    if (ordersData.length === 0) {
      alert('No data to export');
      return;
    }

    // Summaries
    const guestSummary = guestRows.map((r) => ({
      Customer: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
    }));
    const regSummary = registeredRows.map((r) => ({
      Customer: r.user_name,
      'Total Spent': r.total_spent,
      'Order Count': r.order_count,
      'Total Items': r.items.reduce((sum, i) => sum + i.quantity, 0),
    }));

    // Details
    const guestDetails: Array<Record<string, any>> = [];
    guestRows.forEach((r) => {
      r.items.forEach((itm) => {
        guestDetails.push({
          Customer: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
        });
      });
    });
    const regDetails: Array<Record<string, any>> = [];
    registeredRows.forEach((r) => {
      r.items.forEach((itm) => {
        regDetails.push({
          Customer: r.user_name,
          'Item Name': itm.name,
          Quantity: itm.quantity,
        });
      });
    });

    // Construct workbook
    const wb = XLSX.utils.book_new();
    // Summary sheet
    {
      const data: any[] = [];
      data.push(...guestSummary);
      data.push({});
      data.push(...regSummary);

      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, 'Summary');
    }
    // Details sheet
    {
      const data2: any[] = [];
      data2.push(...guestDetails);
      data2.push({});
      data2.push(...regDetails);

      const sheet2 = XLSX.utils.json_to_sheet(data2);
      XLSX.utils.book_append_sheet(wb, sheet2, 'Details');
    }

    XLSX.writeFile(wb, `CustomerOrders_${startDate}_to_${endDate}.xlsx`);
  }

  // ----- 7) Render -----
  return (
    <div className="p-4">
      {/* Header section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <p className="text-gray-600 text-sm">View and analyze customer data and sales trends</p>
      </div>

      {/* 
        ============================================
        (A) Date Range + Preset Buttons + Load 
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4 animate-fadeIn">
        <h3 className="text-lg font-semibold mb-3">Analytics Date Range</h3>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleChangeStartDate(e.target.value)}
              className="border rounded px-3 py-1 w-44"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleChangeEndDate(e.target.value)}
              className="border rounded px-3 py-1 w-44"
            />
          </div>
        </div>

        {/* Preset Range Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {( ['1m','3m','6m','1y','all'] as const ).map((preset) => {
            const isSelected = selectedPreset === preset;
            return (
              <button
                key={preset}
                onClick={() => setPresetRange(preset)}
                className={
                  isSelected
                    ? 'px-3 py-1 bg-blue-500 text-white rounded'
                    : 'px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200'
                }
              >
                {preset === '1m' && 'Last 1 Month'}
                {preset === '3m' && 'Last 3 Months'}
                {preset === '6m' && 'Last 6 Months'}
                {preset === '1y' && 'Last 1 Year'}
                {preset === 'all' && 'All Time'}
              </button>
            );
          })}
        </div>

        {/* "Load Analytics" button */}
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-[#c1902f] text-white rounded hover:bg-[#b2872c]"
        >
          Load Analytics
        </button>
      </div>

      {/* 
        ============================================
        (B) Customer Orders (with Export to Excel)
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-xl font-bold mb-4">Customer Orders</h3>

        {/* Export button if data is present */}
        {ordersData.length > 0 && (
          <button
            onClick={exportOrdersToExcel}
            className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export to Excel
          </button>
        )}

        {/* Guest Orders */}
        {guestRows.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-2">Guest Orders</h4>
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm border border-gray-200">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer"
                      onClick={() => {
                        if (guestSortCol === 'user_name') {
                          setGuestSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setGuestSortCol('user_name');
                          setGuestSortDir('asc');
                        }
                      }}
                    >
                      Customer
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer"
                      onClick={() => {
                        if (guestSortCol === 'total_spent') {
                          setGuestSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setGuestSortCol('total_spent');
                          setGuestSortDir('asc');
                        }
                      }}
                    >
                      Total Spent
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer"
                      onClick={() => {
                        if (guestSortCol === 'order_count') {
                          setGuestSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setGuestSortCol('order_count');
                          setGuestSortDir('asc');
                        }
                      }}
                    >
                      Orders
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guestRows.map((g, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">{g.user_name}</td>
                      <td className="px-4 py-2">${g.total_spent.toFixed(2)}</td>
                      <td className="px-4 py-2">{g.order_count}</td>
                      <td className="px-4 py-2">
                        {g.items.map((itm, i2) => (
                          <div key={i2}>
                            {itm.name}{' '}
                            <span className="text-gray-600">x {itm.quantity}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registered Users */}
        {registeredRows.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Registered Users</h4>
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm border border-gray-200">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer"
                      onClick={() => {
                        if (regSortCol === 'user_name') {
                          setRegSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setRegSortCol('user_name');
                          setRegSortDir('asc');
                        }
                      }}
                    >
                      Customer
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer"
                      onClick={() => {
                        if (regSortCol === 'total_spent') {
                          setRegSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setRegSortCol('total_spent');
                          setRegSortDir('asc');
                        }
                      }}
                    >
                      Total Spent
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer"
                      onClick={() => {
                        if (regSortCol === 'order_count') {
                          setRegSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setRegSortCol('order_count');
                          setRegSortDir('asc');
                        }
                      }}
                    >
                      Orders
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registeredRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">{r.user_name}</td>
                      <td className="px-4 py-2">${r.total_spent.toFixed(2)}</td>
                      <td className="px-4 py-2">{r.order_count}</td>
                      <td className="px-4 py-2">
                        {r.items.map((itm, i2) => (
                          <div key={i2}>
                            {itm.name}{' '}
                            <span className="text-gray-600">x {itm.quantity}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* If no orders at all */}
        {!ordersData.length && (
          <p className="text-gray-500 mt-2">
            No orders found for this range.
          </p>
        )}
      </div>

      {/* 
        ============================================
        (C) Revenue Trend 
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
        {revenueTrend.length > 0 ? (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500">No revenue data in this range.</p>
        )}
      </div>

      {/* 
        ============================================
        (D) Top Items
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-xl font-bold mb-4">Top Items</h3>
        {topItems.length > 0 ? (
          <div className="flex flex-col space-y-2">
            {topItems.map((t, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-gray-50 rounded p-2"
              >
                <div className="text-gray-700 font-medium">
                  {t.item_name}
                </div>
                <div className="text-sm text-gray-600">
                  {t.quantity_sold} sold, ${t.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No item sales in this range.</p>
        )}
      </div>

      {/* 
        ============================================
        (E) Income Statement => Year
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-xl font-bold mb-4">Income Statement (Yearly)</h3>
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium">Year:</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded px-3 py-1 w-24"
          />
        </div>

        {incomeStatement.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm border border-gray-200">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Month</th>
                  <th className="px-4 py-2 text-left font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {incomeStatement.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">{row.month}</td>
                    <td className="px-4 py-2">${row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No data for year {year}.</p>
        )}
      </div>

      {/* 
        ============================================
        (F) User Signups => Daily
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-xl font-bold mb-4">User Signups</h3>
        {userSignups.length > 0 ? (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userSignups} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500">No user signup data in this range.</p>
        )}
      </div>

      {/* 
        ============================================
        (G) User Activity Heatmap
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-xl font-bold mb-4">User Activity Heatmap</h3>
        {activityHeatmap.length > 0 ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This heatmap shows when users are most active, based on order data. 
              Darker colors indicate higher activity. Times are shown in Guam time (UTC+10).
            </p>
            
            {/* Create a structured grid for the heatmap */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-24 border border-gray-200 bg-gray-50"></th>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      // Convert to 12-hour format with AM/PM
                      const hour12 = hour === 0 ? '12 AM' : 
                                    hour < 12 ? `${hour} AM` : 
                                    hour === 12 ? '12 PM' : 
                                    `${hour - 12} PM`;
                      
                      return (
                        <th 
                          key={hour} 
                          className="w-12 h-10 text-center text-xs py-2 font-medium text-gray-600 border border-gray-200 bg-gray-50"
                        >
                          {hour12}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dayNames.map((dayName, dayIndex) => {
                    return (
                      <tr key={dayIndex} className={dayIndex % 2 === 0 ? 'bg-gray-50/30' : ''}>
                        {/* Day label */}
                        <td className="w-24 py-3 px-4 text-sm font-medium text-gray-700 border border-gray-200">
                          {dayName}
                        </td>
                        
                        {/* Hour cells */}
                        {Array.from({ length: 24 }).map((_, hour) => {
                          // Convert from Guam time back to UTC for data lookup
                          const utcHour = (hour - 10 + 24) % 24;
                          
                          // Find data for this day and hour
                          const cellData = activityHeatmap.find(
                            item => item.day === dayIndex && item.hour === utcHour
                          );
                          
                          // Get the value or default to 0
                          const value = cellData?.value || 0;
                          
                          // Calculate color intensity
                          const maxValue = Math.max(...activityHeatmap.map(d => d.value), 1);
                          const intensity = maxValue > 0 ? (value / maxValue) : 0;
                          
                          // Generate background color
                          const bgColor = value > 0 
                            ? `rgba(193, 144, 47, ${Math.max(0.15, intensity)})`
                            : '';
                          
                          // Format for tooltip
                          const hour12 = hour === 0 ? '12 AM' : 
                                        hour < 12 ? `${hour} AM` : 
                                        hour === 12 ? '12 PM' : 
                                        `${hour - 12} PM`;
                          
                          return (
                            <td 
                              key={hour}
                              className="w-12 h-12 text-center border border-gray-200"
                              style={{ backgroundColor: bgColor }}
                              title={`${dayName} ${hour12} - ${value} orders`}
                            >
                              {value > 0 ? value : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex items-center justify-end">
              <div className="text-sm text-gray-700 mr-3">Activity Level:</div>
              <div className="flex rounded-md overflow-hidden">
                <div className="w-8 h-6" style={{ backgroundColor: 'rgba(193, 144, 47, 0.15)' }}></div>
                <div className="w-8 h-6" style={{ backgroundColor: 'rgba(193, 144, 47, 0.3)' }}></div>
                <div className="w-8 h-6" style={{ backgroundColor: 'rgba(193, 144, 47, 0.5)' }}></div>
                <div className="w-8 h-6" style={{ backgroundColor: 'rgba(193, 144, 47, 0.7)' }}></div>
                <div className="w-8 h-6" style={{ backgroundColor: 'rgba(193, 144, 47, 0.9)' }}></div>
              </div>
              <div className="flex text-sm text-gray-700 ml-2">
                <span>Low</span>
                <span className="ml-24">High</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No activity data in this range.</p>
        )}
      </div>
      
      {/* 
        ============================================
        (H) Staff Discount Analysis
        ============================================
      */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h3 className="text-xl font-bold mb-4">Staff Discount Analysis</h3>
        
        {/* Staff Discount Summary Cards */}
        {staffDiscountSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-sm text-blue-600 mb-1">Total Discounts</div>
              <div className="text-2xl font-bold text-blue-800">{staffDiscountSummary.total_count}</div>
              <div className="text-sm text-blue-600 mt-1">
                ${staffDiscountSummary.total_discount_amount.toFixed(2)} saved
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="text-sm text-green-600 mb-1">Avg. Discount</div>
              <div className="text-2xl font-bold text-green-800">
                {staffDiscountSummary.avg_discount_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-green-600 mt-1">
                of total value
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <div className="text-sm text-amber-600 mb-1">Working vs. Non-Working</div>
              <div className="text-2xl font-bold text-amber-800">
                {staffDiscountSummary.working_count} / {staffDiscountSummary.non_working_count}
              </div>
              <div className="text-sm text-amber-600 mt-1">
                {((staffDiscountSummary.working_count / 
                  (staffDiscountSummary.working_count + staffDiscountSummary.non_working_count)) * 
                  100).toFixed(1)}% while working
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className="text-sm text-purple-600 mb-1">Payment Method</div>
              <div className="text-2xl font-bold text-purple-800">
                {staffDiscountSummary.house_account_count} / {staffDiscountSummary.immediate_payment_count}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                House Account / Immediate
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mb-6">No staff discount data available for this period.</p>
        )}
        
        {/* Payment Method Trend Chart */}
        {staffDiscountByPaymentMethod.length > 0 && (
          <div className="mb-8">
            <h4 className="font-semibold text-lg mb-3">Payment Method Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={staffDiscountByPaymentMethod} 
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="immediate_payment"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Immediate Payment"
                  />
                  <Line
                    type="monotone"
                    dataKey="house_account"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="House Account"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Staff Discount by Employee */}
        <div className="mb-8">
          <h4 className="font-semibold text-lg mb-3">Discount Usage by Employee</h4>
          {sortedEmployeeDiscounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm border border-gray-200">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (employeeSortCol === 'user_name') {
                          setEmployeeSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setEmployeeSortCol('user_name');
                          setEmployeeSortDir('asc');
                        }
                      }}
                    >
                      Employee
                      {employeeSortCol === 'user_name' && (
                        <span className="ml-1">
                          {employeeSortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (employeeSortCol === 'discount_count') {
                          setEmployeeSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setEmployeeSortCol('discount_count');
                          setEmployeeSortDir('asc');
                        }
                      }}
                    >
                      # of Discounts
                      {employeeSortCol === 'discount_count' && (
                        <span className="ml-1">
                          {employeeSortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (employeeSortCol === 'total_discount_amount') {
                          setEmployeeSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setEmployeeSortCol('total_discount_amount');
                          setEmployeeSortDir('asc');
                        }
                      }}
                    >
                      Total Discount
                      {employeeSortCol === 'total_discount_amount' && (
                        <span className="ml-1">
                          {employeeSortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (employeeSortCol === 'house_account_balance') {
                          setEmployeeSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setEmployeeSortCol('house_account_balance');
                          setEmployeeSortDir('asc');
                        }
                      }}
                    >
                      House Account Balance
                      {employeeSortCol === 'house_account_balance' && (
                        <span className="ml-1">
                          {employeeSortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Discount %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployeeDiscounts.map((employee, idx) => (
                    <tr
                      key={idx}
                      className={`border-b last:border-b-0 hover:bg-gray-50 ${
                        employee.house_account_balance > 300 ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{employee.user_name}</td>
                      <td className="px-4 py-2">{employee.discount_count}</td>
                      <td className="px-4 py-2">${employee.total_discount_amount.toFixed(2)}</td>
                      <td className={`px-4 py-2 font-medium ${
                        employee.house_account_balance > 300 ? 'text-red-600' : ''
                      }`}>
                        ${employee.house_account_balance.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        {employee.avg_discount_percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No employee discount data for this period.</p>
          )}
        </div>
        
        {/* Staff Discount by Beneficiary */}
        <div>
          <h4 className="font-semibold text-lg mb-3">Discount Usage by Beneficiary</h4>
          {sortedBeneficiaryDiscounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm border border-gray-200">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (beneficiarySortCol === 'beneficiary_name') {
                          setBeneficiarySortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setBeneficiarySortCol('beneficiary_name');
                          setBeneficiarySortDir('asc');
                        }
                      }}
                    >
                      Beneficiary
                      {beneficiarySortCol === 'beneficiary_name' && (
                        <span className="ml-1">
                          {beneficiarySortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (beneficiarySortCol === 'discount_count') {
                          setBeneficiarySortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setBeneficiarySortCol('discount_count');
                          setBeneficiarySortDir('asc');
                        }
                      }}
                    >
                      # of Discounts
                      {beneficiarySortCol === 'discount_count' && (
                        <span className="ml-1">
                          {beneficiarySortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200"
                      onClick={() => {
                        if (beneficiarySortCol === 'total_discount_amount') {
                          setBeneficiarySortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setBeneficiarySortCol('total_discount_amount');
                          setBeneficiarySortDir('asc');
                        }
                      }}
                    >
                      Total Discount Amount
                      {beneficiarySortCol === 'total_discount_amount' && (
                        <span className="ml-1">
                          {beneficiarySortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBeneficiaryDiscounts.map((beneficiary, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 font-medium">
                        {beneficiary.beneficiary_name || 'Self (No Beneficiary)'}
                      </td>
                      <td className="px-4 py-2">{beneficiary.discount_count}</td>
                      <td className="px-4 py-2">${beneficiary.total_discount_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No beneficiary discount data for this period.</p>
          )}
        </div>
        
        {/* Export buttons */}
        {(sortedEmployeeDiscounts.length > 0 || sortedBeneficiaryDiscounts.length > 0) && (
          <div className="mt-6">
            <button
              onClick={() => {
                // Export staff discount data to Excel
                const wb = XLSX.utils.book_new();
                
                // Summary sheet
                if (staffDiscountSummary) {
                  const summaryData = [{
                    Metric: 'Total Discounts',
                    Value: staffDiscountSummary.total_count
                  }, {
                    Metric: 'Total Discount Amount',
                    Value: `$${staffDiscountSummary.total_discount_amount.toFixed(2)}`
                  }, {
                    Metric: 'Average Discount Percentage',
                    Value: `${staffDiscountSummary.avg_discount_percentage.toFixed(1)}%`
                  }, {
                    Metric: 'Working Discounts',
                    Value: staffDiscountSummary.working_count
                  }, {
                    Metric: 'Non-Working Discounts',
                    Value: staffDiscountSummary.non_working_count
                  }, {
                    Metric: 'House Account Usage',
                    Value: staffDiscountSummary.house_account_count
                  }, {
                    Metric: 'Immediate Payment Usage',
                    Value: staffDiscountSummary.immediate_payment_count
                  }];
                  
                  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
                  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
                }
                
                // Employee sheet
                if (sortedEmployeeDiscounts.length > 0) {
                  const employeeData = sortedEmployeeDiscounts.map(e => ({
                    Employee: e.user_name,
                    'Discount Count': e.discount_count,
                    'Discount Amount': `$${e.total_discount_amount.toFixed(2)}`,
                    'Original Amount': `$${e.total_original_amount.toFixed(2)}`,
                    'Average Discount': `${e.avg_discount_percentage.toFixed(1)}%`,
                    'House Account Balance': `$${e.house_account_balance.toFixed(2)}`,
                    'House Account Usage': `$${e.house_account_usage.toFixed(2)}`
                  }));
                  
                  const employeeSheet = XLSX.utils.json_to_sheet(employeeData);
                  XLSX.utils.book_append_sheet(wb, employeeSheet, 'By Employee');
                }
                
                // Beneficiary sheet
                if (sortedBeneficiaryDiscounts.length > 0) {
                  const beneficiaryData = sortedBeneficiaryDiscounts.map(b => ({
                    Beneficiary: b.beneficiary_name || 'Self (No Beneficiary)',
                    'Discount Count': b.discount_count,
                    'Discount Amount': `$${b.total_discount_amount.toFixed(2)}`
                  }));
                  
                  const beneficiarySheet = XLSX.utils.json_to_sheet(beneficiaryData);
                  XLSX.utils.book_append_sheet(wb, beneficiarySheet, 'By Beneficiary');
                }
                
                // Write the Excel file
                XLSX.writeFile(wb, `StaffDiscountReport_${startDate}_to_${endDate}.xlsx`);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export Staff Discount Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
