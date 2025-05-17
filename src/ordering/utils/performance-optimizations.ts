// src/ordering/utils/performance-optimizations.ts
// Performance optimization utilities for complex layouts
import React from 'react';
import { SeatSection, Seat } from '../services/api-layouts';

/**
 * Creates an optimized lookup table for seat sections to improve rendering performance
 * with large numbers of tables (50+)
 * @param sections Array of seat sections
 * @returns Map of section IDs to their data for O(1) lookup
 */
export const createSectionLookup = (sections: SeatSection[]): Map<string, SeatSection> => {
  const lookup = new Map<string, SeatSection>();
  sections.forEach(section => lookup.set(section.id, section));
  return lookup;
};

/**
 * Batches section updates to minimize render cycles
 * Use this when updating multiple tables at once
 * @param sections Current sections array
 * @param updates Array of partial section updates with IDs
 * @returns New array with updates applied
 */
export const batchSectionUpdates = (
  sections: SeatSection[], 
  updates: Array<{id: string} & Partial<SeatSection>>
): SeatSection[] => {
  // Create a lookup map for O(1) access
  const sectionMap = createSectionLookup(sections);
  
  // Apply all updates to the map
  updates.forEach(update => {
    const section = sectionMap.get(update.id);
    if (section) {
      sectionMap.set(update.id, { ...section, ...update });
    }
  });
  
  // Convert back to array
  return Array.from(sectionMap.values());
};

/**
 * Optimizes rendering of seat paths by pre-calculating path data
 * to avoid expensive re-calculations on every render
 * @param seats Array of seats to generate path for
 * @returns SVG path data string for connecting seats
 */
export const calculateSeatPathData = (seats: Seat[]): string => {
  if (!seats.length) return '';
  
  // Generate optimized path data
  let pathData = `M ${seats[0].position_x} ${seats[0].position_y}`;
  
  for (let i = 1; i < seats.length; i++) {
    pathData += ` L ${seats[i].position_x} ${seats[i].position_y}`;
  }
  
  // Close the path if more than 2 seats
  if (seats.length > 2) {
    pathData += ' Z';
  }
  
  return pathData;
};

/**
 * Determines if two section arrays are functionally equivalent
 * to prevent unnecessary re-renders
 * @param a First section array
 * @param b Second section array
 * @returns True if the sections are equivalent
 */
export const areSectionsEquivalent = (a: SeatSection[], b: SeatSection[]): boolean => {
  if (a.length !== b.length) return false;
  
  // Create lookup maps
  const aMap = createSectionLookup(a);
  
  // Check each section
  for (const section of b) {
    const aSection = aMap.get(section.id);
    if (!aSection) return false;
    
    // Compare key properties
    if (
      aSection.offsetX !== section.offsetX ||
      aSection.offsetY !== section.offsetY ||
      aSection.shape !== section.shape ||
      aSection.rotation !== section.rotation ||
      aSection.seats.length !== section.seats.length
    ) {
      return false;
    }
    
    // Deep compare seats if needed
    for (let i = 0; i < section.seats.length; i++) {
      const aSeat = aSection.seats[i];
      const bSeat = section.seats[i];
      if (
        aSeat.position_x !== bSeat.position_x ||
        aSeat.position_y !== bSeat.position_y ||
        aSeat.capacity !== bSeat.capacity ||
        aSeat.isCorner !== bSeat.isCorner
      ) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Custom hook to create an optimized debounced function
 * Use for expensive operations like drag updates or seat positioning
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [fn, delay]
  );
};

/**
 * Memoizes expensive calculation results based on dependencies 
 * to prevent recalculating on every render
 * @param calculate Calculation function
 * @param dependencies Array of dependencies to watch
 * @returns Cached calculation result
 */
export function useMemoizedCalculation<T, D extends any[]>(
  calculate: (...deps: D) => T,
  dependencies: D
): T {
  const cache = React.useRef<{
    deps: D | null;
    result: T | null;
  }>({
    deps: null,
    result: null,
  });
  
  // Check if dependencies changed
  const depsChanged = !cache.current.deps || 
    dependencies.some((dep, i) => dep !== cache.current.deps![i]);
  
  // Recalculate only if dependencies changed
  if (depsChanged) {
    cache.current.deps = [...dependencies];
    cache.current.result = calculate(...dependencies);
  }
  
  return cache.current.result!;
}
