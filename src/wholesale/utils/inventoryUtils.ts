// src/wholesale/utils/inventoryUtils.ts
import type { WholesaleOption, WholesaleOptionGroup, WholesaleItem } from '../services/wholesaleApi';

/**
 * Calculate available quantity for a wholesale option
 */
export function getOptionAvailableQuantity(option: WholesaleOption, optionGroup?: WholesaleOptionGroup): number {
  // First check manual availability toggle
  if (!option.available) {
    return 0;
  }

  // Only check stock if this option group has inventory tracking enabled
  const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
  
  // If no inventory tracking for this group, rely only on manual availability
  if (!groupHasInventoryTracking || option.stock_quantity === undefined || option.stock_quantity === null) {
    return 999; // Available but not tracked
  }
  
  // Calculate available quantity (stock - damaged)
  const stockQuantity = option.stock_quantity || 0;
  const damagedQuantity = option.damaged_quantity || 0;
  return Math.max(0, stockQuantity - damagedQuantity);
}

/**
 * Check if a wholesale option is available for the requested quantity
 */
export function isOptionAvailable(option: WholesaleOption, requestedQuantity: number = 1, optionGroup?: WholesaleOptionGroup): boolean {
  // First check manual availability toggle
  if (!option.available) {
    return false;
  }
  
  // Only check stock if this option group has inventory tracking enabled
  const groupHasInventoryTracking = optionGroup?.enable_inventory_tracking === true;
  
  // If no inventory tracking for this group, rely only on manual availability
  if (!groupHasInventoryTracking || option.stock_quantity === undefined || option.stock_quantity === null) {
    return true; // Available based on manual toggle only
  }
  
  // Calculate available quantity and check if sufficient for tracked groups
  const availableQuantity = getOptionAvailableQuantity(option, optionGroup);
  return availableQuantity >= requestedQuantity;
}

/**
 * Check if an option group has any available options
 */
export function hasAvailableOptions(optionGroup: WholesaleOptionGroup): boolean {
  if (!optionGroup.options || optionGroup.options.length === 0) {
    return false;
  }
  
  return optionGroup.options.some(option => isOptionAvailable(option, 1, optionGroup));
}

/**
 * Calculate available quantity for a wholesale item
 */
export function getItemAvailableQuantity(item: WholesaleItem): number {
  // Check manual stock status first
  if (item.stock_status === 'out_of_stock') {
    return 0;
  }
  
  // If item-level tracking is enabled
  if (item.track_inventory && item.available_quantity !== undefined) {
    return Math.max(0, item.available_quantity);
  }
  
  // If option-level tracking is used
  if (item.uses_option_level_inventory && item.effective_available_quantity !== undefined) {
    return Math.max(0, item.effective_available_quantity);
  }
  
  // If no tracking, check manual status
  if (item.stock_status === 'low_stock') {
    return item.low_stock_threshold || 2;
  }
  
  // Default to unlimited if no tracking
  return 999;
}

/**
 * Check if a wholesale item is available for the requested quantity
 */
export function isItemAvailable(item: WholesaleItem, requestedQuantity: number = 1): boolean {
  const availableQuantity = getItemAvailableQuantity(item);
  return availableQuantity >= requestedQuantity;
}

/**
 * Get stock status for display
 */
export function getStockStatusDisplay(availableQuantity: number, lowStockThreshold: number = 5): {
  status: 'out_of_stock' | 'low_stock' | 'in_stock';
  message: string;
  color: string;
} {
  if (availableQuantity <= 0) {
    return {
      status: 'out_of_stock',
      message: 'Out of stock',
      color: 'text-red-600'
    };
  }
  
  if (availableQuantity <= lowStockThreshold) {
    return {
      status: 'low_stock',
      message: `Only ${availableQuantity} left`,
      color: 'text-yellow-600'
    };
  }
  
  return {
    status: 'in_stock',
    message: 'In stock',
    color: 'text-green-600'
  };
}

/**
 * Validate cart item against current inventory
 */
export function validateCartItemInventory(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>,
  requestedQuantity: number,
  existingCartQuantity: number = 0
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const totalRequestedQuantity = requestedQuantity + existingCartQuantity;

  // Check item-level inventory if enabled
  if (item.track_inventory) {
    const availableQuantity = getItemAvailableQuantity(item);
    
    if (availableQuantity < totalRequestedQuantity) {
      if (availableQuantity === 0) {
        errors.push(`${item.name} is out of stock`);
      } else {
        errors.push(`${item.name} has only ${availableQuantity} available (you're trying to add ${totalRequestedQuantity})`);
      }
    }
    // Note: Low stock warnings removed - we show this info inline instead
  }

  // Check option-level inventory if enabled
  if (item.uses_option_level_inventory && item.option_groups) {
    for (const group of item.option_groups) {
      if (!group.enable_inventory_tracking) continue;
      
      const selectedOptionIds = selectedOptions[group.id.toString()] || [];
      
      for (const optionId of selectedOptionIds) {
        const option = group.options.find(o => o.id === optionId);
        if (!option) continue;
        
        const availableQuantity = getOptionAvailableQuantity(option, group);
        
        if (availableQuantity < totalRequestedQuantity) {
          if (availableQuantity === 0) {
            errors.push(`${option.name} is out of stock`);
          } else {
            errors.push(`${option.name} has only ${availableQuantity} available (you're trying to add ${totalRequestedQuantity})`);
          }
        }
        // Note: Low stock warnings removed - we show this info inline instead
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get maximum quantity that can be added to cart for an item
 */
export function getMaxQuantityForItem(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>,
  existingCartQuantity: number = 0
): number {
  let maxQuantity = 999; // Default unlimited

  // Check item-level inventory if enabled
  if (item.track_inventory) {
    const availableQuantity = getItemAvailableQuantity(item);
    maxQuantity = Math.min(maxQuantity, Math.max(0, availableQuantity - existingCartQuantity));
  }

  // Check option-level inventory if enabled
  if (item.uses_option_level_inventory && item.option_groups) {
    for (const group of item.option_groups) {
      if (!group.enable_inventory_tracking) continue;
      
      const selectedOptionIds = selectedOptions[group.id.toString()] || [];
      
      for (const optionId of selectedOptionIds) {
        const option = group.options.find(o => o.id === optionId);
        if (!option) continue;
        
        const availableQuantity = getOptionAvailableQuantity(option, group);
        maxQuantity = Math.min(maxQuantity, Math.max(0, availableQuantity - existingCartQuantity));
      }
    }
  }

  return Math.max(0, maxQuantity);
}
