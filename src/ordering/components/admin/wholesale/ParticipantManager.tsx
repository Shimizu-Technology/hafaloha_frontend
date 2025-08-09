// src/ordering/components/admin/wholesale/ParticipantManager.tsx

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Image,
  Upload,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Award,
  BarChart3,
  Calendar
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient } from '../../../../shared/api/apiClient';

interface WholesaleParticipant {
  id: number;
  fundraiser_id: number;
  fundraiser_name: string;
  name: string;
  slug: string;
  description: string;
  photo_url?: string;
  goal_amount?: number | null;
  current_amount?: number | null;
  goal_progress_percentage?: number | null;
  total_orders_count?: number | null;
  total_raised?: number | null;
  position: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ParticipantFormData {
  fundraiser_id: number;
  name: string;
  description: string;
  goal_amount: string;
  position: number;
  sort_order: number;
}

interface ParticipantManagerProps {
  restaurantId: string;
  fundraiserId?: number; // Optional for backwards compatibility
}

export function ParticipantManager({ restaurantId, fundraiserId }: ParticipantManagerProps) {
  // State management
  const [participants, setParticipants] = useState<WholesaleParticipant[]>([]);
  const [fundraisers, setFundraisers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form and editing state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ParticipantFormData>({
    fundraiser_id: 0,
    name: '',
    description: '',
    goal_amount: '',
    position: 0,
    sort_order: 0
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'goal_progress_percentage' | 'total_raised'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [restaurantId, fundraiserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use apiClient for proper base URL and authentication
      if (fundraiserId) {
        // Scoped mode: Load participants for specific fundraiser
        const participantsResponse = await apiClient.get(`/wholesale/admin/participants?fundraiser_id=${fundraiserId}`);
        const participants = participantsResponse.data.success ? (participantsResponse.data.data?.participants || []) : [];
        setParticipants(participants);
      } else {
        // Legacy mode: Load all participants and fundraisers (for backwards compatibility)
        const [participantsResponse, fundraisersResponse] = await Promise.all([
          apiClient.get('/wholesale/admin/participants'),
          apiClient.get('/wholesale/admin/fundraisers')
        ]);
        
        const participants = participantsResponse.data.success ? (participantsResponse.data.data?.participants || []) : [];
        const fundraisers = fundraisersResponse.data.success ? (fundraisersResponse.data.data?.fundraisers || []) : [];
        
        setParticipants(participants);
        setFundraisers(fundraisers);
      }
      
    } catch (err) {
      console.error('Error loading participants:', err);
      setError('Failed to load participants');
      toastUtils.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      fundraiser_id: fundraiserId || 0,
      name: '',
      description: '',
      goal_amount: '',
      position: participants.length + 1,
      sort_order: participants.length + 1
    });
  };

  const handleEdit = (participant: WholesaleParticipant) => {
    setIsCreating(false);
    setEditingId(participant.id);
    setFormData({
      fundraiser_id: participant.fundraiser_id,
      name: participant.name || '',
      description: '',
      goal_amount: '',
      position: participant.position,
      sort_order: participant.sort_order
    });
  };

  const handleSave = async () => {
    try {
      // Basic validation
      if (!formData.name.trim()) {
        toastUtils.error('Participant name is required');
        return;
      }
      
      if (!formData.fundraiser_id) {
        toastUtils.error('Please select a fundraiser');
        return;
      }
      
      // Goal amount/description temporarily disabled; no validation needed

      // Make actual API calls using apiClient
      if (isCreating) {
        await apiClient.post('/wholesale/admin/participants', { participant: formData });
        toastUtils.success('Participant created successfully!');
      } else {
        await apiClient.patch(`/wholesale/admin/participants/${editingId}`, { participant: formData });
        toastUtils.success('Participant updated successfully!');
      }
      
      // Reset form and refresh data
      setIsCreating(false);
      setEditingId(null);
      loadData();
      
    } catch (err) {
      console.error('Error saving participant:', err);
      toastUtils.error(isCreating ? 'Failed to create participant' : 'Failed to update participant');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this participant? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/wholesale/admin/participants/${id}`);
      toastUtils.success('Participant deleted successfully');
      loadData();
    } catch (err) {
      console.error('Error deleting participant:', err);
      toastUtils.error('Failed to delete participant');
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await apiClient.patch(`/wholesale/admin/participants/${id}/toggle_active`);
      toastUtils.success(`Participant ${!currentActive ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (err) {
      console.error('Error toggling participant status:', err);
      toastUtils.error('Failed to update participant status');
    }
  };

  // Filter and sort participants
  const filteredAndSortedParticipants = participants
    .filter(participant => {
      const matchesSearch = participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           participant.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesProgress = true;
      if (progressFilter === 'high') {
        matchesProgress = (participant.goal_progress_percentage || 0) >= 75;
      } else if (progressFilter === 'medium') {
        const progress = participant.goal_progress_percentage || 0;
        matchesProgress = progress >= 25 && progress < 75;
      } else if (progressFilter === 'low') {
        matchesProgress = (participant.goal_progress_percentage || 0) < 25;
      }
      
      return matchesSearch && matchesProgress;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'goal_progress_percentage':
          aValue = a.goal_progress_percentage || 0;
          bValue = b.goal_progress_percentage || 0;
          break;
        case 'total_raised':
          aValue = a.total_raised || 0;
          bValue = b.total_raised || 0;
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProgressColor = (percentage?: number | null) => {
    if (!percentage || percentage < 0) return 'bg-gray-400';
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressBadgeColor = (percentage?: number | null) => {
    if (!percentage || percentage < 0) return 'bg-gray-100 text-gray-600';
    if (percentage >= 75) return 'bg-green-100 text-green-800';
    if (percentage >= 50) return 'bg-blue-100 text-blue-800';
    if (percentage >= 25) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Participants</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          onClick={loadData}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="participant-manager">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Participant Management</h2>
          <p className="text-gray-600">Manage fundraiser participants, goals, and performance tracking</p>
        </div>
        
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Participant
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>



          {/* Progress filter */}
          <select
            value={progressFilter}
            onChange={(e) => setProgressFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Progress Levels</option>
            <option value="high">High Progress (75%+)</option>
            <option value="medium">Medium Progress (25-75%)</option>
            <option value="low">Low Progress (&lt;25%)</option>
          </select>

          {/* Sort by */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at">Created Date</option>
            <option value="name">Name</option>
            {/* Progress and amount raised temporarily removed */}
          </select>

          {/* Sort order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Participants grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredAndSortedParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || progressFilter !== 'all' ? 'No participants found' : 'No participants yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || progressFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : fundraiserId 
                  ? 'No participants have been added to this fundraiser yet'
                  : 'Add your first participant to get started'
              }
            </p>
            {(!searchQuery && progressFilter === 'all') && (
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Participant
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  {!fundraiserId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fundraiser
                    </th>
                  )}
                  {/* Goal Progress column removed */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {participant.name}
                            {!participant.active && (
                              <EyeOff className="w-4 h-4 ml-2 text-gray-400" title="Inactive" />
                            )}
                            {(participant.goal_progress_percentage || 0) >= 100 && (
                              <Award className="w-4 h-4 ml-2 text-yellow-500" title="Goal Achieved!" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{participant.description}</div>
                        </div>
                      </div>
                    </td>
                    {!fundraiserId && (
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {participant.fundraiser_name}
                      </td>
                    )}
                    {/* Goal progress cell removed */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-gray-600">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {participant.total_orders_count || 0} orders
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(participant.total_raised)} raised
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleActive(participant.id, participant.active)}
                          className="text-gray-400 hover:text-gray-600"
                          title={participant.active ? 'Deactivate' : 'Activate'}
                        >
                          {participant.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(participant)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(participant.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingId !== null) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {isCreating ? 'Add New Participant' : 'Edit Participant'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Participant Information</h4>
                <div className="grid grid-cols-1 gap-4">
                  {!fundraiserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fundraiser *
                      </label>
                      <select
                        value={formData.fundraiser_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, fundraiser_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value={0}>Select a fundraiser</option>
                        {fundraisers.map(fundraiser => (
                          <option key={fundraiser.id} value={fundraiser.id}>
                            {fundraiser.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Participant Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter participant name"
                      required
                    />
                  </div>

                  {/* Goal amount and description temporarily removed */}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isCreating ? 'Add Participant' : 'Update Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParticipantManager;