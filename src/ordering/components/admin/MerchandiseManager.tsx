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
  Save,
  MinusCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLoadingOverlay } from '../../../shared/components/ui/LoadingOverlay';
import { api } from '../../../shared/api/apiClient';

interface MerchandiseManagerProps {
  restaurantId?: string;
}

// Using both default and named export to support either import style
const MerchandiseManager: React.FC<MerchandiseManagerProps> = ({ restaurantId }) => {
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

  // ----------------------------
  // Collection form state
  // ----------------------------
  interface CollectionFormData {
    id?: number;
    name: string;
    description: string;
    active: boolean;
    image_url?: string;
    imageFile?: File | null;
  }

  // ----------------------------
  // Item form state
  // ----------------------------
  interface VariantFormData {
    id?: number;
    size: string;
    color: string;
    price_adjustment: number;
    stock_quantity: number;       // Always a number
    manage_quantity: boolean;     // New: if false => unlimited
  }

  interface ItemFormData {
    id?: number;
    name: string;
    description: string;
    base_price: number;
    image_url?: string;
    imageFile?: File | null;
    second_image_url?: string;
    secondImageFile?: File | null;
    merchandise_collection_id: number;
    variants: VariantFormData[];
    is_one_size: boolean;
    color: string;
  }

  // ----------------------------
  // State for UI
  // ----------------------------
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

  // Available sizes for merchandise
  const availableSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "One Size"];

  // Common colors for merchandise
  const commonColors = [
    "Black",
    "White",
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Purple",
    "Orange",
    "Pink",
    "Gray",
    "Brown",
    "Navy"
  ];

  const [itemFormData, setItemFormData] = useState<ItemFormData>({
    name: '',
    description: '',
    base_price: 0,
    image_url: '',
    imageFile: null,
    second_image_url: '',
    secondImageFile: null,
    merchandise_collection_id: 0,
    variants: [],
    is_one_size: false,
    color: 'Black'
  });

  // Use loading overlay hook
  const { withLoading, LoadingOverlayComponent } = useLoadingOverlay();

  // ----------------------------
  // Load collections on mount
  // ----------------------------
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // ----------------------------
  // Set selected collection
  // ----------------------------
  useEffect(() => {
    if (collections.length > 0) {
      const activeCollection = collections.find((c) => c.active) || collections[0];
      setSelectedCollectionId(activeCollection.id);
      fetchMerchandiseItems({ collection_id: activeCollection.id });
    }
  }, [collections, fetchMerchandiseItems]);

  // ----------------------------
  // Add new collection modal
  // ----------------------------
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

  // ----------------------------
  // Add item
  // ----------------------------
  const handleAddItem = () => {
    if (selectedCollectionId === null) {
      toast.error('Please select a collection first');
      return;
    }

    // Default: manage_quantity = false => unlimited
    setItemFormData({
      name: '',
      description: '',
      base_price: 0,
      image_url: '',
      imageFile: null,
      second_image_url: '',
      secondImageFile: null,
      merchandise_collection_id: selectedCollectionId,
      variants: [
        {
          size: 'M',
          color: 'Black',
          price_adjustment: 0,
          manage_quantity: false,    // Unchecked => unlimited
          stock_quantity: 999999     // 999999 if not managing
        }
      ],
      is_one_size: false,
      color: 'Black'
    });
    setIsAddingItem(true);
    setIsEditingItem(false);
  };

  // ----------------------------
  // Edit item
  // ----------------------------
  const handleEditItem = (item: any) => {
    // Determine if this is a one-size item
    const isOneSize = item.variants?.length === 1 && item.variants[0].size === 'One Size';

    // Find a default color from the variants
    let defaultColor = 'Black';
    if (item.variants && item.variants.length > 0) {
      const colorCounts: Record<string, number> = {};
      item.variants.forEach((v: any) => {
        colorCounts[v.color] = (colorCounts[v.color] || 0) + 1;
      });
      let maxCount = 0;
      Object.entries(colorCounts).forEach(([color, count]) => {
        if (count > maxCount) {
          maxCount = count as number;
          defaultColor = color;
        }
      });
    }

    const buildVariantForm = (v: any): VariantFormData => {
      const qty = v.stock_quantity !== undefined ? v.stock_quantity : 999999;
      // If stock_quantity < 999999, we consider that "managing" quantity
      const isManaged = qty < 999999;
      return {
        id: v.id,
        size: v.size,
        color: v.color || defaultColor,
        price_adjustment: v.price_adjustment || 0,
        manage_quantity: isManaged,
        stock_quantity: isManaged ? qty : 999999
      };
    };

    setItemFormData({
      id: item.id,
      name: item.name,
      description: item.description || '',
      base_price: item.base_price,
      image_url: item.image_url || '',
      imageFile: null,
      second_image_url: item.second_image_url || '',
      secondImageFile: null,
      merchandise_collection_id: item.merchandise_collection_id,
      variants:
        item.variants && item.variants.length > 0
          ? item.variants.map((v: any) => buildVariantForm(v))
          : [
              {
                size: 'M',
                color: defaultColor,
                price_adjustment: 0,
                manage_quantity: false,
                stock_quantity: 999999
              }
            ],
      is_one_size: isOneSize,
      color: defaultColor
    });
    setIsAddingItem(true);
    setIsEditingItem(true);
  };

  // ----------------------------
  // Delete item
  // ----------------------------
  const handleDeleteItem = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await withLoading(async () => {
          await deleteMerchandiseItem(itemId);
          toast.success('Item deleted successfully');

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

  // ----------------------------
  // Submit collection
  // ----------------------------
  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collectionFormData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      await withLoading(async () => {
        const restId = restaurant?.id || 1;
        const newCollection = await createCollection(
          collectionFormData.name,
          collectionFormData.description,
          restId
        );

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

  // -----------------------------------------------------
  // Reorder variant methods
  // -----------------------------------------------------
  const handleMoveVariantUp = (index: number) => {
    if (index === 0) return;
    const newVariants = [...itemFormData.variants];
    [newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]];
    setItemFormData({ ...itemFormData, variants: newVariants });
  };

  const handleMoveVariantDown = (index: number) => {
    if (index === itemFormData.variants.length - 1) return;
    const newVariants = [...itemFormData.variants];
    [newVariants[index + 1], newVariants[index]] = [newVariants[index], newVariants[index + 1]];
    setItemFormData({ ...itemFormData, variants: newVariants });
  };

  // ----------------------------
  // Add variant size
  // ----------------------------
  const handleAddSize = () => {
    const newVariants = [...itemFormData.variants];

    // Find a size that's not already in use
    const usedSizes = new Set(newVariants.map((v) => v.size));
    const availableSize = availableSizes.find((s) => !usedSizes.has(s)) || 'M';

    newVariants.push({
      size: availableSize,
      color: itemFormData.color,
      price_adjustment: 0,
      manage_quantity: false,   // default to unlimited
      stock_quantity: 999999
    });

    setItemFormData({ ...itemFormData, variants: newVariants });
  };

  // ----------------------------
  // Remove variant
  // ----------------------------
  const handleRemoveSize = (index: number) => {
    if (itemFormData.variants.length <= 1) {
      toast.error('Item must have at least one size');
      return;
    }
    const newVariants = [...itemFormData.variants];
    newVariants.splice(index, 1);
    setItemFormData({ ...itemFormData, variants: newVariants });
  };

  // ----------------------------
  // One size toggle
  // ----------------------------
  const handleOneSizeToggle = (checked: boolean) => {
    if (checked) {
      setItemFormData({
        ...itemFormData,
        is_one_size: true,
        variants: [
          {
            size: 'One Size',
            color: itemFormData.color,
            price_adjustment: 0,
            manage_quantity: false,
            stock_quantity: 999999
          }
        ]
      });
    } else {
      setItemFormData({
        ...itemFormData,
        is_one_size: false,
        variants: ['S', 'M', 'L', 'XL'].map((size) => ({
          size,
          color: itemFormData.color,
          price_adjustment: 0,
          manage_quantity: false,
          stock_quantity: 999999
        }))
      });
    }
  };

  // ----------------------------
  // Color change (applies to all variants)
  // ----------------------------
  const handleColorChange = (color: string) => {
    const newVariants = itemFormData.variants.map((v) => ({ ...v, color }));
    setItemFormData({ ...itemFormData, color, variants: newVariants });
  };

  // ----------------------------
  // Handle variant field change
  // ----------------------------
  const handleVariantChange = (index: number, field: string, value: any) => {
    const newVariants = [...itemFormData.variants];
    const variant = { ...newVariants[index] };

    if (field === 'manage_quantity') {
      // Toggling the "Manage Quantity?" checkbox
      const checked = value as boolean;
      variant.manage_quantity = checked;
      // If they uncheck it => unlimited => stock_quantity=999999
      if (!checked) {
        variant.stock_quantity = 999999;
      } else {
        // If they check it => default to 0 or keep existing
        if (variant.stock_quantity === 999999) {
          variant.stock_quantity = 0; // or 10, up to you
        }
      }
    } else if (field === 'stock_quantity') {
      const parsed = parseInt(value, 10);
      variant.stock_quantity = isNaN(parsed) ? 0 : parsed;
    } else if (field === 'price_adjustment') {
      variant.price_adjustment = parseFloat(value) || 0;
    } else if (field === 'size') {
      variant.size = value;
    }
    newVariants[index] = variant;
    setItemFormData({ ...itemFormData, variants: newVariants });
  };

  // ----------------------------
  // Submit item
  // ----------------------------
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemFormData.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (itemFormData.base_price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (itemFormData.variants.length === 0) {
      toast.error('At least one size variant is required');
      return;
    }

    try {
      await withLoading(async () => {
        // Prepare main item form
        const formData = new FormData();
        formData.append('merchandise_item[name]', itemFormData.name);
        formData.append('merchandise_item[description]', itemFormData.description);
        formData.append('merchandise_item[base_price]', itemFormData.base_price.toString());
        formData.append(
          'merchandise_item[merchandise_collection_id]',
          itemFormData.merchandise_collection_id.toString()
        );

        if (itemFormData.imageFile) {
          formData.append('merchandise_item[image]', itemFormData.imageFile);
        }
        if (itemFormData.secondImageFile) {
          formData.append('merchandise_item[second_image]', itemFormData.secondImageFile);
        }

        let savedItem: any;

        if (isEditingItem && itemFormData.id) {
          // Update existing item
          savedItem = await api.upload(
            `/merchandise_items/${itemFormData.id}`,
            formData,
            'PATCH'
          );
          if (savedItem) {
            // Identify variants that remain
            const existingVariantIds = new Set(
              itemFormData.variants.filter((v) => v.id).map((v) => v.id)
            );
            // Fetch all current variants from DB
            const currentVariants = await api.get(
              `/merchandise_variants?merchandise_item_id=${itemFormData.id}`
            );
            if (Array.isArray(currentVariants)) {
              const variantsToDelete = currentVariants.filter(
                (v: any) => v.id && !existingVariantIds.has(v.id)
              );
              // Delete removed
              for (const variant of variantsToDelete) {
                if (variant && typeof variant.id === 'number') {
                  await api.delete(`/merchandise_variants/${variant.id}`);
                }
              }
            }
            // Update or create
            for (const v of itemFormData.variants) {
              if (v.id) {
                await api.patch(`/merchandise_variants/${v.id}`, {
                  merchandise_variant: {
                    size: v.size,
                    color: v.color,
                    price_adjustment: v.price_adjustment,
                    stock_quantity: v.stock_quantity
                  }
                });
              } else {
                await api.post('/merchandise_variants', {
                  merchandise_variant: {
                    merchandise_item_id: itemFormData.id,
                    size: v.size,
                    color: v.color,
                    price_adjustment: v.price_adjustment,
                    stock_quantity: v.stock_quantity
                  }
                });
              }
            }
            toast.success('Item updated successfully');
          }
        } else {
          // Create new item
          savedItem = await api.upload('/merchandise_items', formData);
          if (savedItem && typeof savedItem.id === 'number') {
            // Create all variants
            for (const v of itemFormData.variants) {
              await api.post('/merchandise_variants', {
                merchandise_variant: {
                  merchandise_item_id: savedItem.id,
                  size: v.size,
                  color: v.color,
                  price_adjustment: v.price_adjustment,
                  stock_quantity: v.stock_quantity
                }
              });
            }
            toast.success('Item created successfully');
          }
        }

        // Done
        setIsAddingItem(false);
        setIsEditingItem(false);

        if (selectedCollectionId) {
          await fetchMerchandiseItems({ collection_id: selectedCollectionId });
        } else {
          await fetchMerchandiseItems({ include_collection_names: true });
        }
      });
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item');
    }
  };

  // ----------------------------
  // Loading / Error states
  // ----------------------------
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

  // ----------------------------
  // JSX Output
  // ----------------------------
  return (
    <div className="p-4">
      {/* Loading overlay */}
      {LoadingOverlayComponent}

      {/* Header & Add Collection */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Merchandise Manager</h2>
          <p className="text-gray-600 text-sm">
            Manage merchandise collections, items, colors, and sizes
          </p>
        </div>
        <button
          onClick={handleAddCollection}
          className="bg-[#c1902f] text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Collection
        </button>
      </div>

      {/* Collection Tabs */}
      {collections.length > 0 ? (
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8 overflow-x-auto">
              {/* All Items */}
              <button
                onClick={() => {
                  setSelectedCollectionId(null);
                  fetchMerchandiseItems({ include_collection_names: true });
                }}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  ${
                    selectedCollectionId === null
                      ? 'border-[#c1902f] text-[#c1902f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                All Items
              </button>

              {/* Individual Collections */}
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setSelectedCollectionId(collection.id);
                    fetchMerchandiseItems({ collection_id: collection.id });
                  }}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                    ${
                      selectedCollectionId === collection.id
                        ? 'border-[#c1902f] text-[#c1902f]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
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
              {/* Name */}
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
                  onChange={(e) =>
                    setCollectionFormData({ ...collectionFormData, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setCollectionFormData({ ...collectionFormData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Active */}
              <div>
                <div className="flex items-center">
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={collectionFormData.active}
                      onChange={(e) =>
                        setCollectionFormData({ ...collectionFormData, active: e.target.checked })
                      }
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

              {/* Submit */}
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

      {/* Add/Edit Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {isEditingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => setIsAddingItem(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleItemSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
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
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, name: e.target.value })
                      }
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
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, description: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>

                  {/* Base Price */}
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
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemFormData.base_price}
                        onChange={(e) =>
                          setItemFormData({
                            ...itemFormData,
                            base_price: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full pl-8 px-4 py-2 border rounded-md"
                        required
                      />
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <div className="flex items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Color
                      </label>
                      <Tooltip
                        content="The color of this item (applies to all sizes)"
                        position="top"
                        icon
                        iconClassName="ml-1 h-4 w-4"
                      />
                    </div>
                    <select
                      value={itemFormData.color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      {commonColors.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* One Size Toggle */}
                  <div>
                    <div className="flex items-center">
                      <label className="inline-flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={itemFormData.is_one_size}
                          onChange={(e) => handleOneSizeToggle(e.target.checked)}
                          className="rounded"
                        />
                        <span>This is a one-size item (hat, accessory, etc.)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Main Image */}
                  <div>
                    <div className="flex items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Main Image
                      </label>
                      <Tooltip
                        content="Upload the primary image for this item"
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
                            onClick={() =>
                              setItemFormData({ ...itemFormData, imageFile: null })
                            }
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
                            onClick={() =>
                              setItemFormData({ ...itemFormData, image_url: '' })
                            }
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
                        {itemFormData.imageFile || itemFormData.image_url
                          ? 'Change Image'
                          : 'Upload Image'}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setItemFormData({
                                ...itemFormData,
                                imageFile: file,
                                image_url: ''
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Secondary Image */}
                  <div>
                    <div className="flex items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Secondary Image
                      </label>
                      <Tooltip
                        content="Optionally upload a second/alternate image (e.g. back of shirt)"
                        position="top"
                        icon
                        iconClassName="ml-1 h-4 w-4"
                      />
                    </div>
                    <div className="mt-1 flex items-center">
                      {itemFormData.secondImageFile ? (
                        <div className="relative w-24 h-24 rounded-md overflow-hidden bg-gray-100 mr-4">
                          <img
                            src={URL.createObjectURL(itemFormData.secondImageFile)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setItemFormData({ ...itemFormData, secondImageFile: null })
                            }
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : itemFormData.second_image_url ? (
                        <div className="relative w-24 h-24 rounded-md overflow-hidden bg-gray-100 mr-4">
                          <img
                            src={itemFormData.second_image_url}
                            alt="Current"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setItemFormData({ ...itemFormData, second_image_url: '' })
                            }
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
                        {itemFormData.secondImageFile || itemFormData.second_image_url
                          ? 'Change Image'
                          : 'Upload Image'}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setItemFormData({
                                ...itemFormData,
                                secondImageFile: file,
                                second_image_url: ''
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants (Sizes & Inventory) */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Sizes & Inventory</h4>
                {!itemFormData.is_one_size && (
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="mb-3 inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Size
                  </button>
                )}
                <div className="space-y-3">
                  {itemFormData.variants.map((variant, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-7 gap-4 bg-gray-50 p-3 rounded-md items-center"
                    >
                      {/* Size */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Size</label>
                        {itemFormData.is_one_size ? (
                          <input
                            type="text"
                            disabled
                            value="One Size"
                            className="w-full px-2 py-1 border rounded-md bg-gray-100"
                          />
                        ) : (
                          <select
                            value={variant.size}
                            onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                            className="w-full px-2 py-1 border rounded-md"
                          >
                            {availableSizes.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Price Adjustment */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Price Adjustment
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full pl-6 py-1 border rounded-md"
                            value={variant.price_adjustment}
                            onChange={(e) =>
                              handleVariantChange(index, 'price_adjustment', e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* Manage Quantity? checkbox */}
                      <div className="flex items-center">
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={variant.manage_quantity}
                            onChange={(e) =>
                              handleVariantChange(index, 'manage_quantity', e.target.checked)
                            }
                            className="rounded"
                          />
                          <span>Manage Qty?</span>
                        </label>
                      </div>

                      {/* Stock Quantity (only if manage_quantity=true) */}
                      {variant.manage_quantity ? (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full px-2 py-1 border rounded-md"
                            value={variant.stock_quantity}
                            onChange={(e) =>
                              handleVariantChange(index, 'stock_quantity', e.target.value)
                            }
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                          <div className="text-gray-400 text-sm">Unlimited</div>
                        </div>
                      )}

                      {/* Reorder Buttons (if multiple variants) */}
                      {!itemFormData.is_one_size && (
                        <div className="flex flex-row items-center space-x-1 justify-center">
                          <button
                            type="button"
                            onClick={() => handleMoveVariantUp(index)}
                            disabled={index === 0}
                            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm flex items-center disabled:opacity-50"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveVariantDown(index)}
                            disabled={index === itemFormData.variants.length - 1}
                            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm flex items-center disabled:opacity-50"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Remove Size Button */}
                      {!itemFormData.is_one_size && (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(index)}
                            className="inline-flex items-center px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-sm"
                          >
                            <MinusCircle className="h-4 w-4 mr-1" />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end space-x-2 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingItem(false);
                    setIsEditingItem(false);
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {isEditingItem ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items + Collection Settings */}
      {selectedCollectionId !== undefined && (
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
              {merchandiseItems.map((item: any) => (
                <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm">
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
                        <span className="text-gray-600">${item.base_price.toFixed(2)}</span>
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

          {/* Collection Settings */}
          {selectedCollectionId && (
            <div className="mb-8">
              <button
                onClick={() => setShowCollectionSettings(!showCollectionSettings)}
                className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-t-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900">Collection Settings</h3>
                  {collections.find((c) => c.id === selectedCollectionId)?.active && (
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
                      {collections.find((c) => c.id === selectedCollectionId)?.active ? (
                        <div className="flex items-center text-green-600">
                          <Check className="h-5 w-5 mr-2" />
                          <span>This collection is currently active</span>
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={async () => {
                              if (
                                window.confirm(
                                  'Are you sure you want to set this collection as active?'
                                )
                              ) {
                                try {
                                  await withLoading(async () => {
                                    await setActiveCollection(selectedCollectionId);
                                    toast.success('Collection set as active successfully');
                                  });
                                } catch (err) {
                                  console.error('Failed to set collection as active:', err);
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
                            Make this the default collection shown to customers.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {/* Edit Collection */}
                      <button
                        onClick={() => {
                          const collection = collections.find(
                            (c) => c.id === selectedCollectionId
                          );
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
                          if (
                            window.confirm(
                              'Are you sure you want to delete this collection? This will also delete all items in this collection and cannot be undone.'
                            )
                          ) {
                            try {
                              await withLoading(async () => {
                                await deleteCollection(selectedCollectionId);
                                toast.success('Collection deleted successfully');

                                // Reset collection selection
                                if (collections.length > 1) {
                                  const nextCollection = collections.find(
                                    (c) => c.id !== selectedCollectionId
                                  );
                                  if (nextCollection) {
                                    setSelectedCollectionId(nextCollection.id);
                                    fetchMerchandiseItems({
                                      collection_id: nextCollection.id
                                    });
                                  }
                                } else {
                                  setSelectedCollectionId(null);
                                  fetchMerchandiseItems({
                                    include_collection_names: true
                                  });
                                }
                              });
                            } catch (err) {
                              console.error('Failed to delete collection:', err);
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
                      Deleting this collection will permanently remove all its items.
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
export { MerchandiseManager };
