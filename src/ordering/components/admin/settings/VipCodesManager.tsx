// src/ordering/components/admin/settings/VipCodesManager.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { 
  getVipCodes, 
  generateIndividualCodes, 
  generateGroupCode,
  deactivateVipCode,
  updateVipCode,
  archiveVipCode
} from '../../../../shared/api/endpoints/vipCodes';
import { LoadingSpinner } from '../../../../shared/components/ui/LoadingSpinner';
import { Clipboard, Check, X, Edit, Save, Archive, Eye, EyeOff, BarChart } from 'lucide-react';
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
}

export const VipCodesManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [vipCodes, setVipCodes] = useState<VipAccessCode[]>([]);
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
  const [viewingUsageForCode, setViewingUsageForCode] = useState<number | null>(null);
  
  const { restaurant } = useRestaurantStore();
  
  // Fetch VIP codes
  useEffect(() => {
    if (!restaurant?.id) return;
    
    const fetchVipCodes = async () => {
      setLoading(true);
      try {
        const codes = await getVipCodes(undefined, { include_archived: showArchived });
        setVipCodes(codes as VipAccessCode[]);
      } catch (error) {
        console.error('Error fetching VIP codes:', error);
        toast.error('Failed to load VIP codes');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVipCodes();
  }, [restaurant?.id, showArchived]);
  
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
      setVipCodes(prev => [...newCodes, ...prev]);
    } catch (error) {
      console.error('Error generating VIP codes:', error);
      toast.error('Failed to generate VIP codes');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeactivateCode = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this VIP code?')) return;
    
    setLoading(true);
    try {
      await deactivateVipCode(id);
      
      // Update the local state
      setVipCodes(prev => 
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
  
  const handleArchiveCode = async (id: number) => {
    if (!confirm('Are you sure you want to archive this VIP code? It will be deactivated and hidden from the default view.')) return;
    
    setLoading(true);
    try {
      await archiveVipCode(id);
      
      // Update the local state
      if (showArchived) {
        setVipCodes(prev => 
          prev.map(code => 
            code.id === id ? { ...code, archived: true, is_active: false } : code
          )
        );
      } else {
        // If not showing archived, remove it from the list
        setVipCodes(prev => prev.filter(code => code.id !== id));
      }
      
      toast.success('VIP code archived');
    } catch (error) {
      console.error('Error archiving VIP code:', error);
      toast.error('Failed to archive VIP code');
    } finally {
      setLoading(false);
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
      setVipCodes(prev => 
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
  
  if (loading && !vipCodes.length) return <LoadingSpinner />;
  
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">VIP Codes</h2>
      
      {/* Code generation form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Generate VIP Codes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code Type
            </label>
            <div className="flex space-x-4">
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
            
            <div>
              <div className="flex items-center mb-2">
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
              
              {formData.limitedUses && (
                <>
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
                </>
              )}
            </div>
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
      {vipCodes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">VIP Codes List</h3>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
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
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vipCodes.map(code => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2">{code.code}</span>
                        <button 
                          onClick={() => copyToClipboard(code.code, code.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedCode === code.id ? <Check size={16} /> : <Clipboard size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.group_id ? 'Group' : 'Individual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.current_uses} / {code.max_uses || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        code.archived 
                          ? 'bg-gray-100 text-gray-800' 
                          : code.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {code.archived ? 'Archived' : code.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingUsageForCode(code.id)}
                          className="text-amber-500 hover:text-amber-700"
                          title="View Usage"
                        >
                          <BarChart size={16} />
                        </button>
                        
                        {!code.archived && (
                          <>
                            <button
                              onClick={() => handleEditCode(code)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            {code.is_active && (
                              <button
                                onClick={() => handleDeactivateCode(code.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Deactivate"
                              >
                                <X size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleArchiveCode(code.id)}
                              className="text-gray-500 hover:text-gray-700"
                              title="Archive"
                            >
                              <Archive size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Edit VIP Code Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit VIP Code</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={editingCode.code}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
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
              
              <div>
                <div className="flex items-center mb-2">
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
                  <>
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
                  </>
                )}
              </div>
              
              <div>
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
