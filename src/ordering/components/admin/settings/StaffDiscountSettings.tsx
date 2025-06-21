import React, { useState, useEffect } from 'react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { staffDiscountConfigurationsApi } from '../../../../shared/api/endpoints/staffDiscountConfigurations';
import { Plus, Trash2, Save, Percent, GripVertical, AlertCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StaffDiscountConfiguration {
  id: number;
  name: string;
  code: string;
  discount_percentage: number;
  discount_type: 'percentage' | 'fixed_amount';
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  description?: string;
  ui_color?: string;
  _deleted?: boolean;
}

// Sortable Item Component
function SortableDiscountCard({ 
  discount, 
  onDiscountChange, 
  onDelete, 
  isNew 
}: { 
  discount: StaffDiscountConfiguration;
  onDiscountChange: (discountId: number, field: keyof StaffDiscountConfiguration, value: any) => void;
  onDelete: (discountId: number) => void;
  isNew: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: discount.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        // Prevent text selection during drag on touch devices
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
      }}
      className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-hafaloha-gold ring-opacity-50 z-50' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 items-center">
          {/* Name Field */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={discount.name}
              onChange={(e) =>
                onDiscountChange(discount.id, 'name', e.target.value)
              }
              placeholder="e.g. On Duty Staff"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-hafaloha-gold focus:border-transparent"
            />
          </div>

          {/* Code Field */}
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Code
            </label>
            <input
              type="text"
              value={discount.code}
              onChange={(e) =>
                onDiscountChange(discount.id, 'code', e.target.value)
              }
              placeholder="on_duty"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-hafaloha-gold focus:border-transparent"
            />
          </div>

          {/* Discount Percentage */}
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Discount %
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={discount.discount_percentage}
                onChange={(e) =>
                  onDiscountChange(discount.id, 'discount_percentage', +e.target.value)
                }
                className="w-full px-2 py-1.5 pr-6 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-hafaloha-gold focus:border-transparent"
              />
              <span className="absolute right-2 top-1.5 text-gray-400 text-xs">%</span>
            </div>
          </div>

          {/* Checkboxes and Actions */}
          <div className="md:col-span-2 lg:col-span-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={discount.is_active}
                  onChange={(e) =>
                    onDiscountChange(discount.id, 'is_active', e.target.checked)
                  }
                  className="rounded border-gray-300 text-hafaloha-gold focus:ring-hafaloha-gold w-3 h-3"
                />
                <span className="text-xs font-medium text-gray-700">Active</span>
              </label>
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={discount.is_default}
                  onChange={(e) =>
                    onDiscountChange(discount.id, 'is_default', e.target.checked)
                  }
                  className="rounded border-gray-300 text-hafaloha-gold focus:ring-hafaloha-gold w-3 h-3"
                  title="Only one discount can be set as default"
                />
                <span className="text-xs font-medium text-gray-700">Default</span>
              </label>
            </div>
            
            <button
              type="button"
              onClick={() => onDelete(discount.id)}
              className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 transition-colors duration-200 border border-red-200 flex-shrink-0"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {isNew ? 'Remove' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffDiscountSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftDiscounts, setDraftDiscounts] = useState<StaffDiscountConfiguration[]>([]);
  const [originalDiscounts, setOriginalDiscounts] = useState<StaffDiscountConfiguration[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDiscountConfigurations();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(draftDiscounts) !== JSON.stringify(originalDiscounts);
    setHasUnsavedChanges(hasChanges);
  }, [draftDiscounts, originalDiscounts]);

  async function loadDiscountConfigurations() {
    setLoading(true);
    try {
      const discounts = await staffDiscountConfigurationsApi.getActiveConfigurations();
      const mappedDiscounts = discounts.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        discount_percentage: item.discount_percentage,
        discount_type: item.discount_type,
        is_active: item.is_active,
        is_default: item.is_default,
        display_order: item.display_order,
        description: item.description,
        ui_color: item.ui_color,
        _deleted: false,
      })) as StaffDiscountConfiguration[];
      
      // Sort by display order
      mappedDiscounts.sort((a, b) => a.display_order - b.display_order);
      
      setDraftDiscounts(mappedDiscounts);
      setOriginalDiscounts(JSON.parse(JSON.stringify(mappedDiscounts))); // Deep copy
    } catch (err) {
      console.error('Error loading discount configurations:', err);
      toastUtils.error('Failed to load discount configurations.');
    } finally {
      setLoading(false);
    }
  }

  function handleDiscountChange(discountId: number, field: keyof StaffDiscountConfiguration, value: any) {
    setDraftDiscounts((prev) => {
      let updatedDiscounts = prev.map((discount) => 
        discount.id === discountId ? { ...discount, [field]: value } : discount
      );

      // Handle default selection - only one can be default
      if (field === 'is_default' && value === true) {
        updatedDiscounts = updatedDiscounts.map((discount) => ({
          ...discount,
          is_default: discount.id === discountId ? true : false
        }));
        
        // Show toast to inform user about the change
        const changedDiscount = updatedDiscounts.find(d => d.id === discountId);
        if (changedDiscount) {
          toastUtils.success(`"${changedDiscount.name}" is now the default discount. Other defaults have been unselected.`);
        }
      }

      return updatedDiscounts;
    });
  }

  function handleDeleteDiscount(discountId: number) {
    const isNew = discountId > 1000000000;
    if (isNew) {
      setDraftDiscounts((prev) => prev.filter((discount) => discount.id !== discountId));
    } else {
      setDraftDiscounts((prev) =>
        prev.map((discount) => (discount.id === discountId ? { ...discount, _deleted: true } : discount))
      );
    }
  }

  function handleAddDiscount() {
    const activeDiscounts = draftDiscounts.filter(d => !d._deleted);
    const maxOrder = Math.max(...activeDiscounts.map(d => d.display_order), 0);
    const newDiscount: StaffDiscountConfiguration = {
      id: Date.now(), // Use timestamp for new items to avoid conflicts
      name: '',
      code: '',
      discount_percentage: 0,
      discount_type: 'percentage',
      is_active: true,
      is_default: false,
      display_order: maxOrder + 1,
      description: '',
      ui_color: '',
    };
    setDraftDiscounts((prev) => [...prev, newDiscount]);
  }

  // Handle drag and drop reordering
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeDiscounts = draftDiscounts.filter(d => !d._deleted);
      const oldIndex = activeDiscounts.findIndex((item) => item.id === active.id);
      const newIndex = activeDiscounts.findIndex((item) => item.id === over?.id);

      const reorderedDiscounts = arrayMove(activeDiscounts, oldIndex, newIndex);
      
      // Update display_order based on new positions
      const updatedDiscounts = reorderedDiscounts.map((discount, index) => ({
        ...discount,
        display_order: index + 1
      }));

      // Merge back with deleted items
      const deletedDiscounts = draftDiscounts.filter(d => d._deleted);
      setDraftDiscounts([...updatedDiscounts, ...deletedDiscounts]);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const discountsToCreate = draftDiscounts.filter(dc => dc.id > 1000000000 && !dc._deleted); // New items have timestamp IDs
      const discountsToUpdate = draftDiscounts.filter(dc => dc.id <= 1000000000 && !dc._deleted); // Existing items have small IDs
      const discountsToDelete = draftDiscounts.filter(dc => dc.id <= 1000000000 && dc._deleted);

      for (const dc of discountsToCreate) {
        await staffDiscountConfigurationsApi.createConfiguration({
          name: dc.name,
          code: dc.code,
          discount_percentage: dc.discount_percentage,
          discount_type: dc.discount_type as 'percentage' | 'fixed_amount',
          is_active: dc.is_active,
          is_default: dc.is_default,
          display_order: dc.display_order,
          description: dc.description || undefined,
          ui_color: dc.ui_color || undefined,
        });
      }

      for (const dc of discountsToUpdate) {
        await staffDiscountConfigurationsApi.updateConfiguration(dc.id, {
          name: dc.name,
          code: dc.code,
          discount_percentage: dc.discount_percentage,
          discount_type: dc.discount_type as 'percentage' | 'fixed_amount',
          is_active: dc.is_active,
          is_default: dc.is_default,
          display_order: dc.display_order,
          description: dc.description || undefined,
          ui_color: dc.ui_color || undefined,
        });
      }

      for (const dc of discountsToDelete) {
        await staffDiscountConfigurationsApi.deleteConfiguration(dc.id);
      }

      toastUtils.success('Staff discount settings saved successfully!');
      loadDiscountConfigurations();
    } catch (err) {
      console.error('Error saving discount configurations:', err);
      toastUtils.error('Failed to save discount configurations. See console for details.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-hafaloha-gold"></div>
          <span className="text-gray-600">Loading Staff Discount Settings...</span>
        </div>
      </div>
    );
  }

  const activeDiscounts = draftDiscounts.filter(d => !d._deleted).sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-hafaloha-gold/5 to-hafaloha-gold/10 rounded-t-lg px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-hafaloha-gold/20 rounded-lg">
            <Percent className="h-5 w-5 text-hafaloha-gold" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Staff Discount Options</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure discount options available for staff orders
            </p>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Add New Discount Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Discount Configurations</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeDiscounts.length} configuration{activeDiscounts.length !== 1 ? 's' : ''} defined • Drag to reorder
            </p>
          </div>
          <button
            onClick={handleAddDiscount}
            type="button"
            className="inline-flex items-center px-4 py-2 bg-hafaloha-gold text-white text-sm font-medium rounded-lg hover:bg-hafaloha-gold/90 focus:outline-none focus:ring-2 focus:ring-hafaloha-gold focus:ring-offset-2 transition-colors duration-200 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Discount
          </button>
        </div>

        {/* Discount Cards with Drag and Drop */}
        <div className="space-y-4">
          {activeDiscounts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Percent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No discount configurations</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first discount option.</p>
              <button
                onClick={handleAddDiscount}
                type="button"
                className="inline-flex items-center px-4 py-2 bg-hafaloha-gold text-white text-sm font-medium rounded-lg hover:bg-hafaloha-gold/90 focus:outline-none focus:ring-2 focus:ring-hafaloha-gold focus:ring-offset-2 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Discount
              </button>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
                             <SortableContext items={activeDiscounts} strategy={verticalListSortingStrategy}>
                 <div className="space-y-2">
                  {activeDiscounts.map((discount) => {
                    const isNew = discount.id > 1000000000;
                    return (
                      <SortableDiscountCard
                        key={discount.id}
                        discount={discount}
                        onDiscountChange={handleDiscountChange}
                        onDelete={handleDeleteDiscount}
                        isNew={isNew}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Save Button */}
        {activeDiscounts.length > 0 && (
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || !hasUnsavedChanges}
              className={`inline-flex items-center px-6 py-3 text-white text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-hafaloha-gold focus:ring-offset-2 transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                hasUnsavedChanges 
                  ? 'bg-hafaloha-gold hover:bg-hafaloha-gold/90' 
                  : 'bg-gray-400'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {hasUnsavedChanges ? 'Save Changes' : 'No Changes to Save'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDiscountSettings;
