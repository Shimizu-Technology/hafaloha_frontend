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
  options: {
    size_options: string[];
    color_options: string[];
    custom_fields: { [key: string]: any };
  };
  custom_variant_skus?: { [key: number]: string };
}

interface PreviewVariant {
  size?: string;
  color?: string;
  sku: string;
  isCustom: boolean;
}

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
    options: {
      size_options: [],
      color_options: [],
      custom_fields: {}
    }
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
  const [previewVariants, setPreviewVariants] = useState<PreviewVariant[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadData();
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

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setPreviewVariants([]);
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
      options: {
        size_options: [],
        color_options: [],
        custom_fields: {}
      }
    });
  };

  const handleEdit = (item: WholesaleItem) => {
    try {
      console.log('handleEdit called with item:', item);
      
      setIsCreating(false);
      setEditingId(item.id);
      
      // Ensure options object exists with proper structure
      const safeOptions = {
        size_options: item.options?.size_options || [],
        color_options: item.options?.color_options || [],
        custom_fields: item.options?.custom_fields || {}
      };
      
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
        options: safeOptions
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

      // Prepare item data with custom SKUs if creating
      const itemData = { ...formData };
      if (isCreating && previewVariants.length > 0) {
        // Add custom SKUs for variants
        itemData.custom_variant_skus = previewVariants.reduce((acc, variant, index) => {
          if (variant.isCustom) {
            acc[index] = variant.sku;
          }
          return acc;
        }, {} as { [key: number]: string });
      }

      if (selectedImages.length > 0 || imagesToDelete.length > 0) {
        // Use FormData for image uploads/deletions (both new items and existing items with image changes)
        const formDataToSend = new FormData();
        
        // Add all form fields
        Object.keys(itemData).forEach(key => {
          const value = itemData[key as keyof typeof itemData];
          if (key === 'options' || key === 'custom_variant_skus') {
            formDataToSend.append(`item[${key}]`, JSON.stringify(value));
          } else {
            formDataToSend.append(`item[${key}]`, String(value));
          }
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
      if (isCreating) {
        await apiClient.post('/wholesale/admin/items', requestData, requestConfig);
        toastUtils.success('Item created successfully!');
      } else {
        await apiClient.patch(`/wholesale/admin/items/${editingId}`, requestData, requestConfig);
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
      setPreviewVariants([]);
      
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

  // Generate preview variants based on current form data
  const generatePreviewVariants = (): PreviewVariant[] => {
    const variants: PreviewVariant[] = [];
    const baseSku = formData.sku.toUpperCase();
    const sizes = formData.options.size_options;
    const colors = formData.options.color_options;
    
    if (sizes.length > 0 && colors.length > 0) {
      // Both sizes and colors
      for (const color of colors) {
        for (const size of sizes) {
          const colorCode = color.substring(0, 3).toUpperCase();
          const sizeCode = size.replace(/\s+/g, '').toUpperCase();
          variants.push({
            size,
            color,
            sku: `${baseSku}-${colorCode}-${sizeCode}`,
            isCustom: false
          });
        }
      }
    } else if (sizes.length > 0) {
      // Only sizes
      for (const size of sizes) {
        const sizeCode = size.replace(/\s+/g, '').toUpperCase();
        variants.push({
          size,
          sku: `${baseSku}-${sizeCode}`,
          isCustom: false
        });
      }
    } else if (colors.length > 0) {
      // Only colors
      for (const color of colors) {
        const colorCode = color.substring(0, 3).toUpperCase();
        variants.push({
          color,
          sku: `${baseSku}-${colorCode}`,
          isCustom: false
        });
      }
    }
    
    return variants;
  };

  // Update preview variants when form data changes
  const updatePreviewVariants = () => {
    const newVariants = generatePreviewVariants();
    
    // Preserve custom SKUs where possible
    const updatedVariants = newVariants.map(newVariant => {
      const existingVariant = previewVariants.find(existing => 
        existing.size === newVariant.size && existing.color === newVariant.color
      );
      
      if (existingVariant && existingVariant.isCustom) {
        return existingVariant; // Keep custom SKU
      }
      
      return newVariant; // Use auto-generated SKU
    });
    
    setPreviewVariants(updatedVariants);
  };

  // Update preview variants when relevant form data changes
  useEffect(() => {
    if (isCreating && (formData.sku || formData.options.size_options.length > 0 || formData.options.color_options.length > 0)) {
      updatePreviewVariants();
    }
  }, [formData.sku, formData.options.size_options, formData.options.color_options, isCreating]);

  // Update a specific variant's SKU
  const updateVariantSku = (index: number, newSku: string) => {
    setPreviewVariants(prev => prev.map((variant, i) => 
      i === index 
        ? { ...variant, sku: newSku.toUpperCase(), isCustom: true }
        : variant
    ));
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
                      Base SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter base SKU (e.g., TSHIRT-DESIGN1)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Individual variant SKUs will be generated automatically (e.g., TSHIRT-DESIGN1-BLK-L)
                    </p>
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

              {/* Product Options */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Product Options</h4>
                <div className="space-y-4">
                  {/* Size Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.options.size_options.map((size, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {size}
                          <button
                            type="button"
                            onClick={() => {
                              const newSizes = formData.options.size_options.filter((_, i) => i !== index);
                              setFormData(prev => ({
                                ...prev,
                                options: { ...prev.options, size_options: newSizes }
                              }));
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter size (e.g., S, M, L, XL)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !formData.options.size_options.includes(value)) {
                              setFormData(prev => ({
                                ...prev,
                                options: { 
                                  ...prev.options, 
                                  size_options: [...prev.options.size_options, value] 
                                }
                              }));
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value && !formData.options.size_options.includes(value)) {
                            setFormData(prev => ({
                              ...prev,
                              options: { 
                                ...prev.options, 
                                size_options: [...prev.options.size_options, value] 
                              }
                            }));
                            input.value = '';
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Add sizes like S, M, L, XL or dimensions like 12", 14", 16"
                    </p>
                  </div>

                  {/* Color Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Colors
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.options.color_options.map((color, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-green-100 text-green-800"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={() => {
                              const newColors = formData.options.color_options.filter((_, i) => i !== index);
                              setFormData(prev => ({
                                ...prev,
                                options: { ...prev.options, color_options: newColors }
                              }));
                            }}
                            className="ml-1 text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter color (e.g., Red, Blue, Navy)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !formData.options.color_options.includes(value)) {
                              setFormData(prev => ({
                                ...prev,
                                options: { 
                                  ...prev.options, 
                                  color_options: [...prev.options.color_options, value] 
                                }
                              }));
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value && !formData.options.color_options.includes(value)) {
                            setFormData(prev => ({
                              ...prev,
                              options: { 
                                ...prev.options, 
                                color_options: [...prev.options.color_options, value] 
                              }
                            }));
                            input.value = '';
                          }
                        }}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Add color options for this item
                    </p>
                    
                    {/* Quick Color Presets */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Color Presets
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              options: { 
                                ...prev.options, 
                                color_options: ['Red', 'Black', 'White'] 
                              }
                            }));
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Basic Colors
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              options: { 
                                ...prev.options, 
                                color_options: ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Black', 'White'] 
                              }
                            }));
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Rainbow Colors
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const customColors = prompt('Enter custom colors separated by commas (e.g., Navy, Maroon, Gold):');
                            if (customColors) {
                              const colorsArray = customColors.split(',').map(c => c.trim()).filter(c => c.length > 0);
                              if (colorsArray.length > 0) {
                                setFormData(prev => ({
                                  ...prev,
                                  options: { 
                                    ...prev.options, 
                                    color_options: colorsArray 
                                  }
                                }));
                              }
                            }
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Custom Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              options: { 
                                ...prev.options, 
                                color_options: [] 
                              }
                            }));
                          }}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Clear Colors
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Size Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Size Presets
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            options: { 
                              ...prev.options, 
                              size_options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] 
                            }
                          }));
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        T-Shirt Sizes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            options: { 
                              ...prev.options, 
                              size_options: ['Youth S', 'Youth M', 'Youth L', 'Adult S', 'Adult M', 'Adult L', 'Adult XL'] 
                            }
                          }));
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Youth + Adult
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            options: { 
                              ...prev.options, 
                              size_options: ['XYS', 'YS', 'YM', 'YL', 'YXL', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] 
                            }
                          }));
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        All Sizes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const customSizes = prompt('Enter custom sizes separated by commas (e.g., XS, S, M, L, XL):');
                          if (customSizes) {
                            const sizesArray = customSizes.split(',').map(s => s.trim()).filter(s => s.length > 0);
                            if (sizesArray.length > 0) {
                              setFormData(prev => ({
                                ...prev,
                                options: { 
                                  ...prev.options, 
                                  size_options: sizesArray 
                                }
                              }));
                            }
                          }
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Custom Preset
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            options: { 
                              ...prev.options, 
                              size_options: [] 
                            }
                          }));
                        }}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Clear Sizes
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants Management */}
              {!isCreating && editingId !== null && (
                <VariantsSection 
                  item={items.find(item => item.id === editingId)} 
                  onVariantUpdate={() => {
              try {
                loadData();
                onDataChange?.();
              } catch (err) {
                console.warn('Error in onDataChange callback:', err);
              }
            }}
                />
              )}
              
              {/* Editable SKU Preview for New Items */}
              {isCreating && previewVariants.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Variant SKUs Preview</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">
                      <strong>Preview:</strong> The following SKUs will be generated. Click any SKU to customize it:
                    </p>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {previewVariants.map((variant, index) => (
                        <div key={index} className="flex items-center space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                              {variant.size && <span className="bg-gray-100 px-2 py-1 rounded text-xs">Size: {variant.size}</span>}
                              {variant.color && <span className="bg-gray-100 px-2 py-1 rounded text-xs">Color: {variant.color}</span>}
                              {variant.isCustom && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Custom</span>}
                            </div>
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => updateVariantSku(index, e.target.value)}
                              className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter custom SKU"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-600">
                        Total variants to create: {previewVariants.length}
                      </p>
                      <button
                        type="button"
                        onClick={updatePreviewVariants}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Reset to auto-generated SKUs
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={image.image_url}
                              alt={image.alt_text}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removeExistingImage(image.id)}
                                className="opacity-0 group-hover:opacity-100 text-white hover:text-red-300 transition-opacity"
                              >
                                <X className="w-6 h-6" />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2">
                              <span className="inline-block px-2 py-1 text-xs font-medium text-white bg-green-600 rounded">
                                Saved
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 text-center">
                            <span className="text-xs text-gray-500">
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
    </div>
  );
}

