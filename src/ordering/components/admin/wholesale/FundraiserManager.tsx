// src/ordering/components/admin/wholesale/FundraiserManager.tsx

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Users,
  DollarSign,
  Package,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient, api } from '../../../../shared/api/apiClient';

interface Fundraiser {
  id: number;
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  contact_email: string;
  contact_phone?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  active: boolean;
  settings: any;
  participant_count: number;
  item_count: number;
  total_orders: number;
  total_revenue: number;
  // Pickup information
  pickup_location_name?: string;
  pickup_address?: string;
  pickup_instructions?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_hours?: string;
  has_custom_pickup_location?: boolean;
  pickup_display_name?: string;
  pickup_display_address?: string;
  // Image fields
  card_image_url?: string;
  banner_url?: string;
  has_card_image?: boolean;
  has_banner_image?: boolean;
  created_at: string;
  updated_at: string;
}

interface FundraiserFormData {
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string;
  contact_email: string;
  contact_phone: string;
  active: boolean;
  card_image?: File | null;
  banner_image?: File | null;
  // Pickup information
  pickup_location_name: string;
  pickup_address: string;
  pickup_instructions: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_hours: string;
  settings: {
    show_progress_bar: boolean;
  };
}

interface FundraiserManagerProps {
  restaurantId: string;
  onManage?: (fundraiser: Fundraiser) => void;
  editingFundraiser?: Fundraiser | null;
  onEditComplete?: () => void;
}

