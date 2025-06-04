// src/ordering/wholesale/components/admin/FundraiserManager.tsx

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Search, X, Upload, Package, Users, ShoppingBag } from 'lucide-react';
import { Button, Input } from '../../../../shared/components/ui';
import { Fundraiser } from '../../types/fundraiser';
import fundraiserService from '../../services/fundraiserService';
import toastUtils from '../../../../shared/utils/toastUtils';
import FundraiserItemManager from './FundraiserItemManager';
import ParticipantManager from './ParticipantManager';
import FundraiserOrderManager from './FundraiserOrderManager';

interface FormData {
  name: string;
  slug: string;
  description: string;
  banner_image_url: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  featured: boolean;
  no_end_date: boolean;
  order_code: string;
}

interface FundraiserManagerProps {
  restaurantId?: number;
}

const FundraiserManager: React.FC<FundraiserManagerProps> = ({ restaurantId }) => {
  // State for fundraisers
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFundraiser, setCurrentFundraiser] = useState<Fundraiser | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    description: '',
    banner_image_url: '',
    start_date: null,
    end_date: null,
    active: true,
    featured: false,
    no_end_date: false,
    order_code: ''
  });
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // State for managing items, participants, and orders
  const [managingItemsForFundraiser, setManagingItemsForFundraiser] = useState<Fundraiser | null>(null);
  const [managingParticipantsForFundraiser, setManagingParticipantsForFundraiser] = useState<Fundraiser | null>(null);
  const [managingOrdersForFundraiser, setManagingOrdersForFundraiser] = useState<Fundraiser | null>(null);
  
  // Load fundraisers
  useEffect(() => {
    fetchFundraisers();
  }, [restaurantId]);
  
  // Fetch fundraisers from API
  const fetchFundraisers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params: any = {
        active: statusFilter === 'active' ? true : (statusFilter === 'inactive' ? false : undefined),
        search: searchTerm || undefined
      };
      
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const response = await fundraiserService.getFundraisers(params);
      setFundraisers(response.fundraisers as Fundraiser[]);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching fundraisers:', err);
      setError('Failed to load fundraisers. Please try again.');
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
    fetchFundraisers();
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
    fetchFundraisers();
  };
  
  // Open modal for creating a new fundraiser
  const handleCreateNew = () => {
    setCurrentFundraiser(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      banner_image_url: '',
      start_date: null,
      end_date: null,
      active: true,
      featured: false,
      no_end_date: false,
      order_code: ''
    });
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };
  
  // Open modal for editing an existing fundraiser
  const handleEdit = (fundraiser: Fundraiser) => {
    setCurrentFundraiser(fundraiser);
    setFormData({
      name: fundraiser.name,
      slug: fundraiser.slug,
      description: fundraiser.description || '',
      banner_image_url: fundraiser.banner_image_url || '',
      start_date: fundraiser.start_date ? new Date(fundraiser.start_date).toISOString().split('T')[0] : null,
      end_date: fundraiser.end_date ? new Date(fundraiser.end_date).toISOString().split('T')[0] : null,
      active: fundraiser.active,
      featured: fundraiser.featured || false,
      no_end_date: fundraiser.end_date === null,
      order_code: fundraiser.order_code || ''
    });
    setPreviewUrl(fundraiser.banner_image_url || null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      
      // Special handling for no_end_date checkbox
      if (name === 'no_end_date') {
        setFormData({
          ...formData,
          [name]: target.checked,
          // Clear end_date when no_end_date is checked
          end_date: target.checked ? null : formData.end_date
        });
      } else {
        setFormData({
          ...formData,
          [name]: target.checked
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Generate slug from name if slug is empty
    if (name === 'name' && !formData.slug) {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }));
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // No need for a separate upload function as we'll pass the file directly to the API
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      banner_image_url: '',
      active: true,
      featured: false,
      start_date: null,
      end_date: null,
      no_end_date: false,
      order_code: ''
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setCurrentFundraiser(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.slug) {
      toastUtils.error('Name and slug are required fields.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for API submission
      const preparedData: {
        name: string;
        slug: string;
        description: string;
        banner_image_url?: string;
        start_date: string | null;
        end_date: string | null;
        active: boolean;
        featured: boolean;
        image?: File;
        restaurant_id?: number;
        order_code?: string;
      } = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        banner_image_url: formData.banner_image_url,
        start_date: formData.start_date,
        // If no_end_date is checked, always send null for end_date
        end_date: formData.no_end_date ? null : formData.end_date,
        active: formData.active,
        featured: formData.featured,
        order_code: formData.order_code.trim() || undefined
      };
      
      // Add restaurant_id if available
      if (restaurantId) {
        preparedData.restaurant_id = restaurantId;
      }
      
      // If a file is selected, we'll add it to the form data
      // but we won't set banner_image_url - the backend will handle that
      if (selectedFile) {
        // Don't set banner_image_url directly, as it would send the base64 data
        // Instead, we'll set the image field which the backend expects
        // The backend will handle uploading to S3 and setting the proper banner_image_url
        preparedData.image = selectedFile;
        
        // Ensure we're not sending the base64 preview URL as banner_image_url
        delete preparedData.banner_image_url;
      }
      
      if (currentFundraiser && currentFundraiser.id) {
        // Update existing fundraiser
        await fundraiserService.updateFundraiser(currentFundraiser.id, preparedData);
        toastUtils.success('Fundraiser updated successfully!');
      } else {
        // Create new fundraiser
        await fundraiserService.createFundraiser(preparedData);
        toastUtils.success('Fundraiser created successfully!');
      }
      
      // Reset form and close modal
      resetForm();
      setIsModalOpen(false);
      
      // Refresh fundraiser list
      fetchFundraisers();
    } catch (err) {
      console.error('Error saving fundraiser:', err);
      toastUtils.error('Failed to save fundraiser. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete fundraiser
  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this fundraiser? This action cannot be undone.')) {
      try {
        await fundraiserService.deleteFundraiser(id);
        toastUtils.success('Fundraiser deleted successfully!');
        fetchFundraisers();
      } catch (err) {
        console.error('Error deleting fundraiser:', err);
        toastUtils.error('Failed to delete fundraiser. Please try again.');
      }
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fundraiser Management</h1>
        <Button 
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
        >
          <PlusCircle size={18} className="mr-2" />
          Create New Fundraiser
        </Button>
      </div>
      
      {/* Search and filter */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <form onSubmit={handleSearchSubmit} className="flex">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search fundraisers..."
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
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
          <p className="mt-2 text-gray-600">Loading fundraisers...</p>
        </div>
      ) : (
        <>
          {/* Fundraiser list */}
          {fundraisers.length === 0 ? (
            <div className="bg-white p-8 rounded shadow text-center">
              <p className="text-gray-600">No fundraisers found. Create your first fundraiser to get started!</p>
            </div>
          ) : (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fundraisers.map((fundraiser) => (
                    <tr key={fundraiser.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {fundraiser.banner_image_url ? (
                            <img 
                              src={fundraiser.banner_image_url} 
                              alt={fundraiser.name} 
                              className="h-10 w-16 object-cover rounded mr-3"
                            />
                          ) : (
                            <div className="h-10 w-16 bg-gray-200 rounded mr-3 flex items-center justify-center text-gray-500 text-xs">No Image</div>
                          )}
                          <div className="font-medium text-gray-900">{fundraiser.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fundraiser.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${fundraiser.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {fundraiser.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Start: {formatDate(fundraiser.start_date)}</div>
                        <div>End: {formatDate(fundraiser.end_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(fundraiser)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit Fundraiser"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setManagingItemsForFundraiser(fundraiser)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Manage Items"
                        >
                          <Package size={18} />
                        </button>
                        <button
                          onClick={() => setManagingParticipantsForFundraiser(fundraiser)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="Manage Participants"
                        >
                          <Users size={18} />
                        </button>
                        <button
                          onClick={() => setManagingOrdersForFundraiser(fundraiser)}
                          className="text-amber-600 hover:text-amber-900 mr-3"
                          title="Manage Orders"
                        >
                          <ShoppingBag size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(fundraiser.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Fundraiser"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      
      {/* Modal for creating/editing fundraiser */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {currentFundraiser ? 'Edit Fundraiser' : 'Create New Fundraiser'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <Input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Code</label>
                <div>
                  <Input
                    type="text"
                    name="order_code"
                    value={formData.order_code}
                    onChange={handleInputChange}
                    placeholder="Enter a unique code (1-6 characters)"
                    className="w-full md:w-1/3"
                    maxLength={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This code will be used to identify orders from this fundraiser (e.g., "F1", "TEAM"). Leave blank for auto-generation.
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleInputChange}
                    className="w-full"
                    disabled={formData.no_end_date}
                  />
                  <div className="mt-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="no_end_date"
                        checked={formData.no_end_date}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">No End Date (indefinite fundraiser)</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mb-4 flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Featured</span>
                </label>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
                {previewUrl && (
                  <div className="mb-2">
                    <img src={previewUrl} alt="Preview" className="h-40 object-cover rounded" />
                  </div>
                )}
                <div className="flex items-center">
                  <label className="cursor-pointer bg-white border border-gray-300 rounded-md py-2 px-3 text-sm leading-4 text-gray-700 hover:bg-gray-50 inline-flex items-center">
                    <Upload size={16} className="mr-1" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="ml-3 text-sm text-gray-500">
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 mr-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (currentFundraiser ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Fundraiser Item Manager Modal */}
      {managingItemsForFundraiser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Items for {managingItemsForFundraiser.name}</h2>
              <button
                onClick={() => setManagingItemsForFundraiser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <FundraiserItemManager 
                fundraiserId={managingItemsForFundraiser.id || 0} 
                fundraiserName={managingItemsForFundraiser.name} 
              />
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <Button
                onClick={() => setManagingItemsForFundraiser(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Manager Modal */}
      {managingParticipantsForFundraiser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Participants for {managingParticipantsForFundraiser.name}</h2>
              <button
                onClick={() => setManagingParticipantsForFundraiser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <ParticipantManager 
                fundraiserId={managingParticipantsForFundraiser.id || 0} 
                fundraiserName={managingParticipantsForFundraiser.name} 
              />
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <Button
                onClick={() => setManagingParticipantsForFundraiser(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Manager Modal */}
      {managingOrdersForFundraiser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Orders for {managingOrdersForFundraiser.name}</h2>
              <button
                onClick={() => setManagingOrdersForFundraiser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <FundraiserOrderManager 
                fundraiserId={managingOrdersForFundraiser.id || 0} 
                fundraiserName={managingOrdersForFundraiser.name} 
              />
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <Button
                onClick={() => setManagingOrdersForFundraiser(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundraiserManager;
