// src/wholesale/components/ItemCard.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WholesaleItem } from '../services/wholesaleApi';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

interface ItemCardProps {
  item: WholesaleItem;
  fundraiserSlug: string;
  fundraiserId: number;
  showDetailLink?: boolean;
  compact?: boolean;
}

export default function ItemCard({ 
  item, 
  fundraiserSlug, 
  fundraiserId, 
  showDetailLink = false, 
  compact = false 
}: ItemCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { addToCart, setError } = useWholesaleCart();

  const handleAddToCart = () => {
    const success = addToCart({
      id: `${item.id}-${Date.now()}`,
      itemId: item.id,
      fundraiserId: fundraiserId,
      name: item.name,
      description: item.description,
      sku: item.sku,
      price: item.price,
      priceCents: item.priceCents,
      imageUrl: item.primaryImageUrl,
      options: item.options
    }, 1);

    if (!success) {
      // Error message already set in cart store
      return;
    }
    
    // Clear any previous error on successful add
    setError(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStockStatusInfo = () => {
    if (!item.trackInventory) {
      return { status: 'Available', className: 'bg-green-100 text-green-800' };
    }
    
    switch (item.stockStatus) {
      case 'in_stock':
        return { status: 'In Stock', className: 'bg-green-100 text-green-800' };
      case 'low_stock':
        return { status: 'Low Stock', className: 'bg-yellow-100 text-yellow-800' };
      case 'out_of_stock':
        return { status: 'Out of Stock', className: 'bg-red-100 text-red-800' };
      default:
        return { status: 'Available', className: 'bg-green-100 text-green-800' };
    }
  };

  const stockInfo = getStockStatusInfo();
  const cardClasses = compact 
    ? "border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
    : "border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow";

  return (
    <div className={cardClasses}>
      {/* Item Image */}
      <div className={`relative ${compact ? 'aspect-square mb-3' : 'aspect-square mb-4'}`}>
        {item.primaryImageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <OptimizedImage
              src={item.primaryImageUrl}
              alt={item.name}
              context="menuItem"
              className={`w-full h-full object-cover rounded-lg ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        )}
        
        {/* Stock Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockInfo.className}`}>
            {stockInfo.status}
          </span>
        </div>

        {/* Multiple Images Indicator */}
        {item.images.length > 1 && (
          <div className="absolute bottom-2 left-2">
            <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              {item.images.length} photos
            </span>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className={`space-y-${compact ? '1' : '2'}`}>
        <div className="flex items-start justify-between">
          <h3 className={`font-medium text-gray-900 line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>
            {item.name}
          </h3>
          
          {/* Quick actions menu */}
          <div className="flex-shrink-0 ml-2">
            {showDetailLink && (
              <Link 
                to={`/wholesale/${fundraiserSlug}/items/${item.id}`}
                className="text-gray-400 hover:text-gray-600"
                title="View Details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            )}
          </div>
        </div>
        
        {item.description && !compact && (
          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        )}
        
        {/* Price and Stats */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
              {formatCurrency(item.price)}
            </span>
            {!compact && item.totalOrdered > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {item.totalOrdered} sold
              </div>
            )}
          </div>
          
          {/* Stock quantity indicator */}
          {item.trackInventory && item.availableQuantity !== undefined && (
            <div className="text-xs text-gray-500 text-right">
              {item.availableQuantity > 0 ? (
                <span>{item.availableQuantity} left</span>
              ) : (
                <span className="text-red-600">Sold out</span>
              )}
            </div>
          )}
        </div>

        {/* SKU */}
        {item.sku && !compact && (
          <div className="text-xs text-gray-500">SKU: {item.sku}</div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={!item.inStock}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${compact ? 'text-sm' : 'text-base'} ${
            item.inStock
              ? 'bg-[#c1902f] text-white hover:bg-[#d4a43f]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {item.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>

        {/* Detail Link */}
        {showDetailLink && (
          <Link 
            to={`/wholesale/${fundraiserSlug}/items/${item.id}`}
            className="block text-center text-[#c1902f] hover:text-[#d4a43f] text-sm font-medium"
          >
            View Details
          </Link>
        )}
      </div>
    </div>
  );
}