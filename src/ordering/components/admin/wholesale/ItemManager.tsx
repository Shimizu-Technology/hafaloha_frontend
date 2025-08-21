// src/ordering/components/admin/wholesale/ItemManager.tsx

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  DollarSign,
  Image,
  Upload,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  Archive,
  TrendingUp,
  Boxes
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient } from '../../../../shared/api/apiClient';
import PresetManager from './PresetManager';

interface WholesaleItemVariant {
  id: number;
  sku: string;
  size: string | null;
  color: string | null;
  display_name: string;
  price_adjustment: number;
  final_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  total_ordered: number;
  total_revenue: number;
  active: boolean;
  can_purchase: boolean;
}

// New Option Group System Interfaces
interface WholesaleOption {
  id: number;
  name: string;
  additional_price: number;
  available: boolean;
  position: number;
  total_ordered: number;
  total_revenue: number;
  stock_quantity?: number | null;
  damaged_quantity: number;
  low_stock_threshold?: number | null;
  inventory_tracking_enabled: boolean;
  available_stock?: number | null;
  in_stock: boolean;
  out_of_stock: boolean;
  low_stock: boolean;
  final_price: number;
  display_name: string;
  created_at: string;
  updated_at: string;
}

interface WholesaleOptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  position: number;
  enable_inventory_tracking: boolean;
  has_available_options: boolean;
  required_but_unavailable: boolean;
  inventory_tracking_enabled: boolean;
  total_option_stock: number;
  available_option_stock: number;
  has_option_stock: boolean;
  options_count: number;
  options: WholesaleOption[];
  created_at: string;
  updated_at: string;
}

interface OptionGroupFormData {
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  position: number;
  enable_inventory_tracking: boolean;
  options: OptionFormData[];
}

interface OptionFormData {
  name: string;
  additional_price: number;
  available: boolean;
  position: number;
}

// Option Group Preset Interfaces
interface WholesaleOptionPreset {
  id: number;
  name: string;
  additional_price: number;
  available: boolean;
  position: number;
  display_name: string;
  full_display_name: string;
  created_at: string;
  updated_at: string;
}

interface WholesaleOptionGroupPreset {
  id: number;
  name: string;
  description: string;
  min_select: number;
  max_select: number;
  required: boolean;
  position: number;
  enable_inventory_tracking: boolean;
  has_available_options: boolean;
  required_but_unavailable: boolean;
  inventory_tracking_enabled: boolean;
  option_presets_count: number;
  option_presets: WholesaleOptionPreset[];
  created_at: string;
  updated_at: string;
}

// Removed unused preset form interfaces

// Removed SelectedOptions interface - not currently used

interface WholesaleItem {
  id: number;
  fundraiser_id: number;
  fundraiser_name: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  price_cents: number;
  position: number;
  sort_order: number;
  options: any;
  track_inventory: boolean;
  allow_sale_with_no_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  in_stock: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  total_ordered: number;
  total_revenue: number;
  active: boolean;
  images_count: number;
  item_images?: ExistingImage[];
  variants?: WholesaleItemVariant[];
  has_variants: boolean;
  variant_count: number;
  
  // Option Groups (new system)
  option_groups?: WholesaleOptionGroup[];
  has_options: boolean;
  option_groups_count: number;
  
  created_at: string;
  updated_at: string;
}

interface ItemFormData {
  fundraiser_id: number;
  name: string;
  description: string;
  sku: string;
  price: string;
  position: number;
  sort_order: number;
  track_inventory: boolean;
  allow_sale_with_no_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  option_groups: OptionGroupFormData[];
}

// Removed PreviewVariant interface - using option groups instead

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface ExistingImage {
  id: number;
  image_url: string;
  alt_text: string;
  position: number;
  primary: boolean;
}

interface Fundraiser {
  id: number;
  name: string;
}

interface ItemManagerProps {
  restaurantId: string;
  fundraiserId?: number; // Optional for backwards compatibility
  onDataChange?: () => void; // Callback to notify parent of data changes
}

