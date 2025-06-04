// src/ordering/wholesale/components/admin/FundraiserOrderManager.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Download, Filter, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { Button, Input } from '../../../../shared/components/ui';
import fundraiserOrderService from '../../services/fundraiserOrderService';
import participantService from '../../services/participantService';
import toastUtils from '../../../../shared/utils/toastUtils';
import { FundraiserOrderDetailsModal } from './FundraiserOrderDetailsModal';
import { FundraiserEditOrderModal } from './FundraiserEditOrderModal';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender
} from '@tanstack/react-table';

// Define the Order type
interface OrderItem {
  id: number;
  name: string;
  size?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ShippingAddress {
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Fundraiser {
  id: number;
  name: string;
  slug: string;
}

// Importing the correct type from the existing types folder
import { FundraiserParticipant } from '../../types/fundraiserParticipant';

// Define the Order type structure to match API response
interface Order {
  id: number;
  order_number?: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  payment_method: string;
  transaction_id?: string;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  fundraiser?: Fundraiser;
  // Make sure the type definition matches what the API returns
  fundraiser_participant?: {
    id: number;
    name: string;
    fundraiser_id: number;
    active?: boolean;
  };
  special_instructions?: string;
}

interface FundraiserOrderManagerProps {
  fundraiserId?: number;
  fundraiserName?: string;
}

const FundraiserOrderManager: React.FC<FundraiserOrderManagerProps> = ({ fundraiserId, fundraiserName }) => {
  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination and selection
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // State for order details and edit modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  
  // State for participants (for filtering)
  const [participants, setParticipants] = useState<FundraiserParticipant[]>([]);
  const [participantFilter, setParticipantFilter] = useState<number | string | null>(null);
  
  // State for row selection (bulk actions)
  const [rowSelection, setRowSelection] = useState({});
  
  // State for UI dropdowns
  const [showColumnVisibility, setShowColumnVisibility] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  // Load participants for filtering
  useEffect(() => {
    if (fundraiserId) {
      const loadParticipants = async () => {
        try {
          const data = await participantService.getParticipants(fundraiserId);
          setParticipants(data.participants);
        } catch (err) {
          console.error('Error loading participants:', err);
        }
      };
      
      loadParticipants();
    }
  }, [fundraiserId]);
  
  // Load orders
  useEffect(() => {
    fetchOrders();
  }, [fundraiserId, page, statusFilter, dateFilter, participantFilter]);
  
  // Define table columns
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="px-1">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="px-1">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'order_number',
        header: ({ column }) => (
          <div className="flex items-center">
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center"
            >
              Order #
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.order_number || `WF-${row.original.id}`}
          </div>
        ),
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <div className="flex items-center">
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center"
            >
              Date
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        accessorKey: 'contact_name',
        header: ({ column }) => (
          <div className="flex items-center">
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center"
            >
              Customer
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">{row.original.contact_name}</div>
            <div className="text-sm text-gray-500">{row.original.contact_email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'fundraiser_participant.name',
        header: ({ column }) => (
          <div className="flex items-center">
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center"
            >
              Participant
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-gray-900">
            {row.original.fundraiser_participant?.name || 'General Support'}
          </div>
        ),
      },
      {
        accessorKey: 'total',
        header: ({ column }) => (
          <div className="flex items-center">
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center"
            >
              Total
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => formatPrice(row.original.total),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <div className="flex items-center">
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center"
            >
              Status
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(row.original.status)}`}>
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              onClick={() => handleViewOrder(row.original.id)}
              className="text-blue-600 hover:text-blue-900 p-1"
            >
              <Eye size={18} />
            </button>
          </div>
        ),
      },
    ],
    []
  );
  
  // Fetch orders from API
  // Initialize the table
  const table = useReactTable({
    data: orders,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // We're using server-side pagination
  });
  
  // Fetch orders from API with support for participant filtering
  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page,
        per_page: perPage,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
        participant_id: participantFilter === 'general' ? 'general' : (typeof participantFilter === 'number' ? participantFilter : undefined)
      };
      
      // Add date filter if selected
      if (dateFilter === 'today') {
        const today = new Date();
        params.start_date = today.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        params.start_date = weekAgo.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        params.start_date = monthAgo.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      }
      
      let response;
      
      if (fundraiserId) {
        // Get orders for a specific fundraiser
        response = await fundraiserOrderService.getOrdersByFundraiser(fundraiserId, page, perPage);
      } else {
        // Get all fundraiser orders
        response = await fundraiserOrderService.getAllOrders(page, perPage, params);
      }
      
      setOrders(response.orders);
      setTotalCount(response.total_count);
      setTotalPages(response.total_pages);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };
  
  // Handle date filter change
  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value);
    setPage(1);
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // View order details
  const handleViewOrder = async (orderId: number) => {
    try {
      const order = await fundraiserOrderService.getOrder(orderId);
      setCurrentOrder(order);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      toastUtils.error('Failed to load order details. Please try again.');
    }
  };

  // Edit order
  const handleEditOrder = (order: any) => {
    setCurrentOrder(order);
    setIsModalOpen(false);
    setIsEditModalOpen(true);
  };

  // Save order changes
  const handleSaveOrder = (updatedOrder: any) => {
    setCurrentOrder(updatedOrder);
    setIsEditModalOpen(false);
    setIsModalOpen(true); // Show the details modal again with updated info
    fetchOrders(); // Refresh the order list
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Click-away handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close column visibility dropdown when clicking outside
      if (showColumnVisibility && !(event.target as Element).closest('.column-dropdown')) {
        setShowColumnVisibility(false);
      }
      
      // Close bulk actions dropdown when clicking outside
      if (showBulkActions && !(event.target as Element).closest('.bulk-actions-dropdown')) {
        setShowBulkActions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnVisibility, showBulkActions]);
  
  // Bulk action handlers
  const handleBulkComplete = async () => {
    if (Object.keys(rowSelection).length === 0) return;
    
    setIsLoading(true);
    try {
      // Get selected order IDs
      const selectedOrderIds = Object.keys(rowSelection).map(
        (key) => orders[parseInt(key)].id
      );
      
      // Call API to update statuses
      await fundraiserOrderService.bulkUpdateStatus(selectedOrderIds, 'completed');
      
      toastUtils.success(`${selectedOrderIds.length} orders marked as completed`);
      setRowSelection({});
      setShowBulkActions(false);
      fetchOrders();
    } catch (err) {
      console.error('Error updating orders:', err);
      toastUtils.error('Failed to update orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBulkCancel = async () => {
    if (Object.keys(rowSelection).length === 0) return;
    
    if (window.confirm(`Are you sure you want to cancel ${Object.keys(rowSelection).length} orders?`)) {
      setIsLoading(true);
      try {
        // Get selected order IDs
        const selectedOrderIds = Object.keys(rowSelection).map(
          (key) => orders[parseInt(key)].id
        );
        
        // Call API to update statuses
        await fundraiserOrderService.bulkUpdateStatus(selectedOrderIds, 'cancelled');
        
        toastUtils.success(`${selectedOrderIds.length} orders cancelled`);
        setRowSelection({});
        setShowBulkActions(false);
        fetchOrders();
      } catch (err) {
        console.error('Error cancelling orders:', err);
        toastUtils.error('Failed to cancel orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleBulkExport = async () => {
    if (Object.keys(rowSelection).length === 0) return;
    
    setIsLoading(true);
    try {
      // Get selected order IDs
      const selectedOrderIds = Object.keys(rowSelection).map(
        (key) => orders[parseInt(key)].id
      );
      
      // Call API to export orders to CSV
      const blob = await fundraiserOrderService.exportOrders(selectedOrderIds);
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fundraiser-orders-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toastUtils.success(`${selectedOrderIds.length} orders exported`);
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error exporting orders:', err);
      toastUtils.error('Failed to export orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Fundraiser Orders</h2>
        {fundraiserName && <span className="text-base md:text-lg text-gray-600">Fundraiser: {fundraiserName}</span>}
      </div>
      
      <div className="flex justify-end mb-4">
        <Button 
          onClick={handleBulkExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
        >
          <Download size={18} className="mr-2" />
          Export Orders
        </Button>
      </div>
      
      {/* Search and filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearchSubmit} className="flex w-full">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9 sm:pl-10 w-full text-sm sm:text-base"
              />
            </div>
            <Button 
              type="submit"
              className="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 sm:px-4 py-2 rounded text-sm sm:text-base"
            >
              Search
            </Button>
          </form>
        </div>
        
        <div className="w-full sm:w-auto md:w-40 lg:w-48">
          <div className="text-xs text-gray-500 mb-1 ml-1">Status</div>
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="w-full sm:w-auto md:w-40 lg:w-48">
          <div className="text-xs text-gray-500 mb-1 ml-1">Time Period</div>
          <select
            value={dateFilter}
            onChange={handleDateFilterChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
        
        {/* Participant filter - only show when we have a specific fundraiser */}
        {fundraiserId && participants.length > 0 && (
          <div className="w-full sm:w-auto md:w-40 lg:w-48">
            <div className="text-xs text-gray-500 mb-1 ml-1">Participant</div>
            <select
              value={participantFilter || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setParticipantFilter(null);
                } else if (value === 'general') {
                  setParticipantFilter('general');
                } else {
                  setParticipantFilter(Number(value));
                }
              }}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Participants</option>
              <option value="general">General Support</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      ) : (
        <>
          {/* Column Visibility and Bulk Actions */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">Columns:</span>
                <div className="relative column-dropdown">
                  <button
                    type="button"
                    onClick={() => setShowColumnVisibility(!showColumnVisibility)}
                    className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Filter size={14} className="mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Show/Hide Columns</span>
                    <span className="sm:hidden">Columns</span>
                    <ChevronDown size={14} className="ml-1 sm:ml-2" />
                  </button>
                  <div className={`absolute z-20 mt-1 w-48 sm:w-56 bg-white border border-gray-200 rounded-md shadow-lg overflow-auto max-h-60 ${showColumnVisibility ? '' : 'hidden'}`}>
                    <div className="p-2">
                      {table.getAllColumns()
                        .filter(column => column.getCanHide())
                        .map(column => {
                          return (
                            <div key={column.id} className="flex items-center p-2 hover:bg-gray-100 rounded">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={column.getIsVisible()}
                                onChange={column.getToggleVisibilityHandler()}
                                id={`col-${column.id}`}
                              />
                              <label htmlFor={`col-${column.id}`} className="ml-2 text-sm font-medium text-gray-700 cursor-pointer w-full">
                                {column.id.charAt(0).toUpperCase() + column.id.slice(1)}
                              </label>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bulk Actions Dropdown */}
              {table.getSelectedRowModel().rows.length > 0 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {table.getSelectedRowModel().rows.length} selected
                  </span>
                  <div className="relative bulk-actions-dropdown flex-grow sm:flex-grow-0">
                    <button
                      type="button"
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white border border-blue-600 rounded-md shadow-sm text-xs sm:text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    >
                      <span>Bulk Actions</span>
                      <ChevronDown size={14} className="ml-1 sm:ml-2" />
                    </button>
                    <div className={`absolute z-20 right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg overflow-auto max-h-60 ${showBulkActions ? '' : 'hidden'}`}>
                      <div className="py-1">
                        <button 
                          onClick={handleBulkComplete}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mark as Completed
                        </button>
                        <button 
                          onClick={handleBulkExport}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Export Selected
                        </button>
                        <button 
                          onClick={handleBulkCancel}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-gray-100"
                        >
                          Cancel Orders
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Order list */}
          {orders.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded text-center">
              <p className="text-gray-600">No orders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-0 shadow-sm rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 table-fixed md:table-auto">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          style={{ minWidth: header.id === 'actions' ? '100px' : header.id === 'select' ? '40px' : undefined }}
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanSort() && (
                                <button 
                                  onClick={header.column.getToggleSortingHandler()}
                                  className="ml-1 text-gray-400 hover:text-gray-600"
                                >
                                  <ArrowUpDown size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map(cell => {
                        // Customize cell display based on column ID
                        let cellClassName = "px-3 sm:px-6 py-3 sm:py-4 ";
                        
                        // Add specific styles based on column type
                        if (cell.column.id === 'order_number' || cell.column.id === 'contact_name') {
                          cellClassName += "font-medium ";
                        } else if (cell.column.id === 'status') {
                          cellClassName += "";
                        } else if (cell.column.id === 'total') {
                          cellClassName += "text-right ";
                        } else if (cell.column.id === 'actions') {
                          cellClassName += "text-right ";
                        } else if (cell.column.id === 'select') {
                          cellClassName += "text-center ";
                        }
                        
                        // On mobile screens, we'll handle overflow differently
                        if (cell.column.id !== 'actions' && cell.column.id !== 'select') {
                          cellClassName += "truncate sm:whitespace-normal ";
                        }
                        
                        return (
                          <td key={cell.id} className={cellClassName}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination and table info */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  Showing <span className="font-medium">{orders.length > 0 ? ((page - 1) * perPage) + 1 : 0}</span> to <span className="font-medium">{Math.min(page * perPage, totalCount)}</span> of <span className="font-medium">{totalCount}</span> orders
                </div>
                
                {/* Page size selector */}
                <div className="flex items-center">
                  <label htmlFor="perPage" className="text-xs sm:text-sm text-gray-600 mr-2">Show:</label>
                  <select 
                    id="perPage"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1); // Reset to first page when changing page size
                    }}
                    className="text-xs sm:text-sm p-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              
              <nav className="flex items-center justify-center w-full sm:w-auto overflow-x-auto py-2 px-1 sm:px-0">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`min-w-[32px] h-8 px-1 sm:px-3 py-1 rounded-l border flex items-center justify-center ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  aria-label="Previous page"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">&laquo;</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // On mobile, only show a more compact pagination
                  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                  
                  // For mobile, show fewer pages
                  if (isMobile && (
                    pageNum !== 1 && 
                    pageNum !== totalPages && 
                    pageNum !== page && 
                    (pageNum < page - 1 || pageNum > page + 1)
                  )) {
                    return null;
                  }
                  
                  // For desktop, show more pages
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    pageNum === page ||
                    pageNum === page - 1 ||
                    pageNum === page + 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-w-[32px] h-8 px-1 sm:px-3 py-1 border-t border-b ${pageNum === page ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === 2 && page > 3) ||
                    (pageNum === totalPages - 1 && page < totalPages - 2)
                  ) {
                    return (
                      <span key={pageNum} className="min-w-[32px] h-8 px-1 sm:px-3 py-1 border-t border-b flex items-center justify-center">
                        &hellip;
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={`min-w-[32px] h-8 px-1 sm:px-3 py-1 rounded-r border flex items-center justify-center ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">&raquo;</span>
                </button>
              </nav>
            </div>
          )}
        </>
      )}
      
      {/* Order details modal */}
      {isModalOpen && currentOrder && (
        <FundraiserOrderDetailsModal
          order={currentOrder}
          onClose={() => setIsModalOpen(false)}
          onEdit={handleEditOrder}
        />
      )}
      
      {/* Order edit modal */}
      {isEditModalOpen && currentOrder && (
        <FundraiserEditOrderModal
          order={currentOrder}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveOrder}
        />
      )}
    </div>
  );
};

export default FundraiserOrderManager;
