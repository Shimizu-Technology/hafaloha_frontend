// src/ordering/wholesale/components/FundraiserCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Fundraiser } from '../services/fundraiserService';

interface FundraiserCardProps {
  fundraiser: Fundraiser;
  featured?: boolean;
}

const FundraiserCard: React.FC<FundraiserCardProps> = ({ fundraiser, featured = false }) => {
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ongoing';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate status
  const getStatus = () => {
    const now = new Date();
    
    if (!fundraiser.active) {
      return { label: 'Inactive', color: 'bg-gray-400' };
    }
    
    if (fundraiser.start_date && new Date(fundraiser.start_date) > now) {
      return { label: 'Upcoming', color: 'bg-blue-500' };
    }
    
    if (fundraiser.end_date && new Date(fundraiser.end_date) < now) {
      return { label: 'Ended', color: 'bg-red-500' };
    }
    
    return { label: 'Active', color: 'bg-green-500' };
  };
  
  const status = getStatus();
  
  // Default image if none provided
  const imageUrl = fundraiser.banner_image_url || 'https://via.placeholder.com/400x200?text=Fundraiser';

  return (
    <div className={`bg-white rounded-lg ${featured ? 'ring-2 ring-[#c1902f]' : ''} shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1`}>
      <div className="relative">
        <img 
          src={imageUrl} 
          alt={fundraiser.name} 
          className="w-full h-48 object-cover"
        />
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <Link to={`/wholesale/${fundraiser.slug}`} className="text-lg font-semibold text-gray-900 hover:text-[#c1902f] transition-colors duration-200">
            {fundraiser.name}
          </Link>
          <div className="flex gap-2">
            {fundraiser.featured && (
              <div className="bg-[#c1902f] text-white text-xs font-bold px-2 py-1 rounded-full">
                Featured
              </div>
            )}
            <div className={`${status.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
              {status.label}
            </div>
          </div>
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-3">{fundraiser.description}</p>
        
        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <div>
            <span className="font-medium">Start:</span> {formatDate(fundraiser.start_date)}
          </div>
          <div>
            <span className="font-medium">End:</span> {formatDate(fundraiser.end_date)}
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <Link 
            to={`/wholesale/${fundraiser.slug}`}
            className="inline-flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium transition-colors duration-200"
          >
            View Details
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FundraiserCard;
