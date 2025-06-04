// src/ordering/wholesale/components/admin/FundraiserItemManager.tsx

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Search, X, Upload, DollarSign, Settings } from 'lucide-react';
import { Button, Input } from '../../../../shared/components/ui';
import { FundraiserItem, ItemsResponse } from '../../types/fundraiserItem';
import toastUtils from '../../../../shared/utils/toastUtils';
import axios from 'axios';
import FundraiserItemOptionGroupsModal from './FundraiserItemOptionGroupsModal';

import { getRequestHeaders } from '../../../../shared/utils/authUtils';

// Define API URL constant
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface FundraiserItemManagerProps {
  fundraiserId: number;
  fundraiserName?: string;
}

const FundraiserItemManager: React.FC<FundraiserItemManagerProps> = ({ fundraiserId, fundraiserName }) => {
  // State for items
  const [items, setItems] = useState<FundraiserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  // Track total count for potential future use in UI
  const [_totalCount, setTotalCount] = useState(0);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<FundraiserItem | null>(null);
  
  // State for options modal
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [optionsModalItem, setOptionsModalItem] = useState<FundraiserItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0.00',
    image_url: '',
    active: true,
    enable_stock_tracking: false,
    stock_quantity: '0',
    low_stock_threshold: '0'
  });
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Load items
  useEffect(() => {
    if (fundraiserId) {
      fetchItems();
    }
  }, [fundraiserId, page, activeFilter]);
  
  // Handle opening the options modal for an item
  const handleManageOptions = (item: FundraiserItem) => {
    setOptionsModalItem(item);
    setIsOptionsModalOpen(true);
  };
  
  // Refresh items after options have been updated
  const handleOptionsUpdated = () => {
    fetchItems();
  };
  
  // Fetch items from API
  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page,
        per_page: perPage,
        active: activeFilter === 'active' ? true : (activeFilter === 'inactive' ? false : undefined),
        search: searchTerm || undefined
      };
      
      const headers = getRequestHeaders();
      const response = await axios.get(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items`,
        { headers, params }
      );
      
      const data = response.data as ItemsResponse;
      setItems(data.items);
      setTotalCount(data.total_count);
      setTotalPages(data.total_pages);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items. Please try again.');
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
    fetchItems();
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveFilter(e.target.value as 'all' | 'active' | 'inactive');
    setPage(1);
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Open modal for creating a new item
  const handleCreateNew = () => {
    setCurrentItem(null);
    setFormData({
      name: '',
      description: '',
      price: '0.00',
      image_url: '',
      active: true,
      enable_stock_tracking: false,
      stock_quantity: '0',
      low_stock_threshold: '0'
    });
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };
  
  // Open modal for editing an existing item
  const handleEdit = (item: FundraiserItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '0.00',
      image_url: item.image_url || '',
      active: item.active !== undefined ? item.active : true,
      enable_stock_tracking: item.enable_stock_tracking !== undefined ? item.enable_stock_tracking : false,
      stock_quantity: item.stock_quantity?.toString() || '0',
      low_stock_threshold: item.low_stock_threshold?.toString() || '0'
    });
    setPreviewUrl(item.image_url || null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else if (name === 'price') {
      // Ensure price is a valid number
      const numericValue = value.replace(/[^0-9.]/g, '');
      setFormData({
        ...formData,
        [name]: numericValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      try {
        // Convert file to base64 for preview and later submission
        const base64String = await fileToBase64(file);
        setPreviewUrl(base64String);
      } catch (error) {
        console.error('Error converting file to base64:', error);
        toastUtils.error('Failed to process image');
      }
    }
  };
  
  // Convert file to base64 for preview and sending to server
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '0.00',
      image_url: '',
      active: true,
      enable_stock_tracking: false,
      stock_quantity: '0',
      low_stock_threshold: '0'
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setCurrentItem(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.price) {
      toastUtils.error('Name and price are required fields.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object for file uploads
      const formDataObj = new FormData();
      
      // Add basic form fields
      formDataObj.append('item[name]', formData.name);
      formDataObj.append('item[description]', formData.description || '');
      formDataObj.append('item[price]', parseFloat(formData.price).toString());
      formDataObj.append('item[active]', formData.active ? 'true' : 'false');
      // Don't need to send fundraiser_id as it's already in the URL
      
      // Add stock tracking fields if they exist
      formDataObj.append('item[enable_stock_tracking]', formData.enable_stock_tracking ? 'true' : 'false');
      
      // Only send stock_quantity if stock tracking is enabled
      if (formData.enable_stock_tracking) {
        // Convert to integer to ensure valid format
        const stockQuantity = parseInt(formData.stock_quantity) || 0;
        formDataObj.append('item[stock_quantity]', stockQuantity.toString());
        
        // Convert to integer to ensure valid format
        const lowStockThreshold = parseInt(formData.low_stock_threshold) || 5;
        formDataObj.append('item[low_stock_threshold]', lowStockThreshold.toString());
      }
      
      // Add image if selected
      if (selectedFile) {
        formDataObj.append('item[image]', selectedFile);
      } else if (formData.image_url) {
        formDataObj.append('item[image_url]', formData.image_url);
      }
      
      // Set headers for multipart/form-data
      const headers = {
        ...getRequestHeaders(),
        'Content-Type': 'multipart/form-data'
      };
      
      if (currentItem && currentItem.id) {
        // Update existing item
        await axios.put(
          `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${currentItem.id}`,
          formDataObj,
          { headers }
        );
        toastUtils.success('Item updated successfully!');
      } else {
        // Create new item
        await axios.post(
          `${API_URL}/wholesale/fundraisers/${fundraiserId}/items`,
          formDataObj,
          { headers }
        );
        toastUtils.success('Item created successfully!');
      }
      
      // Reset form and close modal
      resetForm();
      setIsModalOpen(false);
      
      // Refresh item list
      fetchItems();
    } catch (err) {
      console.error('Error saving item:', err);
      toastUtils.error('Failed to save item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete item
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        const headers = getRequestHeaders();
        await axios.delete(
          `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${id}`,
          { headers }
        );
        toastUtils.success('Item deleted successfully!');
        fetchItems();
      } catch (err) {
        console.error('Error deleting item:', err);
        toastUtils.error('Failed to delete item. Please try again.');
      }
    }
  };
  
  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {fundraiserName ? `Items for ${fundraiserName}` : 'Fundraiser Items'}
        </h2>
        <Button 
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
        >
          <PlusCircle size={18} className="mr-2" />
          Add New Item
        </Button>
      </div>
      
      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearchSubmit} className="flex">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 w-full"
              />
            </div>
            <Button 
              type="submit"
              className="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Search
            </Button>
          </form>
        </div>
        
        <div className="md:w-48">
          <select
            value={activeFilter}
            onChange={handleStatusFilterChange}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
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
          <p className="mt-2 text-gray-600">Loading items...</p>
        </div>
      ) : (
        <>
          {/* Item list */}
          {items.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded text-center">
              <p className="text-gray-600">No items found. Add your first item to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="h-10 w-10 object-cover rounded-full mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center text-gray-500 text-xs">No Image</div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Item"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleManageOptions(item)}
                            className="text-green-600 hover:text-green-800"
                            title="Manage Options"
                          >
                            <Settings size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination controls */}
          {items.length > 0 && totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-100 disabled:opacity-50"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <Button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 ${pageNum === page ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-100 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      
      {/* Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">{currentItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name*</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Price*</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign size={16} className="text-gray-400" />
                    </div>
                    <Input
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="pl-8 w-full"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Image</label>
                  {previewUrl && (
                    <div className="mb-2">
                      <img src={previewUrl} alt="Preview" className="h-40 object-contain" />
                    </div>
                  )}
                  <div className="flex items-center">
                    <label className="cursor-pointer bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 inline-flex items-center">
                      <Upload size={16} className="mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="ml-2 text-sm text-gray-500">
                      {selectedFile ? selectedFile.name : 'No file chosen'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (currentItem ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Options Modal */}
      {isOptionsModalOpen && optionsModalItem && (
        <FundraiserItemOptionGroupsModal
          item={optionsModalItem}
          onClose={() => setIsOptionsModalOpen(false)}
          onUpdate={handleOptionsUpdated}
        />
      )}
    </div>
  );
};

export default FundraiserItemManager;