export function FundraiserManager({ restaurantId, onManage, editingFundraiser, onEditComplete }: FundraiserManagerProps) {
  // State management
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form and editing state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FundraiserFormData>({
    name: '',
    slug: '',
    description: '',
    start_date: '',
    end_date: '',
    contact_email: '',
    contact_phone: '',
    active: false,
    card_image: null,
    banner_image: null,
    // Pickup information
    pickup_location_name: '',
    pickup_address: '',
    pickup_instructions: '',
    pickup_contact_name: '',
    pickup_contact_phone: '',
    pickup_hours: '',
    settings: {
      show_progress_bar: true
    }
  });
  
  // Current image URLs for editing mode
  const [currentCardImageUrl, setCurrentCardImageUrl] = useState<string | null>(null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'start_date' | 'total_revenue'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load fundraisers on component mount
  useEffect(() => {
    loadFundraisers();
  }, [restaurantId]);

  // Handle editing from external trigger (e.g., from FundraiserDetailPage)
  useEffect(() => {
    if (editingFundraiser) {
      handleEdit(editingFundraiser);
      onEditComplete?.();
    }
  }, [editingFundraiser, onEditComplete]);

  const loadFundraisers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use apiClient which includes proper base URL and authentication
      const response = await apiClient.get('/wholesale/admin/fundraisers');
      
      // Extract fundraisers from API response
      const fundraisers = response.data.success ? (response.data.data?.fundraisers || []) : [];
      setFundraisers(fundraisers);
    } catch (err) {
      console.error('Error loading fundraisers:', err);
      setError('Failed to load fundraisers');
      toastUtils.error('Failed to load fundraisers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setCurrentCardImageUrl(null);
    setCurrentBannerUrl(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      start_date: '',
      end_date: '',
      contact_email: '',
      contact_phone: '',
      active: false,
      card_image: null,
      banner_image: null,
      // Pickup information
      pickup_location_name: '',
      pickup_address: '',
      pickup_instructions: '',
      pickup_contact_name: '',
      pickup_contact_phone: '',
      pickup_hours: '',
      settings: {
        show_progress_bar: true
      }
    });
  };

  // Center-crop an image file to a specific aspect ratio (default 16:9) and reasonable max width
  const cropImageToAspect = async (
    file: File,
    aspectW = 16,
    aspectH = 9,
    targetMaxWidth = 1920
  ): Promise<File> => {
    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageDataUrl;
    });

    const sourceW = img.naturalWidth;
    const sourceH = img.naturalHeight;

    const sourceAspect = sourceW / sourceH;
    const desiredAspect = aspectW / aspectH;

    // Compute centered crop rectangle from the source image
    let cropW: number;
    let cropH: number;
    if (sourceAspect > desiredAspect) {
      // Too wide → limit by height
      cropH = sourceH;
      cropW = Math.round(cropH * desiredAspect);
    } else {
      // Too tall → limit by width
      cropW = sourceW;
      cropH = Math.round(cropW / desiredAspect);
    }
    const cropX = Math.round((sourceW - cropW) / 2);
    const cropY = Math.round((sourceH - cropH) / 2);

    // Scale to target max width while preserving aspect
    const targetW = Math.min(targetMaxWidth, cropW);
    const targetH = Math.round(targetW / desiredAspect);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.9)
    );
    const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '_cropped.jpg', {
      type: 'image/jpeg'
    });
    return croppedFile;
  };

  const handleEdit = (fundraiser: Fundraiser) => {
    setIsCreating(false);
    setEditingId(fundraiser.id);
    setCurrentCardImageUrl(fundraiser.card_image_url || null);
    setCurrentBannerUrl(fundraiser.banner_url || null);
    setFormData({
      name: fundraiser.name || '',
      slug: fundraiser.slug || '',
      description: fundraiser.description || '',
      start_date: fundraiser.start_date || '',
      end_date: fundraiser.end_date || '',
      contact_email: fundraiser.contact_email || '',
      contact_phone: fundraiser.contact_phone || '',
      active: Boolean(fundraiser.active),
      card_image: null,
      banner_image: null,
      // Pickup information
      pickup_location_name: fundraiser.pickup_location_name || '',
      pickup_address: fundraiser.pickup_address || '',
      pickup_instructions: fundraiser.pickup_instructions || '',
      pickup_contact_name: fundraiser.pickup_contact_name || '',
      pickup_contact_phone: fundraiser.pickup_contact_phone || '',
      pickup_hours: fundraiser.pickup_hours || '',
      settings: {
        show_progress_bar: Boolean(fundraiser.settings?.show_progress_bar ?? true)
      }
    });
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!formData.name.trim()) {
        toastUtils.error('Fundraiser name is required');
        return;
      }
      
      // Only validate end date if it's provided
      if (formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
        toastUtils.error('End date must be after start date');
        return;
      }

      // Prepare form data for submission (with or without images)
      const submitData = new FormData();
      
      // Add regular form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'card_image' || key === 'banner_image') {
          // Handle image files separately
          if (value instanceof File) {
            submitData.append(`fundraiser[${key}]`, value);
          }
        } else if (key === 'settings') {
          // Handle nested settings object
          Object.entries(value).forEach(([settingKey, settingValue]) => {
            submitData.append(`fundraiser[settings][${settingKey}]`, String(settingValue));
          });
        } else if (value !== null && value !== undefined) {
          submitData.append(`fundraiser[${key}]`, String(value));
        }
      });

      // Make actual API calls using api upload method
      if (isCreating) {
        await api.upload('/wholesale/admin/fundraisers', submitData, 'POST');
        toastUtils.success('Fundraiser created successfully!');
      } else {
        await api.upload(`/wholesale/admin/fundraisers/${editingId}`, submitData, 'PATCH');
        toastUtils.success('Fundraiser updated successfully!');
      }
      
      // Reset form and refresh data
      setIsCreating(false);
      setEditingId(null);
      loadFundraisers();
      
    } catch (err) {
      console.error('Error saving fundraiser:', err);
      toastUtils.error(isCreating ? 'Failed to create fundraiser' : 'Failed to update fundraiser');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this fundraiser? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/wholesale/admin/fundraisers/${id}`);
      toastUtils.success('Fundraiser deleted successfully');
      loadFundraisers();
    } catch (err) {
      console.error('Error deleting fundraiser:', err);
      toastUtils.error('Failed to delete fundraiser');
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await apiClient.patch(`/wholesale/admin/fundraisers/${id}/toggle_active`);
      toastUtils.success(`Fundraiser ${!currentActive ? 'activated' : 'deactivated'} successfully`);
      loadFundraisers();
    } catch (err) {
      console.error('Error toggling fundraiser status:', err);
      toastUtils.error('Failed to update fundraiser status');
    }
  };

  const handleManage = (fundraiser: Fundraiser) => {
    if (onManage) {
      // Use the callback if provided (new navigation mode)
      onManage(fundraiser);
    } else {
      // Fallback to placeholder message (legacy mode)
      toastUtils.success(`Managing fundraiser "${fundraiser.name}" - Detail page coming soon!`);
      console.log('Manage fundraiser:', fundraiser);
    }
  };

  // Filter and sort fundraisers
  const filteredAndSortedFundraisers = fundraisers
    .filter(fundraiser => {
      const matchesSearch = fundraiser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           fundraiser.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || fundraiser.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'total_revenue':
          aValue = a.total_revenue;
          bValue = b.total_revenue;
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Fundraisers</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          onClick={loadFundraisers}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="fundraiser-manager">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Fundraiser Management</h2>
          <p className="text-gray-600">Create and manage fundraising campaigns</p>
        </div>
        
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Fundraiser
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search fundraisers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Sort by */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at">Created Date</option>
            <option value="name">Name</option>
            <option value="start_date">Start Date</option>
            <option value="total_revenue">Revenue</option>
          </select>

          {/* Sort order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Fundraisers list */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredAndSortedFundraisers.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No fundraisers found' : 'No fundraisers yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first fundraiser to get started'
              }
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Fundraiser
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fundraiser
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedFundraisers.map((fundraiser) => (
                  <tr key={fundraiser.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{fundraiser.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{fundraiser.description}</div>
                        <div className="text-xs text-gray-400 mt-1">{fundraiser.contact_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fundraiser.status)}`}>
                          {fundraiser.status.charAt(0).toUpperCase() + fundraiser.status.slice(1)}
                        </span>
                        {fundraiser.active ? (
                          <span title="Active">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </span>
                        ) : (
                          <span title="Inactive">
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(fundraiser.start_date)}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          to {fundraiser.end_date ? formatDate(fundraiser.end_date) : 'Ongoing'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {fundraiser.participant_count} participants
                        </div>
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-1 text-gray-400" />
                          {fundraiser.item_count} items
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                          {fundraiser.total_orders} orders
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(fundraiser.total_revenue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Primary action - Manage fundraiser */}
                        <button
                          onClick={() => handleManage(fundraiser)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                          title="Manage this fundraiser"
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Manage
                        </button>
                        
                        {/* Secondary actions */}
                        <div className="flex items-center space-x-1 border-l border-gray-200 pl-2">
                          <button
                            onClick={() => toggleActive(fundraiser.id, fundraiser.active)}
                            className="text-gray-400 hover:text-gray-600"
                            title={fundraiser.active ? 'Deactivate' : 'Activate'}
                          >
                            {fundraiser.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(fundraiser)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fundraiser.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingId !== null) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                      <div className="relative top-4 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {isCreating ? 'Create New Fundraiser' : 'Edit Fundraiser'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fundraiser Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter fundraiser name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="custom-fundraiser-url (leave blank to auto-generate)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Will appear as: /wholesale/{formData.slug || 'auto-generated-from-name'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the fundraiser purpose and goals"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@organization.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Pickup Information</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Location Name
                      </label>
                      <input
                        type="text"
                        value={formData.pickup_location_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickup_location_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Hafaloha Restaurant"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Contact Name
                      </label>
                      <input
                        type="text"
                        value={formData.pickup_contact_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickup_contact_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Mrs. Johnson"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Address
                    </label>
                    <textarea
                      value={formData.pickup_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, pickup_address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="123 Main Street, Barrigada, Guam 96913"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.pickup_contact_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickup_contact_phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+1 (671) 555-0123"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Hours
                      </label>
                      <input
                        type="text"
                        value={formData.pickup_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickup_hours: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Mon-Fri 3PM-5PM, Sat 9AM-12PM"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Instructions
                    </label>
                    <textarea
                      value={formData.pickup_instructions}
                      onChange={(e) => setFormData(prev => ({ ...prev, pickup_instructions: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Enter through side door, ask for pickup coordinator, bring order confirmation, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Images</h4>
                <div className="space-y-6">
                  {/* Card Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Image
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      This image will appear on the fundraiser listing page. Recommended: Square or landscape format.
                    </p>
                    
                    {currentCardImageUrl && (
                      <div className="mb-3">
                        <img 
                          src={currentCardImageUrl} 
                          alt="Current card image" 
                          className="w-32 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current card image</p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFormData(prev => ({ ...prev, card_image: file }));
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {/* Banner Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banner Image
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      This image appears as the hero banner (16:9). We will center-crop to 16:9 automatically for best fit.
                    </p>
                    
                    {currentBannerUrl && (
                      <div className="mb-3 w-full max-w-md">
                        <div className="aspect-[16/9] overflow-hidden rounded-lg border border-gray-200">
                          <img 
                            src={currentBannerUrl} 
                            alt="Current banner image" 
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Current banner image</p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) {
                          setFormData(prev => ({ ...prev, banner_image: null }));
                          return;
                        }
                        try {
                          const cropped = await cropImageToAspect(file, 16, 9, 1920);
                          setFormData(prev => ({ ...prev, banner_image: cropped }));
                        } catch (_err) {
                          // Fallback to original file if cropping fails
                          setFormData(prev => ({ ...prev, banner_image: file }));
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Active Status and Settings */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Activation & Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Active (fundraiser is visible and accepting orders)
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Display Settings
                    </label>
                    
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.settings.show_progress_bar}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            settings: { ...prev.settings, show_progress_bar: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Show fundraiser progress bar</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>



              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isCreating ? 'Create Fundraiser' : 'Update Fundraiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FundraiserManager;