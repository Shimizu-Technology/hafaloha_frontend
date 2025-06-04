// src/ordering/wholesale/components/admin/FundraiserDetailsPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { Button } from '../../../../shared/components/ui';
import { Fundraiser } from '../../types/fundraiser';
import fundraiserService from '../../services/fundraiserService';
import ParticipantManager from './ParticipantManager';
import FundraiserItemManager from './FundraiserItemManager';
import FundraiserOrderManager from './FundraiserOrderManager';
import toastUtils from '../../../../shared/utils/toastUtils';

const FundraiserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fundraiserId = parseInt(id || '0');
  
  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  
  useEffect(() => {
    if (fundraiserId) {
      fetchFundraiser();
    }
  }, [fundraiserId]);
  
  const fetchFundraiser = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fundraiserService.getFundraiser(fundraiserId);
      setFundraiser(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching fundraiser:', err);
      setError('Failed to load fundraiser details. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleEditFundraiser = () => {
    // Navigate to edit page or open edit modal
    navigate(`/wholesale/admin/fundraisers/edit/${fundraiserId}`);
  };
  
  const handleBackClick = () => {
    navigate('/wholesale/admin/fundraisers');
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading fundraiser details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !fundraiser) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Fundraiser not found'}
        </div>
        <Button onClick={handleBackClick} className="flex items-center">
          <ArrowLeft size={16} className="mr-2" />
          Back to Fundraisers
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <Button 
          onClick={handleBackClick}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center bg-transparent hover:bg-gray-100"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Fundraisers
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{fundraiser.name}</h1>
            <p className="text-gray-600">
              Status: <span className={`font-medium ${fundraiser.active ? 'text-green-600' : 'text-gray-600'}`}>
                {fundraiser.active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          <Button
            onClick={handleEditFundraiser}
            className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white flex items-center"
          >
            <Edit size={16} className="mr-2" />
            Edit Fundraiser
          </Button>
        </div>
      </div>
      
      {/* Banner Image */}
      {fundraiser.banner_image_url && (
        <div className="mb-6 rounded-lg overflow-hidden shadow-md">
          <img 
            src={fundraiser.banner_image_url} 
            alt={fundraiser.name} 
            className="w-full h-48 md:h-64 object-cover"
          />
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b mb-4">
          <button 
            onClick={() => setActiveTab('details')} 
            className={`px-4 py-2 font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('participants')} 
            className={`px-4 py-2 font-medium ${activeTab === 'participants' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Participants
          </button>
          <button 
            onClick={() => setActiveTab('items')} 
            className={`px-4 py-2 font-medium ${activeTab === 'items' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Items
          </button>
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`px-4 py-2 font-medium ${activeTab === 'orders' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Orders
          </button>
        </div>
        
        {activeTab === 'details' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Fundraiser Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1">{fundraiser.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Slug</h3>
                    <p className="mt-1">{fundraiser.slug}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1">{fundraiser.description || 'No description provided'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Dates & Status</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                    <p className="mt-1">{formatDate(fundraiser.start_date || null)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                    <p className="mt-1">{formatDate(fundraiser.end_date || null)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${fundraiser.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {fundraiser.active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                    <p className="mt-1">{formatDate(fundraiser.created_at || null)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Public Fundraiser URL</h2>
              <div className="bg-gray-50 p-4 rounded border">
                <p className="text-sm text-gray-600 mb-2">Share this URL with supporters to access the fundraiser:</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={`${window.location.origin}/wholesale/fundraiser/${fundraiser.slug}`}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/wholesale/fundraiser/${fundraiser.slug}`);
                      toastUtils.success('URL copied to clipboard!');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-l-none"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'participants' && (
          <ParticipantManager fundraiserId={fundraiserId} fundraiserName={fundraiser.name} />
        )}
        
        {activeTab === 'items' && (
          <FundraiserItemManager fundraiserId={fundraiserId} fundraiserName={fundraiser.name} />
        )}
        
        {activeTab === 'orders' && (
          <FundraiserOrderManager fundraiserId={fundraiserId} fundraiserName={fundraiser.name} />
        )}
      </div>
    </div>
  );
};

export default FundraiserDetailsPage;
