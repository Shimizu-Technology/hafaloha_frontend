import React, { useEffect, useState } from 'react';
import { useMerchandiseStore } from '../store/merchandiseStore';
import { useOrderStore } from '../store/orderStore';
import { LoadingSpinner } from '../../shared/components/ui';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MerchandisePage: React.FC = () => {
  const {
    collections,
    merchandiseItems,
    loading,
    error,
    fetchCollections,
    fetchMerchandiseItems
  } = useMerchandiseStore();

  const { addToCart } = useOrderStore();

  // State for selected collection
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  
  // State for selected variant
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});

  // Load collections on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Load items when a collection is selected
  useEffect(() => {
    if (collections.length > 0) {
      const activeCollection = collections.find(c => c.active) || collections[0];
      setSelectedCollectionId(activeCollection.id);
      fetchMerchandiseItems({ collection_id: activeCollection.id });
    }
  }, [collections, fetchMerchandiseItems]);

  // Handle collection change
  const handleCollectionChange = (collectionId: number) => {
    setSelectedCollectionId(collectionId);
    fetchMerchandiseItems({ collection_id: collectionId });
  };

  // Handle variant selection
  const handleVariantSelection = (itemId: number, variantId: number) => {
    setSelectedVariants(prev => ({
      ...prev,
      [itemId]: variantId
    }));
  };

  // Add merchandise to cart
  const handleAddToCart = (item: any, variant: any) => {
    const merchandiseItem = {
      id: item.id,
      name: item.name,
      price: item.base_price + (variant?.price_adjustment || 0),
      image_url: item.image_url,
      quantity: 1,
      type: 'merchandise' as 'merchandise', // Type assertion to fix TypeScript error
      variant_id: variant?.id,
      variant_details: variant ? {
        size: variant.size,
        color: variant.color
      } : null
    };

    addToCart(merchandiseItem);
    toast.success(`Added ${item.name} to cart`);
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

  // Get the current collection
  const currentCollection = collections.find(c => c.id === selectedCollectionId) || collections[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Merchandise</h1>
      
      {/* Collection tabs */}
      {collections.length > 0 && (
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
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
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
                  onClick={() => handleCollectionChange(collection.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${selectedCollectionId === collection.id
                      ? 'border-[#c1902f] text-[#c1902f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {collection.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
      
      {/* Collection description */}
      {selectedCollectionId === null ? (
        <div className="mb-8">
          <p className="text-gray-600">Browse all merchandise items across all collections.</p>
        </div>
      ) : currentCollection && (
        <div className="mb-8">
          <p className="text-gray-600">{currentCollection.description}</p>
        </div>
      )}
      
      {/* Merchandise items */}
      {merchandiseItems.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No merchandise items available in this collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {merchandiseItems.map((item) => {
            // Get the selected variant or the first one
            const selectedVariantId = selectedVariants[item.id];
            const selectedVariant = item.variants?.find(v => v.id === selectedVariantId) || item.variants?.[0];
            
            // Calculate price with variant adjustment
            const displayPrice = item.base_price + (selectedVariant?.price_adjustment || 0);
            
            // Check if item is out of stock
            const isOutOfStock = item.stock_status === 'out_of_stock' || 
                                (selectedVariant && selectedVariant.stock_quantity <= 0);
            
            return (
              <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Item image */}
                <div className="aspect-square bg-gray-100 relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  
                  {/* Out of stock overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold uppercase text-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Item details */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {item.name}
                    {selectedCollectionId === null && item.collection_name && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({item.collection_name})
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
                  
                  {/* Price */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-medium text-gray-900">${displayPrice.toFixed(2)}</span>
                    
                    {/* Stock status badge */}
                    {item.stock_status === 'low_stock' && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Low Stock
                      </span>
                    )}
                  </div>
                  
                  {/* Variants */}
                  {item.variants && item.variants.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Variant
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {item.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => handleVariantSelection(item.id, variant.id)}
                            className={`
                              px-3 py-2 text-sm border rounded-md
                              ${selectedVariantId === variant.id
                                ? 'border-[#c1902f] bg-[#c1902f] bg-opacity-10 text-[#c1902f]'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                              ${variant.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            disabled={variant.stock_quantity <= 0}
                          >
                            {variant.size} / {variant.color}
                            {variant.price_adjustment > 0 && ` (+$${variant.price_adjustment.toFixed(2)})`}
                            {variant.price_adjustment < 0 && ` (-$${Math.abs(variant.price_adjustment).toFixed(2)})`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add to cart button */}
                  <button
                    onClick={() => handleAddToCart(item, selectedVariant)}
                    disabled={isOutOfStock}
                    className={`
                      mt-4 w-full flex items-center justify-center px-4 py-2 rounded-md
                      ${!isOutOfStock
                        ? 'bg-[#c1902f] text-white hover:bg-[#d4a43f]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                      transition-colors duration-200
                    `}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MerchandisePage;
