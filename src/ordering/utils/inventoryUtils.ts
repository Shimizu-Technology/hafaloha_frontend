/**
 * Utility functions for inventory management
 */

import { MenuItem } from '../types/menu';

/**
 * Calculate the available quantity for a menu item
 * Available quantity = stock_quantity - damaged_quantity
 */
export function calculateAvailableQuantity(item: MenuItem | any): number {
  if (!item) return 0;
  
  const stockQty = item.stock_quantity || 0;
  const damagedQty = item.damaged_quantity || 0;
  
  return Math.max(0, stockQty - damagedQty);
}

/**
 * Derive the stock status based on inventory levels
 * - out_of_stock: available quantity is 0
 * - low_stock: available quantity is less than or equal to the low_stock_threshold
 * - in_stock: available quantity is greater than the low_stock_threshold
 */
export function deriveStockStatus(item: MenuItem | any): 'in_stock' | 'out_of_stock' | 'low_stock' {
  // If inventory tracking is not enabled, use the manually set status
  if (!item.enable_stock_tracking) {
    return item.stock_status === 'limited' ? 'low_stock' : (item.stock_status as 'in_stock' | 'out_of_stock' | 'low_stock');
  }
  
  // Calculate available quantity
  const availableQty = calculateAvailableQuantity(item);
  const threshold = item.low_stock_threshold || 10;
  
  // Determine status based on available quantity
  if (availableQty <= 0) {
    return 'out_of_stock';
  } else if (availableQty <= threshold) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
}
