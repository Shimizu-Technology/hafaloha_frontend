// src/wholesale/components/ItemCard.tsx
import { Link } from 'react-router-dom';
import { WholesaleItem } from '../services/wholesaleApi';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import ImageCarousel from './ImageCarousel';

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
      priceCents: item.price_cents,
      imageUrl: item.primary_image_url,
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
    if (!item.track_inventory) {
      return { status: 'Available', className: 'bg-green-100 text-green-800' };
    }
    
    switch (item.stock_status) {
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
      {/* Item Image Carousel */}
      <div className={`relative ${compact ? 'aspect-square mb-3' : 'aspect-square mb-4'}`}>
        <ImageCarousel
          images={item.images}
          primaryImageUrl={item.primary_image_url}
          itemName={item.name}
          className="w-full h-full"
        />
        
        {/* Stock Status Badge */}
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockInfo.className}`}>
            {stockInfo.status}
          </span>
        </div>
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
            {!compact && item.total_ordered > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {item.total_ordered} sold
              </div>
            )}
          </div>
          
          {/* Stock quantity indicator */}
          {item.track_inventory && item.available_quantity !== undefined && (
            <div className="text-xs text-gray-500 text-right">
              {item.available_quantity > 0 ? (
                <span>{item.available_quantity} left</span>
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
          disabled={!item.in_stock}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${compact ? 'text-sm' : 'text-base'} ${
            item.in_stock
              ? 'bg-[#c1902f] text-white hover:bg-[#d4a43f]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {item.in_stock ? 'Add to Cart' : 'Out of Stock'}
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