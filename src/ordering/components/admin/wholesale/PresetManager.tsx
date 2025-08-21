// src/ordering/components/admin/wholesale/PresetManager.tsx

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Package,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient } from '../../../../shared/api/apiClient';

// Interfaces (matching ItemManager.tsx)
interface WholesaleOptionPreset {
  id: number;
  name: string;
  additional_price: number;
  available: boolean;
  position: number;
  display_name: string;
  full_display_name: string;
  created_at: string;
  updated_at: string;
}

interface WholesaleOptionGroupPreset {
  id: number;
  name: string;
  description: string;
  min_select: number;
  max_select: number;
  required: boolean;
  position: number;
  enable_inventory_tracking: boolean;
  has_available_options: boolean;
  required_but_unavailable: boolean;
  inventory_tracking_enabled: boolean;
  option_presets_count: number;
  option_presets: WholesaleOptionPreset[];
  created_at: string;
  updated_at: string;
}

interface PresetFormData {
  name: string;
  description: string;
  min_select: number;
  max_select: number;
  required: boolean;
  enable_inventory_tracking: boolean;
  option_presets: OptionPresetFormData[];
}

interface OptionPresetFormData {
  name: string;
  additional_price: number;
  available: boolean;
  position: number;
}

interface PresetManagerProps {
  restaurantId: string;
  onDataChange?: () => void;
}

export function PresetManager({ restaurantId, onDataChange }: PresetManagerProps) {
  // State management
  const [presets, setPresets] = useState<WholesaleOptionGroupPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PresetFormData>({
    name: '',
    description: '',
    min_select: 1,
    max_select: 1,
    required: true,
    enable_inventory_tracking: false,
    option_presets: []
  });
  const [saving, setSaving] = useState(false);

  // Load presets on component mount
  useEffect(() => {
    loadPresets();
  }, [restaurantId]);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/wholesale/admin/option_group_presets');
      
      if (response.data.success) {
        setPresets(response.data.data?.option_group_presets || []);
      }
    } catch (err) {
      console.error('Error loading presets:', err);
      setError('Failed to load presets');
      toastUtils.error('Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      min_select: 1,
      max_select: 1,
      required: true,
      enable_inventory_tracking: false,
      option_presets: []
    });
  };

  const handleEdit = (preset: WholesaleOptionGroupPreset) => {
    setIsCreating(false);
    setEditingId(preset.id);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      min_select: preset.min_select,
      max_select: preset.max_select,
      required: preset.required,
      enable_inventory_tracking: preset.enable_inventory_tracking,
      option_presets: preset.option_presets.map(option => ({
        name: option.name,
        additional_price: option.additional_price,
        available: option.available,
        position: option.position
      }))
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Basic validation
      if (!formData.name.trim()) {
        toastUtils.error('Preset name is required');
        return;
      }
      
      if (formData.option_presets.length === 0) {
        toastUtils.error('At least one option is required');
        return;
      }

      const requestData = {
        option_group_preset: {
          name: formData.name,
          description: formData.description,
          min_select: formData.min_select,
          max_select: formData.max_select,
          required: formData.required,
          enable_inventory_tracking: formData.enable_inventory_tracking
        },
        option_presets: formData.option_presets
      };

      if (isCreating) {
        await apiClient.post('/wholesale/admin/option_group_presets', requestData);
        toastUtils.success('Preset created successfully!');
      } else {
        await apiClient.patch(`/wholesale/admin/option_group_presets/${editingId}`, requestData);
        toastUtils.success('Preset updated successfully!');
      }
      
      // Reset form and refresh data
      setIsCreating(false);
      setEditingId(null);
      loadPresets();
      onDataChange?.();
      
    } catch (err) {
      console.error('Error saving preset:', err);
      toastUtils.error(isCreating ? 'Failed to create preset' : 'Failed to update preset');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the preset "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/wholesale/admin/option_group_presets/${id}`);
      toastUtils.success('Preset deleted successfully');
      loadPresets();
      onDataChange?.();
    } catch (err) {
      console.error('Error deleting preset:', err);
      toastUtils.error('Failed to delete preset');
    }
  };

  const handleDuplicate = async (id: number, name: string) => {
    try {
      const newName = `${name} (Copy)`;
      await apiClient.post(`/wholesale/admin/option_group_presets/${id}/duplicate`, { name: newName });
      toastUtils.success('Preset duplicated successfully');
      loadPresets();
      onDataChange?.();
    } catch (err) {
      console.error('Error duplicating preset:', err);
      toastUtils.error('Failed to duplicate preset');
    }
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
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Presets</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          onClick={loadPresets}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="preset-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Option Group Presets</h2>
          <p className="text-gray-600">Create reusable option groups for your wholesale items</p>
        </div>
        
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Preset
        </button>
      </div>

      {/* Presets List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {presets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No presets yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first preset to reuse option groups across multiple items
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Preset
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {presets.map((preset) => (
              <div key={preset.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{preset.name}</h3>
                    {preset.description && (
                      <p className="text-gray-600 mt-1">{preset.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{preset.option_presets_count} options</span>
                      <span>Min: {preset.min_select}, Max: {preset.max_select}</span>
                      {preset.required && <span className="text-orange-600">Required</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {preset.option_presets.slice(0, 5).map((option, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {option.name}
                          {option.additional_price > 0 && ` (+$${option.additional_price})`}
                        </span>
                      ))}
                      {preset.option_presets.length > 5 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{preset.option_presets.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleDuplicate(preset.id, preset.name)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(preset)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id, preset.name)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingId !== null) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {isCreating ? 'Create New Preset' : 'Edit Preset'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preset Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Youth & Adult Sizes, Standard Colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe when to use this preset"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Select</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_select}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_select: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Select</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_select}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_select: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.required}
                        onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Required</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Options</h4>
                <div className="space-y-3">
                  {formData.option_presets.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => {
                          const newOptions = [...formData.option_presets];
                          newOptions[index] = { ...option, name: e.target.value };
                          setFormData(prev => ({ ...prev, option_presets: newOptions }));
                        }}
                        placeholder="Option name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                      
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={option.additional_price}
                          onChange={(e) => {
                            const newOptions = [...formData.option_presets];
                            newOptions[index] = { ...option, additional_price: parseFloat(e.target.value) || 0 };
                            setFormData(prev => ({ ...prev, option_presets: newOptions }));
                          }}
                          placeholder="0.00"
                          className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={option.available}
                          onChange={(e) => {
                            const newOptions = [...formData.option_presets];
                            newOptions[index] = { ...option, available: e.target.checked };
                            setFormData(prev => ({ ...prev, option_presets: newOptions }));
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Available</span>
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = formData.option_presets.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, option_presets: newOptions }));
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        option_presets: [...prev.option_presets, {
                          name: '',
                          additional_price: 0,
                          available: true,
                          position: prev.option_presets.length
                        }]
                      }));
                    }}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    + Add Option
                  </button>
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
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isCreating ? 'Create Preset' : 'Update Preset'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresetManager;
