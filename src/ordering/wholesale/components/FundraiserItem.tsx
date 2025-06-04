// src/ordering/wholesale/components/FundraiserItem.tsx
import { memo, useState, useEffect } from 'react';
import { Plus, Edit3 } from 'lucide-react';
import { useWholesaleCartStore } from '../store/wholesaleCartStore';
import { FundraiserCustomizationModal } from './FundraiserCustomizationModal';
import useFundraiserItemOptionStore from '../store/fundraiserItemOptionStore';
import OptimizedImage from '../../../shared/components/ui/OptimizedImage';
import useIntersectionObserver from '../../../shared/hooks/useIntersectionObserver';
import ParticipantSelector from './ParticipantSelector';

// Reuse image loading pattern from MenuItem
const LazyFundraiserItemImage = memo(function LazyFundraiserItemImage({ 
  image, 
  name, 
  isFirstVisible = false,
  index = 0,
}: {
  image: string | undefined | null;
  name: string;
  isFirstVisible?: boolean;
  index?: number;
}) {
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin: '300px',
    triggerOnce: true,
    threshold: 0.1
  });

  const isImportantForLCP = isFirstVisible || index < 6;

  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>} 
      className="w-full h-48 bg-gray-100 overflow-hidden"
      style={{ contain: 'paint layout' }}
    >
      {isVisible ? (
        <OptimizedImage
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          priority={isImportantForLCP}
          fallbackSrc="/images/default-fundraiser-item.jpg"
        />
      ) : null}
    </div>
  );
});

interface FundraiserItemProps {
  item: {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    description?: string;
  };
  fundraiserId: number;
  participants?: Array<{id: number, name: string}>;
  selectedParticipantId?: number;
  onParticipantSelect?: (participantId: number) => void;
  index?: number;
  hasOptions?: boolean;
}

export const FundraiserItem = memo(function FundraiserItem({ 
  item, 
  fundraiserId,
  participants,
  selectedParticipantId,
  onParticipantSelect,
  index = 0
}: FundraiserItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const addToCart = useWholesaleCartStore((state) => state.addToCart);
  
  // Get option groups for this item using our store
  const { fetchOptionGroups, getOptionGroupsForItem } = useFundraiserItemOptionStore();
  const optionGroups = getOptionGroupsForItem(item.id);
  
  // Fetch option groups if not already in the cache
  useEffect(() => {
    if (!optionGroups) {
      fetchOptionGroups(item.id, fundraiserId);
    }
  }, [fetchOptionGroups, item.id, fundraiserId, optionGroups]);

  // Check if this item has options that need to be selected
  const hasOptionGroups = optionGroups && optionGroups.length > 0;
  
  function handleQuickAdd() {
    // Add directly to cart without customization
    addToCart({
      id: item.id.toString(),
      name: item.name,
      price: item.price,
      image: item.imageUrl,
      fundraiserId,
      participantId: selectedParticipantId,
      quantity: 1,
    });
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 300);
  }

  function handleOpenCustomization() {
    setIsModalOpen(true);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md overflow-hidden flex flex-col min-h-[380px] animate-fadeIn
      border border-gray-100 hover:border-gray-200 transition-all duration-300">
      <LazyFundraiserItemImage 
        image={item.imageUrl}
        name={item.name}
        isFirstVisible={index === 0}
        index={index}
      />
      
      <div className="p-5 flex flex-col flex-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#c1902f] transition-colors">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {participants && participants.length > 0 && (
          <div className="mt-4">
            <ParticipantSelector
              fundraiserId={fundraiserId}
              selectedParticipantId={selectedParticipantId}
              onChange={onParticipantSelect || (() => {})}
              label="Support a Participant"
            />
          </div>
        )}

        <div className="mt-auto pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span className="text-lg font-semibold text-[#c1902f]">
            ${item.price.toFixed(2)}
          </span>
          {hasOptionGroups ? (
            <button
              onClick={handleOpenCustomization}
              className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent
                      text-sm font-medium rounded-md shadow-sm text-white bg-[#c1902f] hover:bg-[#a77927]
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]
                      transform hover:-translate-y-0.5 transition-all duration-200"
              disabled={participants && participants.length > 0 && !selectedParticipantId}
            >
              <Edit3 className="h-5 w-5 mr-2" />
              Customize
            </button>
          ) : (
            <button
              onClick={handleQuickAdd}
              disabled={participants && participants.length > 0 && !selectedParticipantId}
              className={`w-full md:w-auto flex items-center justify-center px-4 py-2
                rounded-md shadow-sm text-sm font-medium text-white
                transition-transform
                ${(participants && participants.length > 0 && !selectedParticipantId)
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#c1902f] hover:bg-[#a77927]'
                }
                ${buttonClicked ? 'animate-bounce' : ''}
              `}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add to Cart
            </button>
          )}
        </div>
      </div>

      {/* Customization Modal - Only shown when isModalOpen is true and we have option groups */}
      {isModalOpen && optionGroups && optionGroups.length > 0 && (
        <FundraiserCustomizationModal
          item={item}
          optionGroups={optionGroups}
          onClose={() => setIsModalOpen(false)}
          fundraiserId={fundraiserId}
          participantId={selectedParticipantId}
        />
      )}
    </div>
  );
});

export default FundraiserItem;
