import React, { useState, useEffect } from 'react';
import { useMerchandiseStore } from '../../store/merchandiseStore';
import { useAuthStore } from '../../store/authStore';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { LoadingSpinner, Tooltip } from '../../../shared/components/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Image,
  Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLoadingOverlay } from '../../../shared/components/ui/LoadingOverlay';
import { api } from '../../../shared/api/apiClient';

interface MerchandiseManagerProps {
  restaurantId?: string;
}

export const MerchandiseManager: React.FC<MerchandiseManagerProps> = ({ restaurantId }) => {
  const { user } = useAuthStore();
  const { restaurant } = useRestaurantStore();
  const {
    collections,
    merchandiseItems,
    loading,
    error,
    fetchCollections,
    fetchMerchandiseItems,
    createCollection,
    updateCollection,
    deleteCollection,
    setActiveCollection,
    addMerchandiseItem,
    updateMerchandiseItem,
    deleteMerchandiseItem
  } = useMerchandiseStore();

  // Collection form state
  interface CollectionFormData {
    id?: number;
    name: string;
    description: string;
    active: boolean;
    image_url?: string;
    imageFile?: File | null;
  }

  // Item form state
  interface ItemFormData {
    id?: number;
    name: string;
    description: string;
    base_price: number;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
    image_url?: string;
    imageFile?: File | null;
    merchandise_collection_id: number;
  }

  // State for selected collection and UI controls
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [collectionFormData, setCollectionFormData] = useState<CollectionFormData>({
    name: '',
    description: '',
    active: false,
    image_url: '',
    imageFile: null
  });
  const [itemFormData, setItemFormData] = useState<ItemFormData>({
    name: '',
    description: '',
    base_price: 0,
    stock_status: 'in_stock',
    image_url: '',
    imageFile: null,
    merchandise_collection_id: 0
  });
  
  // Use loading overlay hook
  const { withLoading, LoadingOverlayComponent } = useLoadingOverlay();
  
  // Load collections on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);
  
  // Set selected collection when collections are loaded
  useEffect(() => {
    if (collections.length > 0) {
      const activeCollection = collections.find(c => c.active) || collections[0];
      setSelectedCollectionId(activeCollection.id);
      fetchMerchandiseItems({ collection_id: activeCollection.id });
    }
  }, [collections, fetchMerchandiseItems]);

  // Handle opening the add collection modal
  const handleAddCollection = () => {
    setCollectionFormData({
      name: '',
      description: '',
      active: false,
      image_url: '',
      imageFile: null
    });
    setIsAddingCollection(true);
  };

  // Handle opening the add item modal
  const handleAddItem = () => {
    if (!selectedCollectionId && selectedCollectionId !== null) {
      toast.error('Please select a collection first');
      return;
    }

    setItemFormData({
      name: '',
      description: '',
      base_price: 0,
      stock_status: 'in_stock',
      image_url: '',
      imageFile: null,
      merchandise_collection_id: selectedCollectionId || 0
    });
    setIsAddingItem(true);
  };

  // Handle opening the edit item modal
  const handleEditItem = (item: any) => {
    setItemFormData({
      id: item.id,
      name: item.name,
      description: item.description || '',
      base_price: item.base_price,
      stock_status: item.stock_status || 'in_stock',
      image_url: item.image_url || '',
      imageFile: null,
      merchandise_collection_id: item.merchandise_collection_id
    });
    setIsEditingItem(true);
  };

  // Handle deleting an item
  const handleDeleteItem = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await withLoading(async () => {
          await deleteMerchandiseItem(itemId);
          toast.success('Item deleted successfully');
          
          // Refresh the items list
          if (selectedCollectionId) {
            await fetchMerchandiseItems({ collection_id: selectedCollectionId });
          } else {
            await fetchMerchandiseItems({ include_collection_names: true });
          }
        });
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  // Handle collection form submission
  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!collectionFormData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      await withLoading(async () => {
        // Get the restaurant ID from the restaurant store
        const restaurantId = restaurant?.id || 1;
        
        // Create the collection
        const newCollection = await createCollection(
          collectionFormData.name,
          collectionFormData.description,
          restaurantId
        );

        // If successful, close the modal and refresh collections
        if (newCollection) {
          toast.success('Collection created successfully');
          setIsAddingCollection(false);
          await fetchCollections();
        }
      });
    } catch (error) {
      console.error('Failed to create collection:', error);
      toast.error('Failed to create collection');
    }
  };

  if (loading && collections.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        An error occurred: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Loading overlay */}
      {LoadingOverlayComponent}
      
      {/* Header section with Add Collection button inline */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Merchandise Manager</h2>
          <p className="text-gray-600 text-sm">Manage merchandise collections, items, and variants</p>
        </div>
        <button
          onClick={handleAddCollection}
          className="bg-[#c1902f] text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Collection
        </button>
      </div>
      
      {/* Collection tabs */}
      {collections.length > 0 ? (
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8 overflow-x-auto">
              {/* All Items tab */}
              <button
                onClick={() => {
                  setSelectedCollectionId(null);
                  fetchMerchandiseItems({ include_collection_names: true });
                }}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  ${selectedCollectionId === null
                    ? 'border-[#c1902f] text-[#c1902f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                All Items
              </button>
              
              {/* Collection tabs */}
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setSelectedCollectionId(collection.id);
                    fetchMerchandiseItems({ collection_id: collection.id });
                  }}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                    ${selectedCollectionId === collection.id
                      ? 'border-[#c1902f] text-[#c1902f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {collection.name}
                  {collection.active && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg mb-8">
          <p className="text-gray-500">No collections available. Create a collection to get started.</p>
        </div>
      )}
      
      {/* This section is intentionally removed as it was duplicated */}
      {/* Add Collection Modal */}
      {isAddingCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Add New Collection</h3>
              <button
                onClick={() => setIsAddingCollection(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCollectionSubmit} className="space-y-6">
              {/* Collection Name */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Collection Name <span className="text-red-500">*</span>
                  </label>
                  <Tooltip 
                    content="The name of the merchandise collection (e.g. 'Summer Collection', 'T-Shirts')"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <input
                  type="text"
                  value={collectionFormData.name}
                  onChange={(e) => setCollectionFormData({...collectionFormData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Tooltip 
                    content="A brief description of the collection"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <textarea
                  value={collectionFormData.description}
                  onChange={(e) => setCollectionFormData({...collectionFormData, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Active Status */}
              <div>
                <div className="flex items-center">
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={collectionFormData.active}
                      onChange={(e) => setCollectionFormData({...collectionFormData, active: e.target.checked})}
                    />
                    <span>Set as active collection?</span>
                  </label>
                  <Tooltip 
                    content="If checked, this collection will be the default one shown to customers"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end space-x-2 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingCollection(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Add New Item</h3>
              <button
                onClick={() => setIsAddingItem(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

              {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!itemFormData.name.trim()) {
                toast.error('Item name is required');
                return;
              }

              if (itemFormData.base_price <= 0) {
                toast.error('Price must be greater than 0');
                return;
              }

              try {
                await withLoading(async () => {
                  // Create FormData for file upload
                  const formData = new FormData();
                  formData.append('merchandise_item[name]', itemFormData.name);
                  formData.append('merchandise_item[description]', itemFormData.description);
                  formData.append('merchandise_item[base_price]', itemFormData.base_price.toString());
                  formData.append('merchandise_item[stock_status]', itemFormData.stock_status);
                  formData.append('merchandise_item[merchandise_collection_id]', (itemFormData.merchandise_collection_id || 0).toString());
                  
                  // Add image if selected
                  if (itemFormData.imageFile) {
                    formData.append('merchandise_item[image]', itemFormData.imageFile);
                  }

                  // Create the item with image
                  const newItem = await api.upload('/merchandise_items', formData);

                  // If successful, close the modal and refresh items
                  if (newItem) {
                    toast.success('Item created successfully');
                    setIsAddingItem(false);
                    if (selectedCollectionId) {
                      await fetchMerchandiseItems({ collection_id: selectedCollectionId });
                    } else {
                      await fetchMerchandiseItems({ include_collection_names: true });
                    }
                  }
                });
              } catch (error) {
                console.error('Failed to create item:', error);
                toast.error('Failed to create item');
              }
            }} className="space-y-6">
              {/* Item Name */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <Tooltip 
                    content="The name of the merchandise item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <input
                  type="text"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Tooltip 
                    content="A brief description of the item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <textarea
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Price */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Base Price <span className="text-red-500">*</span>
                  </label>
                  <Tooltip 
                    content="The base price of the item in dollars"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.base_price}
                    onChange={(e) => setItemFormData({...itemFormData, base_price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 px-4 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              {/* Stock Status */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Stock Status
                  </label>
                  <Tooltip 
                    content="The current availability of this item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <select
                  value={itemFormData.stock_status}
                  onChange={(e) => setItemFormData({...itemFormData, stock_status: e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock'})}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Image
                  </label>
                  <Tooltip 
                    content="Upload an image for this merchandise item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <div className="mt-1 flex items-center">
                  {itemFormData.imageFile ? (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden bg-gray-100 mr-4">
                      <img 
                        src={URL.createObjectURL(itemFormData.imageFile)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setItemFormData({...itemFormData, imageFile: null})}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center mr-4">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                    {itemFormData.imageFile ? 'Change Image' : 'Upload Image'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setItemFormData({...itemFormData, imageFile: file});
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end space-x-2 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Edit Item</h3>
              <button
                onClick={() => setIsEditingItem(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!itemFormData.name.trim()) {
                toast.error('Item name is required');
                return;
              }

              if (itemFormData.base_price <= 0) {
                toast.error('Price must be greater than 0');
                return;
              }

              try {
                await withLoading(async () => {
                  // Create FormData for file upload
                  const formData = new FormData();
                  formData.append('merchandise_item[name]', itemFormData.name);
                  formData.append('merchandise_item[description]', itemFormData.description);
                  formData.append('merchandise_item[base_price]', itemFormData.base_price.toString());
                  formData.append('merchandise_item[stock_status]', itemFormData.stock_status);
                  formData.append('merchandise_item[merchandise_collection_id]', (itemFormData.merchandise_collection_id || 0).toString());
                  
                  // Add image if selected
                  if (itemFormData.imageFile) {
                    formData.append('merchandise_item[image]', itemFormData.imageFile);
                  }

                  // Update the item with image
                  const updatedItem = await api.upload(`/merchandise_items/${itemFormData.id}`, formData, 'PATCH');

                  // If successful, close the modal and refresh items
                  if (updatedItem) {
                    toast.success('Item updated successfully');
                    setIsEditingItem(false);
                    if (selectedCollectionId) {
                      await fetchMerchandiseItems({ collection_id: selectedCollectionId });
                    } else {
                      await fetchMerchandiseItems({ include_collection_names: true });
                    }
                  }
                });
              } catch (error) {
                console.error('Failed to update item:', error);
                toast.error('Failed to update item');
              }
            }} className="space-y-6">
              {/* Item Name */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <Tooltip 
                    content="The name of the merchandise item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <input
                  type="text"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Tooltip 
                    content="A brief description of the item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <textarea
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Price */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Base Price <span className="text-red-500">*</span>
                  </label>
                  <Tooltip 
                    content="The base price of the item in dollars"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.base_price}
                    onChange={(e) => setItemFormData({...itemFormData, base_price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 px-4 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              {/* Stock Status */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Stock Status
                  </label>
                  <Tooltip 
                    content="The current availability of this item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <select
                  value={itemFormData.stock_status}
                  onChange={(e) => setItemFormData({...itemFormData, stock_status: e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock'})}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Collection Selection (for editing) */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Collection
                  </label>
                  <Tooltip 
                    content="The collection this item belongs to"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <select
                  value={itemFormData.merchandise_collection_id}
                  onChange={(e) => setItemFormData({...itemFormData, merchandise_collection_id: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} {collection.active && '(Active)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Image
                  </label>
                  <Tooltip 
                    content="Upload an image for this merchandise item"
                    position="top"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <div className="mt-1 flex items-center">
                  {itemFormData.imageFile ? (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden bg-gray-100 mr-4">
                      <img 
                        src={URL.createObjectURL(itemFormData.imageFile)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setItemFormData({...itemFormData, imageFile: null})}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : itemFormData.image_url ? (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden bg-gray-100 mr-4">
                      <img 
                        src={itemFormData.image_url} 
                        alt="Current" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setItemFormData({...itemFormData, image_url: ''})}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center mr-4">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                    {itemFormData.imageFile || itemFormData.image_url ? 'Change Image' : 'Upload Image'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setItemFormData({...itemFormData, imageFile: file, image_url: ''});
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end space-x-2 pt-6">
                <button
                  type="button"
                  onClick={() => setIsEditingItem(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items section with Collection Settings integrated below */}
      {(selectedCollectionId !== undefined) && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedCollectionId === null ? 'All Merchandise Items' : 'Collection Items'}
            </h3>
            <button
              onClick={handleAddItem}
              className="bg-[#c1902f] text-white px-3 py-1.5 rounded-md flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </button>
          </div>
          
          {merchandiseItems.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg mb-6">
              <p className="text-gray-500">No items in this collection. Add an item to get started.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {merchandiseItems.map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm">
                  {/* Item header */}
                  <div className="bg-white p-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden mr-4">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {item.name}
                          {selectedCollectionId === null && item.collection_name && (
                            <span className="ml-2 text-sm text-gray-500">
                              ({item.collection_name})
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">${item.base_price.toFixed(2)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                            ${item.stock_status === 'in_stock' ? 'bg-green-100 text-green-800' : 
                              item.stock_status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}
                          >
                            {item.stock_status === 'in_stock' ? 'In Stock' : 
                             item.stock_status === 'low_stock' ? 'Low Stock' : 
                             'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Collection Settings Toggle & Panel - now below the items list */}
          {selectedCollectionId && (
            <div className="mb-8">
              <button
                onClick={() => setShowCollectionSettings(!showCollectionSettings)}
                className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-t-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900">Collection Settings</h3>
                  {collections.find(c => c.id === selectedCollectionId)?.active && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                      Active
                    </span>
                  )}
                </div>
                {showCollectionSettings ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {showCollectionSettings && (
                <div className="bg-white p-6 rounded-b-lg border border-gray-200 border-t-0 shadow-sm animate-fadeIn">
                  <div className="space-y-6">
                    {/* Set as Active */}
                    <div>
                      {collections.find(c => c.id === selectedCollectionId)?.active ? (
                        <div className="flex items-center text-green-600">
                          <Check className="h-5 w-5 mr-2" />
                          <span>This collection is currently active</span>
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to set this collection as active? This will make it the default collection shown to customers.')) {
                                try {
                                  await withLoading(async () => {
                                    await setActiveCollection(selectedCollectionId);
                                    toast.success('Collection set as active successfully');
                                  });
                                } catch (error) {
                                  console.error('Failed to set collection as active:', error);
                                  toast.error('Failed to set collection as active');
                                }
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Set as Active
                          </button>
                          <p className="text-sm text-gray-500 mt-2">
                            Make this the default collection shown to customers
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {/* Edit Collection */}
                      <button
                        onClick={() => {
                          const collection = collections.find(c => c.id === selectedCollectionId);
                          if (collection) {
                            setCollectionFormData({
                              id: collection.id,
                              name: collection.name,
                              description: collection.description,
                              active: collection.active,
                              image_url: '',
                              imageFile: null
                            });
                            setIsAddingCollection(true);
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Collection
                      </button>
                      
                      {/* Delete Collection */}
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this collection? This will also delete all items in this collection and cannot be undone.')) {
                            try {
                              await withLoading(async () => {
                                await deleteCollection(selectedCollectionId);
                                toast.success('Collection deleted successfully');
                                
                                // Reset collection selection
                                if (collections.length > 1) {
                                  const nextCollection = collections.find(c => c.id !== selectedCollectionId);
                                  if (nextCollection) {
                                    setSelectedCollectionId(nextCollection.id);
                                    fetchMerchandiseItems({ collection_id: nextCollection.id });
                                  }
                                } else {
                                  setSelectedCollectionId(null);
                                  fetchMerchandiseItems({ include_collection_names: true });
                                }
                              });
                            } catch (error) {
                              console.error('Failed to delete collection:', error);
                              toast.error('Failed to delete collection');
                            }
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Collection
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-2">
                      Deleting this collection will permanently remove all its items. This action cannot be undone.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MerchandiseManager;
