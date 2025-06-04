import React, { useEffect, useState } from 'react';
import { X, Trash2, Save, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { FundraiserItem } from '../../types/fundraiserItem';
import { FundraiserOption, FundraiserOptionGroup } from '../../types/optionGroups';
import { fundraiserItemOptionService } from '../../services/fundraiserItemOptionService';
import toastUtils from '../../../../shared/utils/toastUtils';



interface FundraiserItemOptionGroupsModalProps {
  item: FundraiserItem;
  onClose: () => void;
  onUpdate?: () => void;
}

const FundraiserItemOptionGroupsModal: React.FC<FundraiserItemOptionGroupsModalProps> = ({ item, onClose, onUpdate }) => {
  // Component state
  const [loading, setLoading] = useState<boolean>(true);
  const [initialOptionGroups, setInitialOptionGroups] = useState<FundraiserOptionGroup[]>([]);
  const [draftOptionGroups, setDraftOptionGroups] = useState<FundraiserOptionGroup[]>([]);
  const [bulkActionVisible, setBulkActionVisible] = useState<boolean>(false);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, Set<number>>>({});
  
  // New group form fields
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMin, setNewGroupMin] = useState(0);
  const [newGroupMax, setNewGroupMax] = useState(1);
  const [newGroupFreeCount, setNewGroupFreeCount] = useState(0);

  // We'll generate temporary negative IDs for new groups/options
  const [tempIdCounter, setTempIdCounter] = useState(-1);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line
  }, [item.id]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await fundraiserItemOptionService.getOptionGroups(item.id, item.fundraiser_id);
      // Sort groups/options by position
      const sorted = data.map((g) => ({
        ...g,
        options: g.options.slice().sort((a, b) => (a.position || 0) - (b.position || 0)),
      }));
      // No need to sort option groups as position is not used

      setInitialOptionGroups(sorted);
      // Deep clone to make an editable draft
      setDraftOptionGroups(JSON.parse(JSON.stringify(sorted)));
    } catch (err) {
      console.error(err);
      setInitialOptionGroups([]);
      setDraftOptionGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Local manipulations
  // -----------------------------

  // Create local group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    // Create a new group without position
    const newGroup: FundraiserOptionGroup = {
      id: tempIdCounter,
      name: newGroupName,
      min_select: Math.max(0, newGroupMin),   // clamp min ≥ 0
      max_select: Math.max(1, newGroupMax),   // clamp max ≥ 1
      free_option_count: Math.max(0, Math.min(newGroupFreeCount, newGroupMax)), // clamp between 0 and max_select
      options: [],
    };
    setDraftOptionGroups((prev) => [...prev, newGroup]);

    // Reset fields
    setNewGroupName('');
    setNewGroupMin(0);
    setNewGroupMax(1);
    setNewGroupFreeCount(0);
    setTempIdCounter((prevId) => prevId - 1);
  };

  // Update local group
  const handleLocalUpdateGroup = (
    groupId: number,
    changes: Partial<Omit<FundraiserOptionGroup, 'options'>>
  ) => {
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          // Ensure min≥0, max≥1
          if (typeof changes.min_select === 'number') {
            changes.min_select = Math.max(0, changes.min_select);
          }
          if (typeof changes.max_select === 'number') {
            changes.max_select = Math.max(1, changes.max_select);
          }
          if (typeof changes.free_option_count === 'number') {
            // Ensure free_option_count is between 0 and max_select
            const maxSelect = typeof changes.max_select === 'number' 
              ? changes.max_select 
              : g.max_select;
            changes.free_option_count = Math.max(0, Math.min(changes.free_option_count, maxSelect));
          }
          return { ...g, ...changes };
        }
        return g;
      })
    );
  };

  // Delete local group
  const handleLocalDeleteGroup = (groupId: number) => {
    if (!window.confirm('Delete this option group?')) return;
    setDraftOptionGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Create local option
  const handleLocalCreateOption = (groupId: number) => {
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        // Get max position to place new option at the end
        const maxOptPos = g.options.reduce(
          (acc, o) => Math.max(acc, o.position || 0),
          0
        );
        const newOpt: FundraiserOption = {
          id: tempIdCounter,
          name: '',
          additional_price: 0,
          position: maxOptPos + 1,
          is_preselected: false,
          is_available: true,
        };
        return { ...g, options: [...g.options, newOpt] };
      })
    );
    setTempIdCounter((prevId) => prevId - 1);
  };

  // Update local option
  const handleLocalUpdateOption = (
    groupId: number,
    optionId: number,
    changes: Partial<FundraiserOption>
  ) => {
    // Check if we're updating availability and turning it off
    if (changes.is_available === false) {
      // Find the group
      const group = draftOptionGroups.find(g => g.id === groupId);
      if (group && group.min_select > 0) {
        // Count how many options would still be available after this change
        const availableOptionsCount = group.options.filter(o => {
          // If this is the option we're updating, use the new value
          if (o.id === optionId) return false;
          // Otherwise use the existing value, defaulting to true if undefined
          return o.is_available !== false;
        }).length;
        
        // If this would make all options unavailable in a required group, show a warning
        if (availableOptionsCount === 0) {
          const confirmChange = window.confirm(
            `Warning: This will make all options unavailable in the required group "${group.name}". ` +
            `Customers won't be able to order this item until at least one option is available again. ` +
            `Continue?`
          );
          
          if (!confirmChange) {
            return; // Don't make the change if the user cancels
          }
        }
      }
    }
    
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.map((o) =>
              o.id === optionId ? { ...o, ...changes } : o
            ),
          };
        }
        return g;
      })
    );
  };

  // Delete local option
  const handleLocalDeleteOption = (groupId: number, optId: number) => {
    if (!window.confirm('Delete this option?')) return;
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, options: g.options.filter((o) => o.id !== optId) };
        }
        return g;
      })
    );
  };

  // -----------------------------
  // Bulk action functions
  // -----------------------------
  const toggleOptionSelection = (groupId: number, optionId: number) => {
    setSelectedOptions(prev => {
      const newSelected = { ...prev };
      
      // Initialize set for this group if it doesn't exist
      if (!newSelected[groupId]) {
        newSelected[groupId] = new Set();
      }
      
      // Toggle selection
      if (newSelected[groupId].has(optionId)) {
        newSelected[groupId].delete(optionId);
      } else {
        newSelected[groupId].add(optionId);
      }
      
      // Remove empty sets
      if (newSelected[groupId].size === 0) {
        delete newSelected[groupId];
      }
      
      // Show/hide bulk action bar based on whether any options are selected
      const hasSelections = Object.values(newSelected).some(set => set.size > 0);
      setBulkActionVisible(hasSelections);
      
      return newSelected;
    });
  };
  
  const toggleAllOptionsInGroup = (groupId: number, select: boolean) => {
    const group = draftOptionGroups.find(g => g.id === groupId);
    if (!group) return;
    
    setSelectedOptions(prev => {
      const newSelected = { ...prev };
      
      if (select) {
        // Select all options in the group
        newSelected[groupId] = new Set(
          group.options.map(opt => opt.id)
        );
      } else {
        // Deselect all options in the group
        delete newSelected[groupId];
      }
      
      // Show/hide bulk action bar
      const hasSelections = Object.values(newSelected).some(set => set.size > 0);
      setBulkActionVisible(hasSelections);
      
      return newSelected;
    });
  };
  
  const isAllGroupSelected = (groupId: number) => {
    const group = draftOptionGroups.find(g => g.id === groupId);
    if (!group || !selectedOptions[groupId]) return false;
    
    return group.options.every(opt => selectedOptions[groupId].has(opt.id));
  };
  
  const getSelectedOptionsCount = () => {
    return Object.values(selectedOptions).reduce(
      (total, set) => total + set.size, 0
    );
  };
  
  const handleBulkUpdate = async (setAvailable: boolean) => {
    setBulkActionLoading(true);
    
    try {
      // Collect all selected option IDs in each group
      for (const groupId in selectedOptions) {
        const numericGroupId = parseInt(groupId, 10);
        const groupOptions = selectedOptions[numericGroupId];
        
        // Get real group ID if it's a new group
        let realGroupId = numericGroupId;
        
        // Skip if this is a new group (negative ID) since we'll update those separately
        if (realGroupId < 0) continue;
        
        // Collect all options in this group that need updating
        for (const optionId of Array.from(groupOptions)) {
          // Skip new options (negative IDs) - they'll be created with their correct availability value
          if (optionId < 0) continue;
          
          // Update the option's availability
          await fundraiserItemOptionService.updateOption(
            item.id,
            realGroupId,
            optionId,
            { is_available: setAvailable },
            item.fundraiser_id
          );
          
          // Also update in our draft state
          handleLocalUpdateOption(numericGroupId, optionId, { is_available: setAvailable });
        }
      }
      
      toastUtils.success(`${getSelectedOptionsCount()} options updated successfully`);
      
      // Clear selections
      setSelectedOptions({});
      setBulkActionVisible(false);
    } catch (err) {
      console.error('Error during bulk update:', err);
      toastUtils.error('Failed to update options. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // -----------------------------
  // Save all changes
  // -----------------------------
  const handleSave = async () => {
    if (!window.confirm('Save all changes to option groups?')) return;
    
    try {
      setLoading(true);
      const newGroupIdMap: Record<number, number> = {};
      
      // Compare with initial groups to see if anything changed
      const hasGroupChanges = (group: FundraiserOptionGroup) => {
        const original = initialOptionGroups.find(g => g.id === group.id);
        if (!original) return true; // New group
        
        // Compare basic properties
        if (original.name !== group.name) return true;
        if (original.min_select !== group.min_select) return true;
        if (original.max_select !== group.max_select) return true;
        if (original.free_option_count !== group.free_option_count) return true;
        // position field removed - not supported by backend
        
        return false;
      };
      
      // Compare with original options to see if anything changed
      const hasOptionChanges = (option: FundraiserOption, groupId: number) => {
        const originalGroup = initialOptionGroups.find(g => g.id === groupId);
        if (!originalGroup) return true;
        
        const original = originalGroup.options?.find(o => o.id === option.id);
        if (!original) return true;
        
        // Compare properties
        if (original.name !== option.name) return true;
        if (original.additional_price !== option.additional_price) return true;
        if (original.is_preselected !== option.is_preselected) return true;
        if (original.is_available !== option.is_available) return true;
        if (original.position !== option.position) return true;
        
        return false;
      };
      
      // 1) Find groups to delete
      const originalIds = initialOptionGroups
        .filter((g) => g.id > 0)
        .map((g) => g.id);
      const draftIds = draftOptionGroups
        .filter((g) => g.id > 0)
        .map((g) => g.id);
      const groupsToDelete = initialOptionGroups.filter(g => !draftIds.includes(g.id));
      
      // 2) Find groups to create
      const groupsToCreate = draftOptionGroups.filter(g => g.id < 0);
      
      // 3) Find groups to update
      const groupsToUpdate = draftOptionGroups
        .filter(g => g.id > 0)
        .filter(g => !originalIds.includes(g.id) || hasGroupChanges(g));
      
      // Execute deletions first
      for (const group of groupsToDelete) {
        try {
          await fundraiserItemOptionService.deleteOptionGroup(item.id, group.id, item.fundraiser_id);
          console.log(`Deleted group ${group.id}`);
        } catch (err) {
          console.error(`Error deleting group ${group.id}:`, err);
          toastUtils.error(`Error deleting group ${group.name}`);
        }
      }
      
      // Create new groups
      for (const group of groupsToCreate) {
        try {
          const { id: tempId, options, ...groupData } = group;
          const newGroup = await fundraiserItemOptionService.createOptionGroup(item.id, groupData, item.fundraiser_id, options);
          console.log(`Created group ${newGroup.id} from temp id ${tempId}`);
          newGroupIdMap[tempId] = newGroup.id; // Map temp ID to real ID
        } catch (err) {
          console.error(`Error creating group with temp id ${group.id}:`, err);
          toastUtils.error(`Error creating group ${group.name}`);
        }
      }
      
      // Update existing groups
      for (const gUpd of groupsToUpdate) {
        try {
          await fundraiserItemOptionService.updateOptionGroup(item.id, gUpd.id, {
            name: gUpd.name,
            min_select: gUpd.min_select,
            max_select: gUpd.max_select,
            free_option_count: gUpd.free_option_count,
            // position removed - not supported by backend
          }, item.fundraiser_id);
        } catch (err) {
          console.error(`Error updating group ${gUpd.id}:`, err);
          toastUtils.error(`Error updating group ${gUpd.name}`);
        }
      }
      
      // Now handle options: create, update, delete
      for (const group of draftOptionGroups) {
        const originalGroup = initialOptionGroups.find(g => g.id === group.id);
        
        // Skip if the group is new (we don't have options for it yet in the database)
        if (!originalGroup && group.id < 0) continue;
        
        const groupId = group.id < 0 ? newGroupIdMap[group.id] : group.id;
        
        // 1. Find options to delete in this group
        if (originalGroup && originalGroup.options) {
          const draftOptionIds = group.options?.map(o => o.id) || [];
          const optionsToDelete = originalGroup.options.filter(o => !draftOptionIds.includes(o.id));
          
          for (const option of optionsToDelete) {
            try {
              await fundraiserItemOptionService.deleteOption(item.id, groupId, option.id, item.fundraiser_id);
            } catch (err) {
              console.error(`Error deleting option ${option.id}:`, err);
              toastUtils.error(`Error deleting option ${option.name}`);
            }
          }
        }
        
        // 2. Create new options
        if (group.options) {
          const newOptions = group.options.filter(o => o.id < 0);
          
          for (const option of newOptions) {
            try {
              const { id: tempId, ...optionData } = option;
              await fundraiserItemOptionService.createOption(item.id, groupId, optionData, item.fundraiser_id);
            } catch (err) {
              console.error(`Error creating option:`, err);
              toastUtils.error(`Error creating option ${option.name}`);
            }
          }
        }
        
        // 3. Update existing options
        if (group.options) {
          const optionsToUpdate = group.options
            .filter(o => o.id > 0)
            .filter(o => hasOptionChanges(o, group.id));
          
          for (const option of optionsToUpdate) {
            try {
              await fundraiserItemOptionService.updateOption(item.id, groupId, option.id, {
                name: option.name,
                additional_price: option.additional_price,
                is_preselected: option.is_preselected,
                is_available: option.is_available,
                position: option.position
              }, item.fundraiser_id);
            } catch (err) {
              console.error(`Error updating option ${option.id}:`, err);
              toastUtils.error(`Error updating option ${option.name}`);
            }
          }
        }
      }
      
      // Refresh from server
      await fetchGroups();
      
      // Call parent update callback if provided
      if (onUpdate) onUpdate();
      
      // Show success toast
      toastUtils.success('Options saved successfully');
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Error saving options:', err);
      toastUtils.error('Failed to save options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  
  // Render UI
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn transition-all duration-300">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp transform-gpu will-change-transform">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Item Option Groups</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-6">
      {/* Option Group List */}
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Option Groups</h2>
          </div>
          
          {/* New Group Form */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-md font-medium mb-3">Add New Option Group</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="e.g., Size, Color, Style"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min. Required</label>
                <input
                  type="number"
                  value={newGroupMin}
                  onChange={(e) => setNewGroupMin(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Allowed</label>
                <input
                  type="number"
                  value={newGroupMax}
                  onChange={(e) => setNewGroupMax(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Free Options (first N options free)</label>
                <input
                  type="number"
                  value={newGroupFreeCount}
                  onChange={(e) => setNewGroupFreeCount(parseInt(e.target.value) || 0)}
                  min="0"
                  max={newGroupMax}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="flex items-end">
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                >
                  Add Group
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <span className="text-gray-500">Loading options...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {draftOptionGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={24} />
                <p>No option groups yet. Create your first one above!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {draftOptionGroups.map((group) => (
                  <div
                    key={group.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Group Header */}
                    <div className="bg-gray-100 p-3 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {/* Select all checkbox for group */}
                        <div
                          onClick={() => toggleAllOptionsInGroup(group.id, !isAllGroupSelected(group.id))}
                          className="cursor-pointer"
                        >
                          {isAllGroupSelected(group.id) ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </div>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) =>
                            handleLocalUpdateGroup(group.id, { name: e.target.value })
                          }
                          className="font-medium bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-1 py-0 w-40"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <div>
                            <label className="text-xs text-gray-500">Min</label>
                            <input
                              type="number"
                              value={group.min_select}
                              onChange={(e) =>
                                handleLocalUpdateGroup(group.id, {
                                  min_select: parseInt(e.target.value) || 0,
                                })
                              }
                              min="0"
                              className="w-12 p-1 border border-gray-300 rounded text-center"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Max</label>
                            <input
                              type="number"
                              value={group.max_select}
                              onChange={(e) =>
                                handleLocalUpdateGroup(group.id, {
                                  max_select: parseInt(e.target.value) || 1,
                                })
                              }
                              min="1"
                              className="w-12 p-1 border border-gray-300 rounded text-center"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Free</label>
                            <input
                              type="number"
                              value={group.free_option_count}
                              onChange={(e) =>
                                handleLocalUpdateGroup(group.id, {
                                  free_option_count: parseInt(e.target.value) || 0,
                                })
                              }
                              min="0"
                              max={group.max_select}
                              className="w-12 p-1 border border-gray-300 rounded text-center"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleLocalDeleteGroup(group.id)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Options Table */}
                    <table className="w-full table-auto">
                      <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                          <th className="p-2 w-6"></th>
                          <th className="p-2 text-left">Option Name</th>
                          <th className="p-2 text-right">Price</th>
                          <th className="p-2 text-center">Default</th>
                          <th className="p-2 text-center">Available</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.options.map((option) => (
                          <tr key={option.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="p-2 text-center">
                              <div
                                onClick={() => toggleOptionSelection(group.id, option.id)}
                                className="cursor-pointer"
                              >
                                {selectedOptions[group.id]?.has(option.id) ? (
                                  <CheckSquare size={16} className="text-blue-600" />
                                ) : (
                                  <Square size={16} className="text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) =>
                                  handleLocalUpdateOption(group.id, option.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border border-gray-300 rounded p-1"
                                placeholder="Option name"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={option.additional_price}
                                onChange={(e) =>
                                  handleLocalUpdateOption(group.id, option.id, {
                                    additional_price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                step="0.01"
                                min="0"
                                className="w-full bg-transparent border border-gray-300 rounded p-1 text-right"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <div
                                onClick={() =>
                                  handleLocalUpdateOption(group.id, option.id, {
                                    is_preselected: !option.is_preselected,
                                  })
                                }
                                className="cursor-pointer inline-block"
                              >
                                {option.is_preselected ? (
                                  <CheckSquare size={18} className="text-blue-600" />
                                ) : (
                                  <Square size={18} className="text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <div
                                onClick={() =>
                                  handleLocalUpdateOption(group.id, option.id, {
                                    is_available: !option.is_available,
                                  })
                                }
                                className="cursor-pointer inline-block"
                              >
                                {option.is_available !== false ? (
                                  <CheckSquare size={18} className="text-green-600" />
                                ) : (
                                  <Square size={18} className="text-red-400" />
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleLocalDeleteOption(group.id, option.id)}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={6} className="p-2">
                            <button
                              onClick={() => handleLocalCreateOption(group.id)}
                              className="w-full py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              + Add Option
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {bulkActionVisible && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-gray-700">
              {getSelectedOptionsCount()} options selected
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button 
              className="btn-secondary text-sm px-2 py-1" 
              onClick={() => handleBulkUpdate(true)} 
              disabled={bulkActionLoading}
            >
              Make Available
            </button>
            
            <button 
              className="btn-secondary text-sm px-2 py-1" 
              onClick={() => handleBulkUpdate(false)} 
              disabled={bulkActionLoading}
            >
              Make Unavailable
            </button>
            
            <button 
              className="btn-text text-sm" 
              onClick={() => {
                setSelectedOptions({});
                setBulkActionVisible(false);
              }}
              disabled={bulkActionLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Modal Footer */}
      <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:bg-blue-400"
          disabled={loading}
        >
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </div>
      
      </div>
    </div>
  </div>
  );
}

export default FundraiserItemOptionGroupsModal;
