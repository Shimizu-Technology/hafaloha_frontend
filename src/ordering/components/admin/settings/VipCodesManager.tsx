// src/ordering/components/admin/settings/VipCodesManager.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { 
  getVipCodes, 
  generateIndividualCodes, 
  generateGroupCode,
  deactivateVipCode,
  reactivateVipCode,
  updateVipCode,
  archiveVipCode,
  unarchiveVipCode
} from '../../../../shared/api/endpoints/vipCodes';
import { LoadingSpinner, SettingsHeader } from '../../../../shared/components/ui';
import { Clipboard, Check, X, Edit, Save, Archive, Eye, EyeOff, BarChart, Key, Calendar, Clock } from 'lucide-react';
import { VipCodeUsageModal } from './VipCodeUsageModal';

interface VipAccessCode {
  id: number;
  code: string;
  name: string;
  max_uses?: number | null;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  group_id?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const VipCodesManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fetchingCodes, setFetchingCodes] = useState(false);
  const [allVipCodes, setAllVipCodes] = useState<VipAccessCode[]>([]);
  const [codeType, setCodeType] = useState<'individual' | 'group'>('individual');
  const [formData, setFormData] = useState({
    count: 10,
    name: '',
    prefix: '',
    maxUses: '',
    limitedUses: false,
  });
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState<VipAccessCode | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    maxUses: '',
    limitedUses: false,
    isActive: true
  });
  const [showArchived, setShowArchived] = useState(false);
  const [viewingDetailsForCode, setViewingDetailsForCode] = useState<VipAccessCode | null>(null);
  const [viewingUsageForCode, setViewingUsageForCode] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'code' | 'current_uses'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCodes, setSelectedCodes] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const { restaurant } = useRestaurantStore();
  
  // Fetch all VIP codes (including archived) on initial load
  useEffect(() => {
    if (!restaurant?.id) return;
    
    const fetchVipCodes = async () => {
      setFetchingCodes(true);
      try {
        const codes = await getVipCodes(undefined, { include_archived: true });
        setAllVipCodes(codes as VipAccessCode[]);
      } catch (error) {
        console.error('Error fetching VIP codes:', error);
        toast.error('Failed to load VIP codes');
      } finally {
        setFetchingCodes(false);
      }
    };
    
    fetchVipCodes();
  }, [restaurant?.id]);
  
  // Filter by archived status, search term, and sort
  const filteredAndSortedCodes = useMemo(() => {
    // First filter by archived status
    let filtered = allVipCodes;
    if (!showArchived) {
      filtered = filtered.filter(code => !code.archived);
    }
    
    // Then filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(code => 
        code.name.toLowerCase().includes(term) || 
        code.code.toLowerCase().includes(term)
      );
    }
    
    // Then sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'current_uses':
          comparison = a.current_uses - b.current_uses;
          break;
        case 'created_at':
        default:
          // Assuming created_at is a string in ISO format
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allVipCodes, showArchived, searchTerm, sortField, sortDirection]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleGenerateCodes = async () => {
    if (!restaurant) return;
    
    setLoading(true);
    try {
      let newCodes;
      
      if (codeType === 'individual') {
        // Generate individual codes
        const params = {
          count: parseInt(formData.count.toString()),
          name: formData.name || 'Individual VIP',
          prefix: formData.prefix || undefined,
          max_uses: formData.limitedUses && formData.maxUses ? parseInt(formData.maxUses) : null,
        };
        
        newCodes = await generateIndividualCodes(params) as VipAccessCode[];
      } else {
        // Generate group code
        const params = {
          name: formData.name || 'Group VIP',
          prefix: formData.prefix || undefined,
          max_uses: formData.limitedUses && formData.maxUses ? parseInt(formData.maxUses) : null,
        };
        
        const groupCode = await generateGroupCode(params) as VipAccessCode;
        newCodes = [groupCode]; // Wrap single code in array for consistent handling
      }
      
      toast.success(`Generated ${codeType === 'individual' ? formData.count : 1} VIP code(s)`);
      
      // Update the codes list
      setAllVipCodes(prev => [...newCodes, ...prev]);
    } catch (error) {
      console.error('Error generating VIP codes:', error);
      toast.error('Failed to generate VIP codes');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting/deselecting a single code
  const handleSelectCode = (id: number) => {
    setSelectedCodes(prev => 
      prev.includes(id) 
        ? prev.filter(codeId => codeId !== id) 
        : [...prev, id]
    );
  };
  
  // Handle selecting/deselecting all visible codes
  const handleSelectAll = () => {
    if (selectedCodes.length === filteredAndSortedCodes.length) {
      // If all are selected, deselect all
      setSelectedCodes([]);
    } else {
      // Otherwise, select all visible codes
      setSelectedCodes(filteredAndSortedCodes.map(code => code.id));
    }
  };
  
  // Clear selections when filter changes
  useEffect(() => {
    setSelectedCodes([]);
  }, [showArchived, searchTerm]);
  
  const handleDeactivateCode = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this VIP code?')) return;
    
    setLoading(true);
    try {
      await deactivateVipCode(id);
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          code.id === id ? { ...code, is_active: false } : code
        )
      );
      
      toast.success('VIP code deactivated');
    } catch (error) {
      console.error('Error deactivating VIP code:', error);
      toast.error('Failed to deactivate VIP code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReactivateCode = async (id: number) => {
    if (!confirm('Are you sure you want to reactivate this VIP code?')) return;
    
    setLoading(true);
    try {
      await reactivateVipCode(id);
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          code.id === id ? { ...code, is_active: true } : code
        )
      );
      
      toast.success('VIP code reactivated');
    } catch (error) {
      console.error('Error reactivating VIP code:', error);
      toast.error('Failed to reactivate VIP code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBulkDeactivate = async () => {
    if (!selectedCodes.length) return;
    if (!confirm(`Are you sure you want to deactivate ${selectedCodes.length} VIP code(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      // Process codes in sequence to avoid overwhelming the server
      for (const id of selectedCodes) {
        await deactivateVipCode(id);
      }
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          selectedCodes.includes(code.id) ? { ...code, is_active: false } : code
        )
      );
      
      toast.success(`${selectedCodes.length} VIP code(s) deactivated`);
      setSelectedCodes([]); // Clear selection after bulk action
    } catch (error) {
      console.error('Error deactivating VIP codes:', error);
      toast.error('Failed to deactivate some VIP codes');
    } finally {
      setBulkActionLoading(false);
    }
  };
  
  const handleUnarchiveCode = async (id: number) => {
    if (!confirm('Are you sure you want to unarchive this VIP code?')) return;
    
    setLoading(true);
    try {
      await unarchiveVipCode(id);
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          code.id === id ? { ...code, archived: false } : code
        )
      );
      
      toast.success('VIP code unarchived');
    } catch (error) {
      console.error('Error unarchiving VIP code:', error);
      toast.error('Failed to unarchive VIP code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBulkReactivate = async () => {
    if (!selectedCodes.length) return;
    if (!confirm(`Are you sure you want to reactivate ${selectedCodes.length} VIP code(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      // Process codes in sequence to avoid overwhelming the server
      for (const id of selectedCodes) {
        await reactivateVipCode(id);
      }
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          selectedCodes.includes(code.id) ? { ...code, is_active: true } : code
        )
      );
      
      toast.success(`${selectedCodes.length} VIP code(s) reactivated`);
      setSelectedCodes([]); // Clear selection after bulk action
    } catch (error) {
      console.error('Error reactivating VIP codes:', error);
      toast.error('Failed to reactivate some VIP codes');
    } finally {
      setBulkActionLoading(false);
    }
  };
  
  const handleBulkUnarchive = async () => {
    if (!selectedCodes.length) return;
    if (!confirm(`Are you sure you want to unarchive ${selectedCodes.length} VIP code(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      // Process codes in sequence to avoid overwhelming the server
      for (const id of selectedCodes) {
        await unarchiveVipCode(id);
      }
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          selectedCodes.includes(code.id) ? { ...code, archived: false } : code
        )
      );
      
      toast.success(`${selectedCodes.length} VIP code(s) unarchived`);
      setSelectedCodes([]); // Clear selection after bulk action
    } catch (error) {
      console.error('Error unarchiving VIP codes:', error);
      toast.error('Failed to unarchive some VIP codes');
    } finally {
      setBulkActionLoading(false);
    }
  };
  
  const handleArchiveCode = async (id: number) => {
    if (!confirm('Are you sure you want to archive this VIP code? It will be deactivated and hidden from the default view.')) return;
    
    setLoading(true);
    try {
      await archiveVipCode(id);
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          code.id === id ? { ...code, archived: true, is_active: false } : code
        )
      );
      
      toast.success('VIP code archived');
    } catch (error) {
      console.error('Error archiving VIP code:', error);
      toast.error('Failed to archive VIP code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBulkArchive = async () => {
    if (!selectedCodes.length) return;
    if (!confirm(`Are you sure you want to archive ${selectedCodes.length} VIP code(s)? They will be deactivated and hidden from the default view.`)) return;
    
    setBulkActionLoading(true);
    try {
      // Process codes in sequence to avoid overwhelming the server
      for (const id of selectedCodes) {
        await archiveVipCode(id);
      }
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          selectedCodes.includes(code.id) 
            ? { ...code, archived: true, is_active: false } 
            : code
        )
      );
      
      toast.success(`${selectedCodes.length} VIP code(s) archived`);
      setSelectedCodes([]); // Clear selection after bulk action
    } catch (error) {
      console.error('Error archiving VIP codes:', error);
      toast.error('Failed to archive some VIP codes');
    } finally {
      setBulkActionLoading(false);
    }
  };
  
  const handleEditCode = (code: VipAccessCode) => {
    setEditingCode(code);
    setEditFormData({
      name: code.name,
      maxUses: code.max_uses ? code.max_uses.toString() : '',
      limitedUses: !!code.max_uses,
      isActive: code.is_active
    });
  };
  
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSaveEdit = async () => {
    if (!editingCode) return;
    
    setLoading(true);
    try {
      const updateData: any = {
        name: editFormData.name,
        is_active: editFormData.isActive
      };
      
      // Only include max_uses if limitedUses is true
      if (editFormData.limitedUses) {
        updateData.max_uses = parseInt(editFormData.maxUses);
      } else {
        updateData.max_uses = null;
      }
      
      await updateVipCode(editingCode.id, updateData);
      
      // Update the local state
      setAllVipCodes(prev => 
        prev.map(code => 
          code.id === editingCode.id ? { 
            ...code, 
            name: editFormData.name,
            max_uses: editFormData.limitedUses ? parseInt(editFormData.maxUses) : null,
            is_active: editFormData.isActive
          } : code
        )
      );
      
      toast.success('VIP code updated');
      setEditingCode(null);
    } catch (error) {
      console.error('Error updating VIP code:', error);
      toast.error('Failed to update VIP code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingCode(null);
  };
  
  const copyToClipboard = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success('Code copied to clipboard');
    
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  const handleViewDetails = (code: VipAccessCode) => {
    setViewingDetailsForCode(code);
  };
  
  if (fetchingCodes && !allVipCodes.length) return <LoadingSpinner />;
  
  return (
    <div className="space-y-8">
      <SettingsHeader 
        title="VIP Codes"
        description="Manage VIP access codes for exclusive customer access."
        icon={<Key className="h-6 w-6" />}
      />
      
      {/* Code generation form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Generate VIP Codes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code Type
            </label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-amber-600"
                  checked={codeType === 'individual'}
                  onChange={() => setCodeType('individual')}
                />
                <span className="ml-2">Individual Codes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-amber-600"
                  checked={codeType === 'group'}
                  onChange={() => setCodeType('group')}
                />
                <span className="ml-2">Group Code</span>
              </label>
              <div className="ml-auto flex items-center">
                <input
                  type="checkbox"
                  id="limitedUses"
                  checked={formData.limitedUses}
                  onChange={() => setFormData(prev => ({ ...prev, limitedUses: !prev.limitedUses }))}
                  className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="limitedUses" className="text-sm font-medium text-gray-700">
                  Limited Uses
                </label>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {codeType === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Codes
                </label>
                <input
                  type="number"
                  name="count"
                  min="1"
                  max="100"
                  value={formData.count}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code Name/Label
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={codeType === 'individual' ? "Individual VIP" : "Group VIP"}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Prefix (optional)
              </label>
              <input
                type="text"
                name="prefix"
                value={formData.prefix}
                onChange={handleInputChange}
                placeholder="VIP"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            
            {formData.limitedUses && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {codeType === 'individual' ? 'Uses Per Code' : 'Total Uses'}
                </label>
                <input
                  type="number"
                  name="maxUses"
                  min="1"
                  value={formData.maxUses}
                  onChange={handleInputChange}
                  placeholder="Enter number of uses"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
          
          <button
            onClick={handleGenerateCodes}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : `Generate ${codeType === 'individual' ? 'Codes' : 'Code'}`}
          </button>
        </div>
      </div>
      
      {/* VIP codes list */}
      <div className="bg-white p-6 rounded-lg shadow overflow-hidden relative">
        {fetchingCodes && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <LoadingSpinner />
          </div>
        )}
        <div className="flex flex-wrap justify-between items-center mb-4">
          <h3 className="font-semibold">VIP Codes List</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mt-2 sm:mt-0"
            >
              {showArchived ? (
                <>
                  <EyeOff size={16} className="mr-1" />
                  Hide Archived
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-1" />
                  Show Archived
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Bulk actions */}
          {selectedCodes.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-md">
              <span className="text-sm font-medium text-amber-800">
                {selectedCodes.length} code(s) selected
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleBulkDeactivate}
                  disabled={bulkActionLoading || selectedCodes.every(id => !filteredAndSortedCodes.find(code => code.id === id)?.is_active)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deactivate All
                </button>
                <button
                  onClick={handleBulkReactivate}
                  disabled={bulkActionLoading || selectedCodes.every(id => filteredAndSortedCodes.find(code => code.id === id)?.is_active)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reactivate All
                </button>
                <button
                  onClick={handleBulkArchive}
                  disabled={bulkActionLoading || selectedCodes.every(id => filteredAndSortedCodes.find(code => code.id === id)?.archived)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Archive All
                </button>
                <button
                  onClick={handleBulkUnarchive}
                  disabled={bulkActionLoading || selectedCodes.every(id => !filteredAndSortedCodes.find(code => code.id === id)?.archived)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Unarchive All
                </button>
                <button
                  onClick={() => setSelectedCodes([])}
                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Search input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 pl-10"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Sort controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="created_at">Date Created</option>
              <option value="name">Name</option>
              <option value="code">Code</option>
              <option value="current_uses">Uses</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-md border border-gray-300 hover:bg-gray-100"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-full bg-white divide-y divide-gray-200 border border-gray-200 rounded-lg transition-all duration-300 ease-in-out">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCodes.length === filteredAndSortedCodes.length && filteredAndSortedCodes.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 transition-all duration-300 ease-in-out">
              {filteredAndSortedCodes.length > 0 ? (
                filteredAndSortedCodes.map((code: VipAccessCode) => (
                  <tr key={code.id} className={`hover:bg-gray-50 transition-colors ${selectedCodes.includes(code.id) ? 'bg-amber-50' : ''}`}>
                    <td className="px-2 py-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCodes.includes(code.id)}
                          onChange={() => handleSelectCode(code.id)}
                          className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2 truncate max-w-[100px] md:max-w-full">{code.code}</span>
                        <button 
                          onClick={() => copyToClipboard(code.code, code.id)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                          aria-label="Copy code"
                        >
                          {copiedCode === code.id ? <Check size={16} /> : <Clipboard size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[120px] md:max-w-full">{code.name}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">
                      {code.group_id ? 'Group' : 'Individual'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {code.current_uses} / {code.max_uses || '∞'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500" title={code.created_at ? formatDateTime(code.created_at) : ''}>
                      {code.created_at ? formatDate(code.created_at) : 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        code.archived 
                          ? 'bg-gray-100 text-gray-800' 
                          : code.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {code.archived ? 'Archived' : code.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => setViewingUsageForCode(code.id)}
                          className="p-1.5 rounded-full bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                          title="View Usage"
                          aria-label="View Usage"
                        >
                          <BarChart size={16} />
                        </button>
                        
                        {code.archived ? (
                          <button
                            onClick={() => handleUnarchiveCode(code.id)}
                            className="p-1.5 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            title="Unarchive"
                            aria-label="Unarchive"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="7 11 12 6 17 11"></polyline>
                              <path d="M12 18V6"></path>
                            </svg>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditCode(code)}
                              className="p-1.5 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            {code.is_active ? (
                              <button
                                onClick={() => handleDeactivateCode(code.id)}
                                className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                                title="Deactivate"
                                aria-label="Deactivate"
                              >
                                <X size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivateCode(code.id)}
                                className="p-1.5 rounded-full bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-700 transition-colors"
                                title="Reactivate"
                                aria-label="Reactivate"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleArchiveCode(code.id)}
                              className="p-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Archive"
                              aria-label="Archive"
                            >
                              <Archive size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'No matching VIP codes found' : 'No VIP codes found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit VIP Code Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit VIP Code</h3>
              <button 
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={editingCode.code}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-l-md bg-gray-100"
                  />
                  <button 
                    onClick={() => copyToClipboard(editingCode.code, editingCode.id)}
                    className="px-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-500 hover:text-gray-700"
                    title="Copy code"
                  >
                    {copiedCode === editingCode.id ? <Check size={16} /> : <Clipboard size={16} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name/Label
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="editLimitedUses"
                  name="limitedUses"
                  checked={editFormData.limitedUses}
                  onChange={handleEditInputChange}
                  className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="editLimitedUses" className="text-sm font-medium text-gray-700">
                  Limited Uses
                </label>
              </div>
              
              {editFormData.limitedUses && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Uses
                  </label>
                  <input
                    type="number"
                    name="maxUses"
                    min="1"
                    value={editFormData.maxUses}
                    onChange={handleEditInputChange}
                    placeholder="Enter number of uses"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
              
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    name="isActive"
                    checked={editFormData.isActive}
                    onChange={handleEditInputChange}
                    className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? 'Saving...' : 'Save'}
                  {!loading && <Save size={16} className="ml-2" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* VIP Code Usage Modal */}
      {viewingUsageForCode && (
        <VipCodeUsageModal
          codeId={viewingUsageForCode}
          onClose={() => setViewingUsageForCode(null)}
        />
      )}
    </div>
  );
};
