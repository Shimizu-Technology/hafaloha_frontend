// src/ordering/components/admin/wholesale/InventoryManager.tsx

import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  Settings,
  Activity,
  BarChart3
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient } from '../../../../shared/api/apiClient';

interface InventoryItem {
  id: number;
  name: string;
  fundraiser: string;
  track_inventory: boolean;
  stock_quantity: number | null;
  damaged_quantity: number;
  available_quantity: number | string;
  low_stock_threshold: number | null;
  stock_status: string;
  last_restocked_at: string | null;
  needs_attention: boolean;
}

interface OptionInventoryItem {
  id: number;
  name: string;
  fundraiser: string;
  option_group: string;
  total_stock: number;
  available_stock: number;
  has_stock: boolean;
  options: Array<{
    id: number;
    name: string;
    stock_quantity: number | null;
    damaged_quantity: number;
    available_stock: number | null;
    in_stock: boolean;
    out_of_stock: boolean;
    low_stock: boolean;
  }>;
  needs_attention: boolean;
}

interface InventoryTotals {
  total_items_tracked: number;
  items_needing_attention: number;
  total_stock_value: number;
}

interface AuditRecord {
  id: number;
  type: 'item' | 'option';
  audit_type: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_at: string;
  user: { id: number; name: string } | null;
  order: { id: number; order_number: string } | null;
  item: { id: number; name: string };
  option?: { id: number; name: string };
}

interface InventoryData {
  item_level_tracking: InventoryItem[];
  option_level_tracking: OptionInventoryItem[];
  totals: InventoryTotals;
}

const InventoryManager: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'item-level' | 'option-level' | 'audit'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs-attention' | 'out-of-stock' | 'low-stock'>('all');
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalData, setStockModalData] = useState<{
    type: 'item' | 'option';
    id: number;
    name: string;
    current_stock: number;
    action: 'update' | 'restock' | 'damage';
  } | null>(null);

  useEffect(() => {
    loadInventoryData();
    loadAuditTrail();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wholesale/admin/inventory');
      setInventoryData(response.data);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      toastUtils.showError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditTrail = async () => {
    try {
      const response = await apiClient.get('/wholesale/admin/inventory/audit_trail');
      setAuditTrail(response.data.audit_trail);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    }
  };

  const handleStockAction = async (action: string, quantity: number, reason?: string) => {
    if (!stockModalData) return;

    try {
      const endpoint = stockModalData.type === 'item' 
        ? `/wholesale/admin/inventory/items/${stockModalData.id}/${action}`
        : `/wholesale/admin/inventory/options/${stockModalData.id}/${action}`;

      const payload: any = { quantity };
      if (reason) payload.reason = reason;
      if (action === 'update_stock') payload.notes = reason;

      await apiClient.post(endpoint, payload);
      
      toastUtils.showSuccess(`${action.replace('_', ' ')} completed successfully`);
      setShowStockModal(false);
      setStockModalData(null);
      loadInventoryData();
      loadAuditTrail();
    } catch (error: any) {
      console.error(`Failed to ${action}:`, error);
      toastUtils.showError(error.response?.data?.message || `Failed to ${action}`);
    }
  };

  const openStockModal = (type: 'item' | 'option', id: number, name: string, currentStock: number, action: 'update' | 'restock' | 'damage') => {
    setStockModalData({
      type,
      id,
      name,
      current_stock: currentStock,
      action
    });
    setShowStockModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'text-red-600 bg-red-50';
      case 'low_stock': return 'text-yellow-600 bg-yellow-50';
      case 'in_stock': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out_of_stock': return <AlertTriangle className="w-4 h-4" />;
      case 'low_stock': return <AlertCircle className="w-4 h-4" />;
      case 'in_stock': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const filteredItemInventory = inventoryData?.item_level_tracking.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.fundraiser.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'needs-attention' && item.needs_attention) ||
                         (filterStatus === 'out-of-stock' && item.stock_status === 'out_of_stock') ||
                         (filterStatus === 'low-stock' && item.stock_status === 'low_stock');
    
    return matchesSearch && matchesFilter;
  }) || [];

  const filteredOptionInventory = inventoryData?.option_level_tracking.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.fundraiser.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'needs-attention' && item.needs_attention);
    
    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading inventory data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wholesale Inventory Management</h1>
          <p className="text-gray-600">Track and manage inventory across all fundraisers</p>
        </div>
        <button
          onClick={loadInventoryData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      {inventoryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Items Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryData.totals.total_items_tracked}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Need Attention</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryData.totals.items_needing_attention}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-gray-900">${inventoryData.totals.total_stock_value.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'item-level', label: 'Item-Level Tracking', icon: Package },
            { id: 'option-level', label: 'Option-Level Tracking', icon: Settings },
            { id: 'audit', label: 'Audit Trail', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Filter */}
      {(selectedTab === 'item-level' || selectedTab === 'option-level') && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items or fundraisers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Items</option>
            <option value="needs-attention">Needs Attention</option>
            <option value="out-of-stock">Out of Stock</option>
            <option value="low-stock">Low Stock</option>
          </select>
        </div>
      )}

      {/* Content based on selected tab */}
      {selectedTab === 'overview' && inventoryData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Items needing attention */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Items Needing Attention</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[...inventoryData.item_level_tracking.filter(item => item.needs_attention),
                  ...inventoryData.option_level_tracking.filter(item => item.needs_attention)]
                  .slice(0, 5)
                  .map((item, index) => (
                  <div key={`attention-${index}`} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.fundraiser}</p>
                    </div>
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">Needs Attention</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent audit activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {auditTrail.slice(0, 5).map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{audit.item.name}</p>
                      <p className="text-sm text-gray-600">{audit.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${audit.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {audit.quantity_change > 0 ? '+' : ''}{audit.quantity_change}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(audit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'item-level' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItemInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.fundraiser}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.stock_status)}`}>
                        {getStatusIcon(item.stock_status)}
                        <span className="ml-1">{item.stock_status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.stock_quantity ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof item.available_quantity === 'number' ? item.available_quantity : item.available_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.damaged_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openStockModal('item', item.id, item.name, item.stock_quantity || 0, 'update')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Update Stock"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStockModal('item', item.id, item.name, item.stock_quantity || 0, 'restock')}
                          className="text-green-600 hover:text-green-900"
                          title="Restock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStockModal('item', item.id, item.name, item.stock_quantity || 0, 'damage')}
                          className="text-red-600 hover:text-red-900"
                          title="Mark Damaged"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'option-level' && (
        <div className="space-y-6">
          {filteredOptionInventory.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.fundraiser} • {item.option_group}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Available</p>
                    <p className="text-2xl font-bold text-gray-900">{item.available_stock}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {item.options.map((option) => (
                    <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">{option.name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          option.out_of_stock ? 'bg-red-100 text-red-800' :
                          option.low_stock ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {option.out_of_stock ? 'Out of Stock' :
                           option.low_stock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Stock: {option.stock_quantity ?? 'N/A'}</p>
                        <p>Available: {option.available_stock ?? 'N/A'}</p>
                        <p>Damaged: {option.damaged_quantity}</p>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => openStockModal('option', option.id, option.name, option.stock_quantity || 0, 'update')}
                          className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => openStockModal('option', option.id, option.name, option.stock_quantity || 0, 'restock')}
                          className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Restock
                        </button>
                        <button
                          onClick={() => openStockModal('option', option.id, option.name, option.stock_quantity || 0, 'damage')}
                          className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Damage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTab === 'audit' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditTrail.map((audit) => (
                  <tr key={audit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{audit.item.name}</div>
                        {audit.option && (
                          <div className="text-sm text-gray-500">{audit.option.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {audit.audit_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={audit.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                        {audit.quantity_change > 0 ? '+' : ''}{audit.quantity_change}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {audit.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {audit.user?.name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Management Modal */}
      {showStockModal && stockModalData && (
        <StockModal
          data={stockModalData}
          onClose={() => {
            setShowStockModal(false);
            setStockModalData(null);
          }}
          onSubmit={handleStockAction}
        />
      )}
    </div>
  );
};

// Stock Management Modal Component
interface StockModalProps {
  data: {
    type: 'item' | 'option';
    id: number;
    name: string;
    current_stock: number;
    action: 'update' | 'restock' | 'damage';
  };
  onClose: () => void;
  onSubmit: (action: string, quantity: number, reason?: string) => void;
}

const StockModal: React.FC<StockModalProps> = ({ data, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState<number>(data.action === 'update' ? data.current_stock : 0);
  const [reason, setReason] = useState('');

  const getActionDetails = () => {
    switch (data.action) {
      case 'update':
        return {
          title: 'Update Stock',
          action: 'update_stock',
          description: 'Set the exact stock quantity',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          quantityLabel: 'New Stock Quantity'
        };
      case 'restock':
        return {
          title: 'Restock Items',
          action: 'restock',
          description: 'Add items to current stock',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          quantityLabel: 'Quantity to Add'
        };
      case 'damage':
        return {
          title: 'Mark as Damaged',
          action: 'mark_damaged',
          description: 'Mark items as damaged',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          quantityLabel: 'Quantity Damaged'
        };
      default:
        return {
          title: 'Stock Action',
          action: 'update_stock',
          description: '',
          buttonColor: 'bg-gray-600 hover:bg-gray-700',
          quantityLabel: 'Quantity'
        };
    }
  };

  const actionDetails = getActionDetails();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 0) {
      toastUtils.showError('Quantity cannot be negative');
      return;
    }
    onSubmit(actionDetails.action, quantity, reason || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{actionDetails.title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">{actionDetails.description}</p>
            <p className="text-sm font-medium text-gray-900">
              {data.type === 'item' ? 'Item' : 'Option'}: {data.name}
            </p>
            <p className="text-sm text-gray-600">
              Current Stock: {data.current_stock}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {actionDetails.quantityLabel}
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for this change..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${actionDetails.buttonColor}`}
              >
                {actionDetails.title}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
