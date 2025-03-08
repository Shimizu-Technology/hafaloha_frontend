/**
 * Shared utilities for order status handling
 */

/**
 * Determines if an ETA modal should be shown when changing order status
 * @param order The order being modified
 * @param newStatus The new status being set
 * @param originalStatus The original status of the order
 * @returns Object indicating if ETA modal should be shown
 */
export function handleOrderPreparationStatus(
  order: any, 
  newStatus: string, 
  originalStatus: string
): { shouldShowEtaModal: boolean } {
  // If changing to preparing from a different status
  if (newStatus === 'preparing' && originalStatus !== 'preparing') {
    return { shouldShowEtaModal: true };
  }
  
  // If not changing status or changing to something else
  return { shouldShowEtaModal: false };
}

/**
 * Calculates the pickup time based on ETA minutes
 * @param order The order being modified
 * @param etaMinutes The ETA in minutes or hour.minute format for advance notice
 * @returns ISO string of the calculated pickup time
 */
export function calculatePickupTime(order: any, etaMinutes: number): string {
  if (order.requires_advance_notice === true) {
    // Logic for advance notice orders (next day)
    const [hourStr, minuteStr] = String(etaMinutes).split('.');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr || '0', 10);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, minute, 0, 0);
    
    return tomorrow.toISOString();
  } else {
    // For regular orders, just add minutes to current time
    return new Date(Date.now() + Number(etaMinutes) * 60_000).toISOString();
  }
}

/**
 * Helper function to check if an order requires advance notice
 * @param order The order to check
 * @returns Boolean indicating if advance notice is required
 */
export function requiresAdvanceNotice(order: any): boolean {
  return order.requires_advance_notice === true;
}
