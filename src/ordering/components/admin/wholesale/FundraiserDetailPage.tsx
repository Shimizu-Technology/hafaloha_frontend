// src/ordering/components/admin/wholesale/FundraiserDetailPage.tsx

import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Users,
  Package,
  ShoppingBag,
  BarChart3,
  Edit2,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  FileText
} from 'lucide-react';
import ItemManager from './ItemManager';
import ParticipantManager from './ParticipantManager';
import OrderManager from './OrderManager';
import AnalyticsManager from './AnalyticsManager';

interface Fundraiser {
  id: number;
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  contact_email: string;
  contact_phone?: string;
  status: string;
  active: boolean;
  participant_count: number;
  item_count: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  // Pickup information
  pickup_location_name?: string;
  pickup_address?: string;
  pickup_instructions?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_hours?: string;
  has_custom_pickup_location?: boolean;
  pickup_display_name?: string;
  pickup_display_address?: string;
}

interface FundraiserDetailPageProps {
  fundraiser: Fundraiser;
  restaurantId: string;
  onBack: () => void;
  onEdit?: (fundraiser: Fundraiser) => void;
}

type DetailTab = 'overview' | 'items' | 'participants' | 'orders' | 'analytics';

const tabs: Array<{
  id: DetailTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Fundraiser summary and key metrics'
  },
  {
    id: 'items',
    label: 'Items',
    icon: Package,
    description: 'Manage products for this fundraiser'
  },
  {
    id: 'participants',
    label: 'Participants',
    icon: Users,
    description: 'Manage participants and goals'
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    description: 'View and manage orders'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    description: 'Performance metrics and insights'
  }
];

export function FundraiserDetailPage({ fundraiser, restaurantId, onBack, onEdit }: FundraiserDetailPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Items</p>
                    <p className="text-2xl font-semibold text-gray-900">{fundraiser.item_count}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Participants</p>
                    <p className="text-2xl font-semibold text-gray-900">{fundraiser.participant_count}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <ShoppingBag className="w-8 h-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">{fundraiser.total_orders}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-xl font-semibold text-gray-900">{formatCurrency(fundraiser.total_revenue)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('items')}
                  className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Package className="w-5 h-5 mr-2" />
                  Manage Items
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Manage Participants
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  View Orders
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex items-center justify-center px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Analytics
                </button>
              </div>
            </div>

            {/* Pickup Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Pickup Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pickup Location</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-900">
                        {fundraiser.pickup_display_name || 'Default Restaurant Location'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {fundraiser.pickup_display_address || 'Restaurant address will be used'}
                      </div>
                      {fundraiser.has_custom_pickup_location && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Custom Pickup Location
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {fundraiser.pickup_contact_name && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Pickup Contact</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center text-gray-900">
                          <User className="w-4 h-4 mr-2 text-gray-500" />
                          {fundraiser.pickup_contact_name}
                        </div>
                        {fundraiser.pickup_contact_phone && (
                          <div className="flex items-center text-gray-700 mt-1">
                            <Phone className="w-4 h-4 mr-2 text-gray-500" />
                            {fundraiser.pickup_contact_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {fundraiser.pickup_hours && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Pickup Hours</h4>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-start text-green-800">
                          <Clock className="w-4 h-4 mr-2 text-green-600 mt-0.5" />
                          <span className="whitespace-pre-wrap">{fundraiser.pickup_hours}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {fundraiser.pickup_instructions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Pickup Instructions</h4>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-start text-blue-800">
                          <FileText className="w-4 h-4 mr-2 text-blue-600 mt-0.5" />
                          <span className="whitespace-pre-wrap">{fundraiser.pickup_instructions}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!fundraiser.pickup_hours && !fundraiser.pickup_instructions && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="flex items-center text-yellow-800">
                        <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                        <span className="text-sm">No specific pickup hours or instructions set. Default restaurant information will be used.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-green-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Contact</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-900">
                      <Mail className="w-4 h-4 mr-2 text-gray-500" />
                      <a href={`mailto:${fundraiser.contact_email}`} className="text-blue-600 hover:text-blue-800">
                        {fundraiser.contact_email}
                      </a>
                    </div>
                    {fundraiser.contact_phone && (
                      <div className="flex items-center text-gray-900">
                        <Phone className="w-4 h-4 mr-2 text-gray-500" />
                        <a href={`tel:${fundraiser.contact_phone}`} className="text-blue-600 hover:text-blue-800">
                          {fundraiser.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fundraiser Status</h4>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fundraiser.status)}`}>
                      {fundraiser.active ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      )}
                      {fundraiser.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fundraiser Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fundraiser Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-900">{fundraiser.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Created Date</h4>
                  <div className="flex items-center text-gray-900">
                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDate(fundraiser.created_at)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Duration</h4>
                  <div className="flex items-center text-gray-900">
                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDate(fundraiser.start_date)} - {fundraiser.end_date ? formatDate(fundraiser.end_date) : 'Ongoing'}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Slug</h4>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{fundraiser.slug}</code>
                </div>
              </div>
            </div>
          </div>
        );

      case 'items':
        return <ItemManager restaurantId={restaurantId} fundraiserId={fundraiser.id} />;

      case 'participants':
        return <ParticipantManager restaurantId={restaurantId} fundraiserId={fundraiser.id} />;

      case 'orders':
        return <OrderManager restaurantId={restaurantId} fundraiserId={fundraiser.id} />;

      case 'analytics':
        return <AnalyticsManager restaurantId={restaurantId} fundraiserId={fundraiser.id} />;

      default:
        return <div className="text-center py-12 text-gray-500">Tab content not found</div>;
    }
  };

  return (
    <div className="fundraiser-detail-page">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Fundraisers
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                {fundraiser.name}
                {fundraiser.active ? (
                  <CheckCircle className="w-6 h-6 ml-2 text-green-500" title="Active" />
                ) : (
                  <AlertCircle className="w-6 h-6 ml-2 text-gray-400" title="Inactive" />
                )}
              </h1>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fundraiser.status)}`}>
                  {fundraiser.status.charAt(0).toUpperCase() + fundraiser.status.slice(1)}
                </span>
                <span className="text-gray-500 text-sm ml-3">ID: {fundraiser.id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {onEdit && (
              <button 
                onClick={() => onEdit(fundraiser)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Fundraiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto" role="tablist">
            {tabs.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex-shrink-0 px-6 py-4 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                title={description}
              >
                <Icon className="w-5 h-5 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default FundraiserDetailPage;