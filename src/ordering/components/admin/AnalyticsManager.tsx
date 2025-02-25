// src/ordering/components/admin/AnalyticsManager.tsx
import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, Clock, ShoppingBag, Calendar } from 'lucide-react';
import { useOrderStore } from '../../store/orderStore';
import { api } from '../../lib/api';
import * as XLSX from 'xlsx';  // for Excel export

type TimeFrame = '7days' | '30days' | '90days' | '1year' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

interface CustomerOrderItem {
  name: string;
  quantity: number;
}

interface CustomerOrderReport {
  user_id: number | null;
  user_name: string;
  total_spent: number;
  order_count: number;
  items: CustomerOrderItem[];
}

type SortColumn = 'user_name' | 'total_spent' | 'order_count';
type SortDirection = 'asc' | 'desc';

export function AnalyticsManager() {
  const { orders } = useOrderStore();

  // Timeframe + date range
  const [timeframe, setTimeframe] = useState<TimeFrame>('7days');
  const [customRange, setCustomRange] = useState<DateRange>({
    start: new Date(),
    end: new Date(),
  });
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [reportStart, setReportStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  const [customerOrdersReport, setCustomerOrdersReport] = useState<CustomerOrderReport[]>([]);

  // Sorting states for Guest table
  const [guestSortColumn, setGuestSortColumn] = useState<SortColumn>('user_name');
  const [guestSortDirection, setGuestSortDirection] = useState<SortDirection>('asc');

  // Sorting states for Registered table
  const [registeredSortColumn, setRegisteredSortColumn] = useState<SortColumn>('user_name');
  const [registeredSortDirection, setRegisteredSortDirection] = useState<SortDirection>('asc');

  function handleTimeframeChange(tf: TimeFrame) {
    setTimeframe(tf);
    setShowCustomRange(tf === 'custom');
  }

  function handleCustomRangeChange(type: 'start' | 'end', value: string) {
    setCustomRange((prev) => ({
      ...prev,
      [type]: new Date(value),
    }));
  }

  async function fetchCustomerOrdersReport() {
    try {
      const data = await api.getCustomerOrdersReport(reportStart, reportEnd);
      setCustomerOrdersReport(data.results);
    } catch (error) {
      console.error(error);
    }
  }

  // Guest sorting
  function handleGuestSort(column: SortColumn) {
    if (guestSortColumn === column) {
      setGuestSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setGuestSortColumn(column);
      setGuestSortDirection('asc');
    }
  }

  // Registered sorting
  function handleRegisteredSort(column: SortColumn) {
    if (registeredSortColumn === column) {
      setRegisteredSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setRegisteredSortColumn(column);
      setRegisteredSortDirection('asc');
    }
  }

  // Generic “sort array” function
  function sortData(
    data: CustomerOrderReport[],
    sortCol: SortColumn,
    sortDir: SortDirection
  ): CustomerOrderReport[] {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortCol === 'user_name') {
        valA = a.user_name.toLowerCase();
        valB = b.user_name.toLowerCase();
      } else if (sortCol === 'total_spent') {
        valA = a.total_spent;
        valB = b.total_spent;
      } else if (sortCol === 'order_count') {
        valA = a.order_count;
        valB = b.order_count;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  // Split into Guest vs. Registered and sort each set separately
  const guestRows = useMemo(() => {
    const guestData = customerOrdersReport.filter((r) => r.user_id === null);
    return sortData(guestData, guestSortColumn, guestSortDirection);
  }, [customerOrdersReport, guestSortColumn, guestSortDirection]);

  const registeredRows = useMemo(() => {
    const regData = customerOrdersReport.filter((r) => r.user_id !== null);
    return sortData(regData, registeredSortColumn, registeredSortDirection);
  }, [customerOrdersReport, registeredSortColumn, registeredSortDirection]);

  /**
   * 
   * Excel Export:
   *   -> 2 sheets: "Summary" and "Details"
   *   -> In each sheet, we put two sections:
   *      1) GUEST table
   *      2) blank row
   *      3) REGISTERED table
   *
   * That way each sheet has consistent columns, and we avoid mixing columns in one table.
   */
  function exportReportToExcel() {
    if (customerOrdersReport.length === 0) {
      alert('No report data to export!');
      return;
    }

    // GUEST Summary
    const guestSummaryRows = guestRows.map((row) => {
      const totalItemCount = row.items.reduce((sum, i) => sum + i.quantity, 0);
      return {
        Customer: row.user_name,
        'Total Spent': row.total_spent,
        'Order Count': row.order_count,
        'Total Items': totalItemCount,
      };
    });

    // REGISTERED Summary
    const registeredSummaryRows = registeredRows.map((row) => {
      const totalItemCount = row.items.reduce((sum, i) => sum + i.quantity, 0);
      return {
        Customer: row.user_name,
        'Total Spent': row.total_spent,
        'Order Count': row.order_count,
        'Total Items': totalItemCount,
      };
    });

    // GUEST Details
    const guestDetailRows: Array<Record<string, any>> = [];
    guestRows.forEach((r) => {
      r.items.forEach((item) => {
        guestDetailRows.push({
          Customer: r.user_name,
          'Item Name': item.name,
          Quantity: item.quantity,
        });
      });
    });

    // REGISTERED Details
    const registeredDetailRows: Array<Record<string, any>> = [];
    registeredRows.forEach((r) => {
      r.items.forEach((item) => {
        registeredDetailRows.push({
          Customer: r.user_name,
          'Item Name': item.name,
          Quantity: item.quantity,
        });
      });
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // 1) SUMMARY sheet
    {
      // We place Guest summary first, then a blank row, then Registered summary.
      const summaryData: Array<Record<string, any>> = [];
      // Add all guest summary
      summaryData.push(...guestSummaryRows);
      // Add a blank row
      summaryData.push({});
      // Then registered summary
      summaryData.push(...registeredSummaryRows);

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // 2) DETAILS sheet
    {
      // Same pattern: guest detail, blank row, registered detail
      const detailsData: Array<Record<string, any>> = [];
      detailsData.push(...guestDetailRows);
      detailsData.push({});
      detailsData.push(...registeredDetailRows);

      const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Details');
    }

    const fileName = `CustomerOrders_${reportStart}_to_${reportEnd}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  return (
    <div className="space-y-8">
      {/* 
        ...
        Possibly timeframe UI, summary cards, etc.
      */}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Monthly Customer Orders Report</h3>
        
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={reportStart}
              onChange={(e) => setReportStart(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 w-44"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={reportEnd}
              onChange={(e) => setReportEnd(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 w-44"
            />
          </div>

          <button
            onClick={fetchCustomerOrdersReport}
            className="px-4 py-2 bg-[#c1902f] text-white font-medium rounded hover:bg-[#b2872c]"
          >
            Load Report
          </button>

          {customerOrdersReport.length > 0 && (
            <button
              onClick={exportReportToExcel}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700"
            >
              Export to Excel
            </button>
          )}
        </div>

        {/* ============== GUEST ORDERS TABLE ============== */}
        {guestRows.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Guest Orders</h4>
            <div className="overflow-x-auto mb-6">
              <table className="table-fixed w-full border border-gray-200 text-sm">
                <colgroup>
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-2/5" />
                </colgroup>
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      onClick={() => handleGuestSort('user_name')}
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer"
                    >
                      Customer
                    </th>
                    <th
                      onClick={() => handleGuestSort('total_spent')}
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer"
                    >
                      Total Spent
                    </th>
                    <th
                      onClick={() => handleGuestSort('order_count')}
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer"
                    >
                      Orders
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guestRows.map((r, idx) => (
                    <tr key={`${r.user_name}-${idx}`} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{r.user_name}</td>
                      <td className="px-4 py-2 text-gray-800 font-medium">
                        ${r.total_spent.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-gray-800">{r.order_count}</td>
                      <td className="px-4 py-2 text-gray-800">
                        {r.items.map((item, idx2) => (
                          <div key={idx2}>
                            {item.name}{' '}
                            <span className="text-gray-600">x {item.quantity}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* =========== REGISTERED USERS TABLE =========== */}
        {registeredRows.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Registered Users</h4>
            <div className="overflow-x-auto">
              <table className="table-fixed w-full border border-gray-200 text-sm">
                <colgroup>
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-2/5" />
                </colgroup>
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      onClick={() => handleRegisteredSort('user_name')}
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer"
                    >
                      Customer
                    </th>
                    <th
                      onClick={() => handleRegisteredSort('total_spent')}
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer"
                    >
                      Total Spent
                    </th>
                    <th
                      onClick={() => handleRegisteredSort('order_count')}
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer"
                    >
                      Orders
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registeredRows.map((r, idx) => (
                    <tr key={`${r.user_id}-${idx}`} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{r.user_name}</td>
                      <td className="px-4 py-2 text-gray-800 font-medium">
                        ${r.total_spent.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-gray-800">{r.order_count}</td>
                      <td className="px-4 py-2 text-gray-800">
                        {r.items.map((item, idx2) => (
                          <div key={idx2}>
                            {item.name}{' '}
                            <span className="text-gray-600">x {item.quantity}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {customerOrdersReport.length === 0 && (
          <p className="text-gray-500 text-sm">No results found.</p>
        )}
      </div>
    </div>
  );
}
