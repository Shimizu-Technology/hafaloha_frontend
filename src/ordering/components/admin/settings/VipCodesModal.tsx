import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Plus, Copy, Trash, Download } from 'lucide-react';
import { generateVipCodes, getVipCodes } from '../../../../shared/api/endpoints/vipAccess';
import { LoadingSpinner } from '../../../../shared/components/ui/LoadingSpinner';
import { handleApiError } from '../../../../shared/utils/errorHandler';

interface VipCodesModalProps {
  specialEventId: number;
  restaurantId: number;
  eventName: string;
  onClose: () => void;
}

interface VipCode {
  id: number;
  code: string;
  name: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  group_id: string | null;
}

export function VipCodesModal({ specialEventId, restaurantId, eventName, onClose }: VipCodesModalProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [vipCodes, setVipCodes] = useState<VipCode[]>([]);
  const [formData, setFormData] = useState({
    batch: true,
    count: 10,
    name: 'Individual VIP',
    max_uses: 1,
  });

  const fetchVipCodes = async () => {
    setLoading(true);
    try {
      const data = await getVipCodes(specialEventId, restaurantId);
      setVipCodes(data as VipCode[]);
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to fetch VIP codes:', errorMessage);
      toast.error('Failed to fetch VIP codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVipCodes();
  }, [specialEventId, restaurantId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'count' || name === 'max_uses') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.batch && (formData.count <= 0 || formData.count > 100)) {
      toast.error('Count must be between 1 and 100');
      return;
    }
    
    setGenerating(true);
    try {
      await generateVipCodes(specialEventId, restaurantId, formData);
      toast.success(`VIP codes generated successfully`);
      fetchVipCodes();
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to generate VIP codes:', errorMessage);
      toast.error(`Failed to generate VIP codes: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  const downloadCodes = () => {
    const csvContent = [
      ['Code', 'Name', 'Max Uses', 'Current Uses', 'Status'].join(','),
      ...vipCodes.map(code => [
        code.code,
        code.name,
        code.max_uses || 'Unlimited',
        code.current_uses,
        code.is_active ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vip-codes-${eventName.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">VIP Access Codes - {eventName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2">Generate VIP Codes</h3>
            <form onSubmit={handleGenerateCodes} className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="batch"
                    name="batch"
                    checked={formData.batch}
                    onChange={() => setFormData(prev => ({ ...prev, batch: true }))}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                  />
                  <label htmlFor="batch" className="ml-2 block text-sm text-gray-900">
                    Generate multiple individual codes
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="single"
                    name="batch"
                    checked={!formData.batch}
                    onChange={() => setFormData(prev => ({ ...prev, batch: false }))}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                  />
                  <label htmlFor="single" className="ml-2 block text-sm text-gray-900">
                    Generate a group code
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.batch && (
                  <div>
                    <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Codes
                    </label>
                    <input
                      type="number"
                      id="count"
                      name="count"
                      min="1"
                      max="100"
                      value={formData.count}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Code Name/Label
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                {!formData.batch && (
                  <div>
                    <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Uses (0 for unlimited)
                    </label>
                    <input
                      type="number"
                      id="max_uses"
                      name="max_uses"
                      min="0"
                      value={formData.max_uses}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center space-x-2 hover:bg-amber-700 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <LoadingSpinner className="h-4 w-4" showText={false} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Generate Codes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Existing VIP Codes</h3>
            {vipCodes.length > 0 && (
              <button
                onClick={downloadCodes}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : vipCodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uses
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vipCodes.map((code) => (
                    <tr key={code.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {code.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.current_uses} / {code.max_uses || '∞'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          code.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {code.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No VIP codes found. Generate codes using the form above.</p>
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
