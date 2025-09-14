// src/wholesale/utils/inventoryUtils.ts
import type { WholesaleOption, WholesaleOptionGroup, WholesaleItem, WholesaleItemVariant } from '../services/wholesaleApi';

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
    return (item as any).low_stock_threshold || 2;
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

// ========================================
// VARIANT-LEVEL INVENTORY UTILITIES
// ========================================

/**
 * Generate a variant key from selected options
 * Format: "groupId:optionId,groupId:optionId" (sorted by group ID)
 */
export function generateVariantKey(selectedOptions: Record<string, number[]>): string {
  if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
    return '';
  }
  
  // Convert to consistent format and sort by group ID
  const keyParts: string[] = [];
  
  Object.entries(selectedOptions).forEach(([groupId, optionIds]) => {
    const sortedOptionIds = Array.from(optionIds).sort((a, b) => a - b);
    sortedOptionIds.forEach(optionId => {
      keyParts.push(`${groupId}:${optionId}`);
    });
  });
  
  return keyParts.sort().join(',');
}

/**
 * Generate human-readable variant name from selected options
 */
export function generateVariantName(
  selectedOptions: Record<string, number[]>,
  item: WholesaleItem
): string {
  if (!selectedOptions || Object.keys(selectedOptions).length === 0 || !item.option_groups) {
    return '';
  }
  
  const optionNames: string[] = [];
  
  Object.entries(selectedOptions).forEach(([groupId, optionIds]) => {
    const group = item.option_groups?.find(g => g.id.toString() === groupId);
    if (!group) return;
    
    optionIds.forEach(optionId => {
      const option = group.options?.find(o => o.id === optionId);
      if (option) {
        optionNames.push(option.name);
      }
    });
  });
  
  return optionNames.join(', ');
}

/**
 * Find a variant by selected options
 */
export function findVariantByOptions(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>
): WholesaleItemVariant | null {
  if (!(item as any).track_variants || !(item as any).item_variants) {
    return null;
  }
  
  const variantKey = generateVariantKey(selectedOptions);
  if (!variantKey) return null;
  
  const variants = (item as any).item_variants as WholesaleItemVariant[];
  return variants.find(v => v.variant_key === variantKey) || null;
}

/**
 * Calculate available quantity for a specific variant
 */
export function getVariantAvailableQuantity(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>
): number {
  if (!(item as any).track_variants) {
    return 999; // Not using variant tracking
  }
  
  const variant = findVariantByOptions(item, selectedOptions);
  if (!variant) {
    return 0; // Variant doesn't exist
  }
  
  if (!variant.active) {
    return 0; // Variant is disabled
  }
  
  // Calculate available quantity (stock - damaged)
  const stockQuantity = variant.stock_quantity || 0;
  const damagedQuantity = variant.damaged_quantity || 0;
  return Math.max(0, stockQuantity - damagedQuantity);
}

/**
 * Check if a variant is available for the requested quantity
 */
export function isVariantAvailable(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>,
  requestedQuantity: number = 1
): boolean {
  if (!(item as any).track_variants) {
    return true; // Not using variant tracking, fall back to other validation
  }
  
  const availableQuantity = getVariantAvailableQuantity(item, selectedOptions);
  return availableQuantity >= requestedQuantity;
}

/**
 * Get variant stock status for display
 */
export function getVariantStockDisplay(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>
): {
  status: 'out_of_stock' | 'low_stock' | 'in_stock' | 'not_found';
  message: string;
  color: string;
} {
  if (!(item as any).track_variants) {
    // Fall back to existing logic for non-variant items
    const availableQuantity = getItemAvailableQuantity(item);
    const stockDisplay = getStockStatusDisplay(availableQuantity);
    return {
      status: stockDisplay.status,
      message: stockDisplay.message,
      color: stockDisplay.color
    };
  }
  
  const variant = findVariantByOptions(item, selectedOptions);
  if (!variant) {
    return {
      status: 'not_found',
      message: 'This combination is not available',
      color: 'text-red-600'
    };
  }
  
  if (!variant.active) {
    return {
      status: 'out_of_stock',
      message: 'This variant is not available',
      color: 'text-red-600'
    };
  }
  
  const availableQuantity = getVariantAvailableQuantity(item, selectedOptions);
  const lowStockThreshold = variant.low_stock_threshold || 5;
  
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
    message: `${availableQuantity} available`,
    color: 'text-green-600'
  };
}

/**
 * Enhanced validation that handles all tracking modes (item, option, variant)
 */
export function validateCartItemInventoryEnhanced(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>,
  requestedQuantity: number,
  existingCartQuantity: number = 0
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  trackingMode: 'item' | 'option' | 'variant' | 'none';
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const totalRequestedQuantity = requestedQuantity + existingCartQuantity;
  
  // Determine tracking mode
  let trackingMode: 'item' | 'option' | 'variant' | 'none' = 'none';
  
  if ((item as any).track_variants) {
    trackingMode = 'variant';
    
    // Variant-level validation
    const variant = findVariantByOptions(item, selectedOptions);
    if (!variant) {
      const variantName = generateVariantName(selectedOptions, item);
      errors.push(`${variantName || 'This combination'} is not available for ${item.name}`);
    } else if (!variant.active) {
      const variantName = variant.variant_name || generateVariantName(selectedOptions, item);
      errors.push(`${variantName} is no longer available`);
    } else {
      const availableQuantity = getVariantAvailableQuantity(item, selectedOptions);
      
      if (availableQuantity < totalRequestedQuantity) {
        const variantName = variant.variant_name || generateVariantName(selectedOptions, item);
        if (availableQuantity === 0) {
          errors.push(`${variantName} is out of stock`);
        } else {
          errors.push(`${variantName} has only ${availableQuantity} available (you have ${existingCartQuantity} in cart, trying to add ${requestedQuantity} more)`);
        }
      }
    }
  } else if (item.track_inventory) {
    trackingMode = 'item';
    
    // Use existing item-level validation
    const result = validateCartItemInventory(item, selectedOptions, requestedQuantity, existingCartQuantity);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  } else if (item.uses_option_level_inventory) {
    trackingMode = 'option';
    
    // Use existing option-level validation
    const result = validateCartItemInventory(item, selectedOptions, requestedQuantity, existingCartQuantity);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    trackingMode
  };
}

/**
 * Enhanced max quantity calculation that handles all tracking modes
 */
export function getMaxQuantityForItemEnhanced(
  item: WholesaleItem,
  selectedOptions: Record<string, number[]>,
  existingCartQuantity: number = 0
): number {
  // Check variant-level tracking first
  if ((item as any).track_variants) {
    const availableQuantity = getVariantAvailableQuantity(item, selectedOptions);
    return Math.max(0, availableQuantity - existingCartQuantity);
  }
  
  // Fall back to existing logic for item/option level tracking
  return getMaxQuantityForItem(item, selectedOptions, existingCartQuantity);
}