export function ItemManager({ restaurantId, fundraiserId, onDataChange }: ItemManagerProps) {
  // State management
  const [items, setItems] = useState<WholesaleItem[]>([]);
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Preset management state
  const [presets, setPresets] = useState<WholesaleOptionGroupPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  
  // Form and editing state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ItemFormData>({
    fundraiser_id: 0,
    name: '',
    description: '',
    sku: '',
    price: '',
    position: 0,
    sort_order: 0,
    track_inventory: false,
    allow_sale_with_no_stock: false,
    stock_quantity: 0,
    low_stock_threshold: 5,
    option_groups: []
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'price' | 'total_ordered'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Image upload state
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  // SKU preview state
  // Removed previewVariants - using option groups instead

  // Load data on component mount
  useEffect(() => {
    loadData();
    loadPresets();
  }, [restaurantId, fundraiserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use apiClient for proper base URL and authentication
      if (fundraiserId) {
        // Scoped mode: Load items for specific fundraiser
        const itemsResponse = await apiClient.get(`/wholesale/admin/items?fundraiser_id=${fundraiserId}`);
        const items = itemsResponse.data.success ? (itemsResponse.data.data?.items || []) : [];
        setItems(items);
      } else {
        // Legacy mode: Load all items and fundraisers (for backwards compatibility)
        const [itemsResponse, fundraisersResponse] = await Promise.all([
          apiClient.get('/wholesale/admin/items'),
          apiClient.get('/wholesale/admin/fundraisers')
        ]);
        
        const items = itemsResponse.data.success ? (itemsResponse.data.data?.items || []) : [];
        const fundraisers = fundraisersResponse.data.success ? (fundraisersResponse.data.data?.fundraisers || []) : [];
        
        setItems(items);
        setFundraisers(fundraisers);
      }
      
    } catch (err) {
      console.error('Error loading wholesale items:', err);
      setError('Failed to load wholesale items');
      toastUtils.error('Failed to load wholesale items');
    } finally {
      setLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      setPresetsLoading(true);
      const response = await apiClient.get('/wholesale/admin/option_group_presets');
      
      if (response.data.success) {
        setPresets(response.data.data?.option_group_presets || []);
      }
    } catch (err) {
      console.error('Error loading presets:', err);
      // Don't show error toast for presets - it's not critical
    } finally {
      setPresetsLoading(false);
    }
  };

  const applyPreset = (preset: WholesaleOptionGroupPreset) => {
    // Convert preset to form data format
    const presetAsFormData: OptionGroupFormData = {
      name: preset.name,
      min_select: preset.min_select,
      max_select: preset.max_select,
      required: preset.required,
      position: formData.option_groups.length,
      enable_inventory_tracking: preset.enable_inventory_tracking,
      options: preset.option_presets.map(optionPreset => ({
        name: optionPreset.name,
        additional_price: optionPreset.additional_price,
        available: optionPreset.available,
        position: optionPreset.position
      }))
    };

    // Add to current form data
    setFormData(prev => ({
      ...prev,
      option_groups: [...prev.option_groups, presetAsFormData]
    }));

    setShowPresetSelector(false);
    toastUtils.success(`Applied preset: ${preset.name}`);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      fundraiser_id: fundraiserId || 0,
      name: '',
      description: '',
      sku: '',
      price: '',
      position: items.length + 1,
      sort_order: items.length + 1,
      track_inventory: false,
      allow_sale_with_no_stock: false,
      stock_quantity: 0,
      low_stock_threshold: 5,
      option_groups: []
    });
  };

  const handleEdit = (item: WholesaleItem) => {
    try {
      console.log('handleEdit called with item:', item);
      
      setIsCreating(false);
      setEditingId(item.id);
      
      // Convert existing option groups to form data format
      const optionGroupsData: OptionGroupFormData[] = (item.option_groups || []).map(group => ({
        name: group.name,
        min_select: group.min_select,
        max_select: group.max_select,
        required: group.required,
        position: group.position,
        enable_inventory_tracking: group.enable_inventory_tracking,
        options: (group.options || []).map(option => ({
          name: option.name,
          additional_price: option.additional_price,
          available: option.available,
          position: option.position
        }))
      }));
      
      setFormData({
        fundraiser_id: item.fundraiser_id || fundraiserId || 0,
        name: item.name || '',
        description: item.description || '',
        sku: item.sku || '',
        price: item.price?.toString() || '0',
        position: item.position || 0,
        sort_order: item.sort_order || 0,
        track_inventory: item.track_inventory || false,
        allow_sale_with_no_stock: (item as any).allow_sale_with_no_stock || false,
        stock_quantity: item.stock_quantity || 0,
        low_stock_threshold: item.low_stock_threshold || 5,
        option_groups: optionGroupsData
      });
      
      // Load existing images if available
      if (item.item_images && Array.isArray(item.item_images)) {
        setExistingImages(item.item_images);
      } else {
        setExistingImages([]);
      }
      
      // Clear any selected new images and deletion list
      setSelectedImages([]);
      setImagesToDelete([]);
      
      console.log('Edit form data set successfully');
    } catch (error) {
      console.error('Error in handleEdit:', error);
      toastUtils.error('Failed to load item for editing. Please try again.');
    }
  };

  // Helper function to create option groups for a new item
  const createOptionGroups = async (itemId: number, optionGroups: OptionGroupFormData[]) => {
    const fundraiserId = formData.fundraiser_id;
    
    for (const groupData of optionGroups) {
      const groupResponse = await apiClient.post(`/wholesale/admin/fundraisers/${fundraiserId}/items/${itemId}/option_groups`, {
        option_group: {
          name: groupData.name,
          min_select: groupData.min_select,
          max_select: groupData.max_select,
          required: groupData.required,
          position: groupData.position,
          enable_inventory_tracking: groupData.enable_inventory_tracking
        }
      });
      
      const groupId = groupResponse.data.data.option_group.id;
      
      // Create options for this group
      for (const optionData of groupData.options) {
        await apiClient.post(`/wholesale/admin/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}/options`, {
          option: {
            name: optionData.name,
            additional_price: optionData.additional_price,
            available: optionData.available,
            position: optionData.position
          }
        });
      }
    }
  };

  // Helper function to update option groups for an existing item
  const updateOptionGroups = async (itemId: number, optionGroups: OptionGroupFormData[]) => {
    const fundraiserId = formData.fundraiser_id;
    
    // For simplicity, we'll delete all existing option groups and recreate them
    // In a production app, you might want to do a more sophisticated diff/merge
    
    // Get existing option groups
    const existingResponse = await apiClient.get(`/wholesale/admin/fundraisers/${fundraiserId}/items/${itemId}`);
    const existingGroups = existingResponse.data.data.item.option_groups || [];
    
    // Delete existing groups
    for (const group of existingGroups) {
      await apiClient.delete(`/wholesale/admin/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${group.id}`);
    }
    
    // Create new groups
    await createOptionGroups(itemId, optionGroups);
  };

  const handleSave = async () => {
    try {
      setImageUploading(true);
      
      // Basic validation
      if (!formData.name.trim()) {
        toastUtils.error('Item name is required');
        return;
      }
      
      if (!formData.fundraiser_id) {
        toastUtils.error('Please select a fundraiser');
        return;
      }
      
      if (!formData.price || parseFloat(formData.price) <= 0) {
        toastUtils.error('Valid price is required');
        return;
      }

      // Prepare data for submission
      let requestData: any;
      let requestConfig: any = {};

      // Prepare item data (excluding option_groups for separate API calls)
      const itemData = { ...formData };
      delete (itemData as any).option_groups; // Remove option_groups from item data - we'll create them separately

      if (selectedImages.length > 0 || imagesToDelete.length > 0) {
        // Use FormData for image uploads/deletions (both new items and existing items with image changes)
        const formDataToSend = new FormData();
        
        // Add all form fields
        Object.keys(itemData).forEach(key => {
          const value = itemData[key as keyof typeof itemData];
          formDataToSend.append(`item[${key}]`, String(value));
        });
        
        // Add new images
        selectedImages.forEach((imageFile) => {
          formDataToSend.append('item[images][]', imageFile.file);
        });
        
        // Add images to delete
        imagesToDelete.forEach((imageId) => {
          formDataToSend.append('item[delete_image_ids][]', String(imageId));
        });
        
        requestData = formDataToSend;
        requestConfig.headers = {
          'Content-Type': 'multipart/form-data'
        };
      } else {
        // Use JSON for non-image requests
        requestData = { item: itemData };
      }

      // Make actual API calls using apiClient
      let itemId: number;
      
      if (isCreating) {
        const fundraiserId = formData.fundraiser_id;
        const response = await apiClient.post(`/wholesale/admin/fundraisers/${fundraiserId}/items`, requestData, requestConfig);
        itemId = response.data.data.item.id;
        
        // Create option groups for new item
        if (formData.option_groups.length > 0) {
          await createOptionGroups(itemId, formData.option_groups);
        }
        
        toastUtils.success('Item created successfully!');
      } else {
        const fundraiserId = formData.fundraiser_id;
        await apiClient.patch(`/wholesale/admin/fundraisers/${fundraiserId}/items/${editingId}`, requestData, requestConfig);
        itemId = editingId!;
        
        // Update option groups for existing item
        await updateOptionGroups(itemId, formData.option_groups);
        
        toastUtils.success('Item updated successfully!');
      }
      
      // Reset form and refresh data
      setIsCreating(false);
      setEditingId(null);
      setSelectedImages([]);
      setExistingImages([]);
      setImagesToDelete([]);
      
      // Clean up image previews
      selectedImages.forEach(image => {
        URL.revokeObjectURL(image.preview);
      });
      
      loadData();
      
      // Notify parent component of data changes
      try {
        onDataChange?.();
      } catch (err) {
        console.warn('Error in onDataChange callback:', err);
      }
      
    } catch (err) {
      console.error('Error saving item:', err);
      toastUtils.error(isCreating ? 'Failed to create item' : 'Failed to update item');
    } finally {
      setImageUploading(false);
    }
  };

  const handleCancel = () => {
    try {
      console.log('handleCancel called');
      
      // Clean up any image previews before clearing state
      selectedImages.forEach(image => {
        if (image.preview) {
          URL.revokeObjectURL(image.preview);
        }
      });
      
      setIsCreating(false);
      setEditingId(null);
      setSelectedImages([]);
      setExistingImages([]);
      setImagesToDelete([]);
      // Removed previewVariants cleanup - using option groups instead
      
      console.log('Cancel completed successfully');
    } catch (error) {
      console.error('Error in handleCancel:', error);
      // Still try to reset state even if cleanup fails
      setIsCreating(false);
      setEditingId(null);
      setSelectedImages([]);
      setExistingImages([]);
      setImagesToDelete([]);
    }
  };

  // Image handling functions
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxImages = 4;
    const totalCurrentImages = existingImages.length + selectedImages.length;
    
    if (totalCurrentImages + files.length > maxImages) {
      toastUtils.error(`You can only upload up to ${maxImages} images total`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toastUtils.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    const newImages: ImageFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));

    setSelectedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (imageId: string) => {
    setSelectedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const removeExistingImage = (imageId: number) => {
    // Add to deletion list
    setImagesToDelete(prev => [...prev, imageId]);
    // Remove from existing images display
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const setPrimaryImage = async (imageId: number) => {
    if (!editingId) return;
    
    try {
      const response = await apiClient.patch(`/wholesale/admin/fundraisers/${fundraiserId}/items/${editingId}/set_primary_image`, {
        image_id: imageId
      });
      
      if (response.data.success) {
        // Update existing images to reflect the new primary
        setExistingImages(prev => prev.map(img => ({
          ...img,
          primary: img.id === imageId
        })));
        
        toastUtils.success('Primary image updated successfully!');
      }
    } catch (error: any) {
      console.error('Error setting primary image:', error);
      toastUtils.error(error.response?.data?.message || 'Failed to set primary image');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/wholesale/admin/items/${id}`);
      toastUtils.success('Item deleted successfully');
      loadData();
    } catch (err) {
      console.error('Error deleting item:', err);
      toastUtils.error('Failed to delete item');
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await apiClient.patch(`/wholesale/admin/items/${id}/toggle_active`);
      toastUtils.success(`Item ${!currentActive ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (err) {
      console.error('Error toggling item status:', err);
      toastUtils.error('Failed to update item status');
    }
  };

  const bulkUpdateStock = async () => {
    try {
      await apiClient.post('/wholesale/admin/items/bulk_update', { /* bulk update data */ });
      toastUtils.success('Bulk update completed successfully');
      loadData();
    } catch (err) {
      console.error('Error with bulk update:', err);
      toastUtils.error('Bulk update failed');
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStock = stockFilter === 'all' || item.stock_status === stockFilter;
      return matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'total_ordered':
          aValue = a.total_ordered;
          bValue = b.total_ordered;
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

  // Removed generatePreviewVariants - using option groups instead

  // Removed generateSkuForOptionSelection - not currently used

  // Removed abbreviateOptionName - not currently used

  // Removed generateOptionSkuPreviews - not currently used

  // Removed variant preview functions - using option groups instead

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
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Items</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          onClick={loadData}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="item-manager">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Item Management</h2>
          <p className="text-gray-600">Manage wholesale products, inventory, and pricing</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={bulkUpdateStock}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Boxes className="w-4 h-4 mr-2" />
            Bulk Update
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>



          {/* Stock filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {/* Sort by */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at">Created Date</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="total_ordered">Orders</option>
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

      {/* Items list */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || stockFilter !== 'all' ? 'No items found' : 'No items yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || stockFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : fundraiserId 
                  ? 'No items have been added to this fundraiser yet'
                  : 'Create your first wholesale item to get started'
              }
            </p>
            {(!searchQuery && stockFilter === 'all') && (
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  {!fundraiserId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fundraiser
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  {/* Stock column commented out since stock tracking is not currently being used */}
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                            {item.item_images && item.item_images.length > 0 ? (
                              <img
                                src={item.item_images[0].image_url}
                                alt={item.item_images[0].alt_text}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {item.name}
                            {!item.active && (
                              <Archive className="w-4 h-4 ml-2 text-gray-400" />
                            )}
                            {/* Variant indicators */}
                            {item.has_variants && item.variant_count > 0 && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title={`${item.variant_count} variants available`}>
                                {item.variant_count} variant{item.variant_count !== 1 ? 's' : ''}
                              </span>
                            )}
                            {item.options?.size_options?.length > 0 && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={`Sizes: ${item.options.size_options.join(', ')}`}>
                                {item.options.size_options.length} size{item.options.size_options.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {item.options?.color_options?.length > 0 && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title={`Colors: ${item.options.color_options.join(', ')}`}>
                                {item.options.color_options.length} color{item.options.color_options.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                          <div className="text-xs text-gray-400">SKU: {item.sku}</div>
                        </div>
                      </div>
                    </td>
                    {!fundraiserId && (
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.fundraiser_name}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(item.price)}
                    </td>
                    {/* Stock data cell commented out since stock tracking is not currently being used */}
                    {/* <td className="px-6 py-4">
                      {item.track_inventory ? (
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(item.stock_status)}`}>
                            {item.stock_status.replace('_', ' ')}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.stock_quantity} in stock
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not tracked</span>
                      )}
                    </td> */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-gray-400" />
                          {item.total_ordered} sold
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                          {formatCurrency(item.total_revenue)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => toggleActive(item.id, item.active)}
                          className="text-gray-400 hover:text-gray-600"
                          title={item.active ? 'Deactivate' : 'Activate'}
                        >
                          {item.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div className="relative top-10 mx-auto p-6 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {isCreating ? 'Create New Item' : 'Edit Item'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form 
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault(); // Prevent form submission and page refresh
                handleSave(); // Call our save handler instead
              }}
            >
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className={`grid grid-cols-1 gap-4 ${!fundraiserId ? 'md:grid-cols-2' : ''}`}>
                  {/* Only show fundraiser selection in global mode */}
                  {!fundraiserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fundraiser *
                      </label>
                      <select
                        value={formData.fundraiser_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, fundraiser_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value={0}>Select a fundraiser</option>
                        {fundraisers.map(fundraiser => (
                          <option key={fundraiser.id} value={fundraiser.id}>
                            {fundraiser.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter item name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter item SKU (e.g., TSHIRT-DESIGN1)"
                    />

                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the item"
                  />
                </div>
              </div>

              {/* Option Groups Management */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Product Options</h4>
                  {presets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPresetSelector(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Use Preset
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {formData.option_groups.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500 mb-2">Create option groups to let customers choose variations</p>
                      <p className="text-sm text-gray-400 mb-4">Examples: Size (S, M, L), Color (Red, Blue), Style (Classic, Premium)</p>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              option_groups: [...prev.option_groups, {
                                name: '',
                                min_select: 1,
                                max_select: 1,
                                required: true,
                                position: 0,
                                enable_inventory_tracking: false,
                                options: []
                              }]
                            }));
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add Your First Option Group
                        </button>
                        <div className="text-sm text-gray-500 space-y-1">
                          {presets.length > 0 ? (
                            <div>
                              or{' '}
                              <button
                                type="button"
                                onClick={() => setShowPresetSelector(true)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                choose from a preset
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              No presets available yet
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => setShowPresetManager(true)}
                              className="text-teal-600 hover:text-teal-800 font-medium text-xs"
                            >
                              ⚙️ Manage Presets
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {formData.option_groups.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 mr-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Option Group Name *
                              </label>
                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) => {
                                  const newGroups = [...formData.option_groups];
                                  newGroups[groupIndex] = { ...group, name: e.target.value };
                                  setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                }}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-medium transition-colors ${
                                  group.name.trim() 
                                    ? 'border-gray-300 focus:border-blue-500 bg-white' 
                                    : 'border-orange-300 focus:border-orange-500 bg-orange-50'
                                }`}
                                placeholder="Enter group name (e.g., Size, Color, Style, Material)"
                                required
                              />
                              {!group.name.trim() && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Please enter a name for this option group
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newGroups = formData.option_groups.filter((_, i) => i !== groupIndex);
                                setFormData(prev => ({ ...prev, option_groups: newGroups }));
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Min Select</label>
                              <input
                                type="number"
                                min="0"
                                value={group.min_select}
                                onChange={(e) => {
                                  const newGroups = [...formData.option_groups];
                                  newGroups[groupIndex] = { ...group, min_select: parseInt(e.target.value) || 0 };
                                  setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                }}
                                className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Max Select</label>
                              <input
                                type="number"
                                min="1"
                                value={group.max_select}
                                onChange={(e) => {
                                  const newGroups = [...formData.option_groups];
                                  newGroups[groupIndex] = { ...group, max_select: parseInt(e.target.value) || 1 };
                                  setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                }}
                                className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={group.required}
                                onChange={(e) => {
                                  const newGroups = [...formData.option_groups];
                                  newGroups[groupIndex] = { ...group, required: e.target.checked };
                                  setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">Required</span>
                            </label>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                            {group.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <input
                                  type="text"
                                  value={option.name}
                                  onChange={(e) => {
                                    const newGroups = [...formData.option_groups];
                                    const newOptions = [...group.options];
                                    newOptions[optionIndex] = { ...option, name: e.target.value };
                                    newGroups[groupIndex] = { ...group, options: newOptions };
                                    setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                  }}
                                  placeholder="Option name (e.g., Small, Red, Cotton)"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                />
                                
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-600">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={option.additional_price}
                                    onChange={(e) => {
                                      const newGroups = [...formData.option_groups];
                                      const newOptions = [...group.options];
                                      newOptions[optionIndex] = { ...option, additional_price: parseFloat(e.target.value) || 0 };
                                      newGroups[groupIndex] = { ...group, options: newOptions };
                                      setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                    }}
                                    placeholder="0.00"
                                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  />
                                </div>
                                
                                <div className="flex items-center">
                                  <label className="inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={option.available}
                                      onChange={(e) => {
                                        const newGroups = [...formData.option_groups];
                                        const newOptions = [...group.options];
                                        newOptions[optionIndex] = { ...option, available: e.target.checked };
                                        newGroups[groupIndex] = { ...group, options: newOptions };
                                        setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    <span className="ms-2 text-sm font-medium text-gray-700 min-w-[80px]">
                                      {option.available ? "Available" : "Unavailable"}
                                    </span>
                                  </label>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGroups = [...formData.option_groups];
                                    const newOptions = group.options.filter((_, i) => i !== optionIndex);
                                    newGroups[groupIndex] = { ...group, options: newOptions };
                                    setFormData(prev => ({ ...prev, option_groups: newGroups }));
                                  }}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove option"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newGroups = [...formData.option_groups];
                                const newOptions = [...group.options, {
                                  name: '',
                                  additional_price: 0,
                                  available: true,
                                  position: group.options.length
                                }];
                                newGroups[groupIndex] = { ...group, options: newOptions };
                                setFormData(prev => ({ ...prev, option_groups: newGroups }));
                              }}
                              className="mt-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                            >
                              + Add Option
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              option_groups: [...prev.option_groups, {
                                name: '',
                                min_select: 1,
                                max_select: 1,
                                required: true,
                                position: prev.option_groups.length,
                                enable_inventory_tracking: false,
                                options: []
                              }]
                            }));
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          + Add Another Option Group
                        </button>
                        
                        <div className="flex justify-between items-center">
                          {presets.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowPresetSelector(true)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              📋 Use Preset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowPresetManager(true)}
                            className="text-teal-600 hover:text-teal-800 font-medium text-sm ml-auto"
                          >
                            ⚙️ Manage Presets
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Legacy Option Groups section removed - now using inline option groups above */}
              
              {/* Removed SKU Preview section - using option groups instead */}

              {/* Inventory Management - Temporarily disabled until full inventory system is ready */}
              {/* 
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Inventory Management</h4>
                <div className="space-y-4">
                  {/* Track Inventory Toggle */}
                  {/*
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="track_inventory"
                      checked={formData.track_inventory}
                      onChange={(e) => setFormData(prev => ({ ...prev, track_inventory: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="track_inventory" className="text-sm font-medium text-gray-700">
                      Enable Stock Tracking
                    </label>
                  </div>

                  {/* Allow Sale with No Stock Toggle - only show when track_inventory is enabled */}
                  {/*
                  {formData.track_inventory && (
                    <div className="flex items-center space-x-3 ml-6">
                      <input
                        type="checkbox"
                        id="allow_sale_with_no_stock"
                        checked={formData.allow_sale_with_no_stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, allow_sale_with_no_stock: e.target.checked }))}
                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <label htmlFor="allow_sale_with_no_stock" className="text-sm font-medium text-gray-700">
                        Allow Sale with No Stock (Pre-orders)
                      </label>
                    </div>
                  )}

                  {/* Stock Quantity and Threshold - only show when track_inventory is enabled */}
                  {/*
                  {formData.track_inventory && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Low Stock Threshold
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.low_stock_threshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 5 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="5"
                        />
                      </div>
                    </div>
                  )}

                  {/* Explanation text */}
                  {/*
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Stock Tracking:</strong> When enabled, you can track inventory levels for this item.
                    </p>
                    {formData.track_inventory && (
                      <p className="text-sm text-blue-800 mt-2">
                        <strong>Allow Sale with No Stock:</strong> When enabled, customers can purchase this item even when stock is 0 (useful for pre-orders and fundraisers).
                      </p>
                    )}
                  </div>
                </div>
              </div>
              */}

              {/* Image Upload */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Product Images</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Upload up to 4 images (JPEG, PNG, WebP)</p>
                    <span className="text-xs text-gray-500">{existingImages.length + selectedImages.length}/4 uploaded</span>
                  </div>

                  {/* Image Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Upload product images
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            Or drag and drop files here
                          </span>
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageSelect}
                          disabled={existingImages.length + selectedImages.length >= 4}
                        />
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          disabled={existingImages.length + selectedImages.length >= 4}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Image className="w-4 h-4 mr-1" />
                          Choose Images
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Image Previews */}
                  {(existingImages.length > 0 || selectedImages.length > 0) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Existing Images */}
                      {existingImages.map((image, index) => (
                        <div key={`existing-${image.id}`} className="relative group">
                          <div 
                            className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all ${
                              image.primary 
                                ? 'ring-2 ring-blue-500 ring-offset-2' 
                                : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                            }`}
                            onClick={() => !image.primary && setPrimaryImage(image.id)}
                            title={image.primary ? 'Primary image' : 'Click to make primary'}
                          >
                            <img
                              src={image.image_url}
                              alt={image.alt_text}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeExistingImage(image.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-white hover:text-red-300 transition-opacity"
                              >
                                <X className="w-6 h-6" />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2">
                              <span className={`inline-block px-2 py-1 text-xs font-medium text-white rounded ${
                                image.primary ? 'bg-blue-600' : 'bg-green-600'
                              }`}>
                                {image.primary ? 'Primary' : 'Saved'}
                              </span>
                            </div>
                            {!image.primary && (
                              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                  Click to make primary
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-1 text-center">
                            <span className={`text-xs ${image.primary ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                              {image.primary ? 'Primary' : `Image ${index + 1}`}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* New Selected Images */}
                      {selectedImages.map((image, index) => {
                        const actualIndex = existingImages.length + index;
                        return (
                          <div key={image.id} className="relative group">
                            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={image.preview}
                                alt={`Preview ${actualIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => removeImage(image.id)}
                                  className="opacity-0 group-hover:opacity-100 text-white hover:text-red-300 transition-opacity"
                                >
                                  <X className="w-6 h-6" />
                                </button>
                              </div>
                              <div className="absolute top-2 left-2">
                                <span className="inline-block px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded">
                                  New
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-center">
                              <span className="text-xs text-gray-500">
                                {actualIndex === 0 && existingImages.length === 0 ? 'Primary' : `Image ${actualIndex + 1}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  disabled={imageUploading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {imageUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading Images...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isCreating ? 'Create Item' : 'Update Item'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Selector Modal */}
      {showPresetSelector && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Choose Option Group Preset
              </h3>
              <button
                onClick={() => setShowPresetSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {presetsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No presets available yet.</p>
                <p className="text-sm text-gray-400">Create presets in the admin panel to reuse option groups across items.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{preset.name}</h4>
                        {preset.description && (
                          <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{preset.option_presets_count} options</span>
                          <span>Min: {preset.min_select}, Max: {preset.max_select}</span>
                          {preset.required && <span className="text-orange-600">Required</span>}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex flex-wrap gap-1">
                          {preset.option_presets.slice(0, 3).map((option, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {option.name}
                            </span>
                          ))}
                          {preset.option_presets.length > 3 && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              +{preset.option_presets.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {presets.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No presets available yet. Create your first preset to get started!
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  setShowPresetSelector(false);
                  setShowPresetManager(true);
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                ⚙️ Manage Presets
              </button>
              <button
                onClick={() => setShowPresetSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Manager Modal */}
      {showPresetManager && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-md bg-white min-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Manage Option Group Presets
              </h3>
              <button
                onClick={() => {
                  setShowPresetManager(false);
                  loadPresets(); // Reload presets when closing to reflect any changes
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <PresetManager 
              restaurantId={restaurantId} 
              onDataChange={() => {
                loadPresets(); // Reload presets when data changes
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Removed VariantsSection - using option groups instead

// Cleaned up - removed duplicate OptionGroupsSection

// Legacy Option Groups Management Component - REMOVED
// This section has been replaced by the inline option groups system above

// Default export for backward compatibility
export default ItemManager;