// Variants Management Component
interface VariantsSectionProps {
  item?: WholesaleItem;
  onVariantUpdate: () => void;
}

function VariantsSection({ item, onVariantUpdate }: VariantsSectionProps) {
  const [editingVariant, setEditingVariant] = useState<WholesaleItemVariant | null>(null);
  const [variantFormData, setVariantFormData] = useState({
    sku: '',
    price_adjustment: 0,
    stock_quantity: 0,
    low_stock_threshold: 5,
    active: true
  });

  if (!item || !item.has_variants || !item.variants || item.variants.length === 0) {
    return (
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Product Variants</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            No variants found. Variants are automatically created when you add size or color options to an item.
          </p>
        </div>
      </div>
    );
  }

  const handleEditVariant = (variant: WholesaleItemVariant) => {
    setEditingVariant(variant);
    setVariantFormData({
      sku: variant.sku,
      price_adjustment: variant.price_adjustment,
      stock_quantity: variant.stock_quantity,
      low_stock_threshold: variant.low_stock_threshold,
      active: variant.active
    });
  };

  const handleSaveVariant = async () => {
    if (!editingVariant) return;

    try {
      await apiClient.patch(`/wholesale/admin/items/${item.id}/variants/${editingVariant.id}`, {
        variant: variantFormData
      });
      
      toastUtils.success('Variant updated successfully!');
      setEditingVariant(null);
      onVariantUpdate();
    } catch (error) {
      console.error('Error updating variant:', error);
      toastUtils.error('Failed to update variant');
    }
  };

  const handleCancelEdit = () => {
    setEditingVariant(null);
  };

  return (
    <div>
      <h4 className="text-md font-medium text-gray-900 mb-4">Product Variants</h4>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Manage individual variants for this item. Each variant has its own SKU and can have different pricing and stock levels.
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {item.variants.map((variant) => (
            <div key={variant.id} className="p-4">
              {editingVariant?.id === variant.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{variant.sku}</h5>
                      <p className="text-sm text-gray-500">{variant.display_name}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveVariant}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  
                  {/* SKU Field */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={variantFormData.sku}
                      onChange={(e) => setVariantFormData(prev => ({ 
                        ...prev, 
                        sku: e.target.value.toUpperCase() 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="Enter custom SKU"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      SKU must be unique across all variants
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Adjustment ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={variantFormData.price_adjustment}
                        onChange={(e) => setVariantFormData(prev => ({ 
                          ...prev, 
                          price_adjustment: parseFloat(e.target.value) || 0 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {item.track_inventory && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variantFormData.stock_quantity}
                            onChange={(e) => setVariantFormData(prev => ({ 
                              ...prev, 
                              stock_quantity: parseInt(e.target.value) || 0 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Low Stock Threshold
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variantFormData.low_stock_threshold}
                            onChange={(e) => setVariantFormData(prev => ({ 
                              ...prev, 
                              low_stock_threshold: parseInt(e.target.value) || 5 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`variant-active-${variant.id}`}
                      checked={variantFormData.active}
                      onChange={(e) => setVariantFormData(prev => ({ 
                        ...prev, 
                        active: e.target.checked 
                      }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`variant-active-${variant.id}`} className="ml-2 text-sm text-gray-700">
                      Active (available for purchase)
                    </label>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h5 className="font-medium text-gray-900">{variant.sku}</h5>
                        <p className="text-sm text-gray-500">{variant.display_name}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">
                          Price: <span className="font-medium">${Number(variant.final_price).toFixed(2)}</span>
                          {variant.price_adjustment !== 0 && (
                            <span className="text-blue-600 ml-1">
                              ({variant.price_adjustment > 0 ? '+' : ''}${Number(variant.price_adjustment).toFixed(2)})
                            </span>
                          )}
                        </span>
                        
                        {item.track_inventory && (
                          <span className="text-gray-600">
                            Stock: <span className="font-medium">{variant.stock_quantity}</span>
                          </span>
                        )}
                        
                        <span className="text-gray-600">
                          Sold: <span className="font-medium">{variant.total_ordered}</span>
                        </span>
                        
                        <span className="text-gray-600">
                          Revenue: <span className="font-medium">${Number(variant.total_revenue).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      variant.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {variant.active ? 'Active' : 'Inactive'}
                    </span>
                    
                    <button
                      onClick={() => handleEditVariant(variant)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Total variants: {item.variants.length} | 
            Active: {item.variants.filter(v => v.active).length} | 
            Total sold: {item.variants.reduce((sum, v) => sum + v.total_ordered, 0)} | 
            Total revenue: ${item.variants.reduce((sum, v) => sum + Number(v.total_revenue), 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ItemManager;