// src/ordering/components/admin/reservations/OptimizedTable.tsx
import React, { memo } from 'react';
import { SeatSection } from '../../../services/api-layouts';

interface OptimizedTableProps {
  section: SeatSection;
  isSelected: boolean;
  tableDiameter: number;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Memoized table component that only re-renders when props change
 * This greatly improves performance when handling many tables
 */
const OptimizedTable: React.FC<OptimizedTableProps> = ({ 
  section, 
  isSelected, 
  tableDiameter,
  onClick 
}) => {
  // Determine if this is a circle or rectangle table
  const isCircle = (section.shape || 'circle') === 'circle';
  
  if (isCircle) {
    return (
      <div 
        className="bg-white rounded-full flex items-center justify-center overflow-hidden shadow-sm"
        style={{
          width: `${tableDiameter}px`,
          height: `${tableDiameter}px`,
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          zIndex: 1, // Tables below seats
          opacity: isSelected ? 0.9 : 0.75,
          boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
          border: isSelected ? `2px solid #0078d4` : '1px solid #ccc'
        }}
        onClick={onClick}
      >
        <span className="text-xs font-medium">{section.name}</span>
      </div>
    );
  } else {
    // Rectangle table
    return (
      <div 
        className="bg-white flex items-center justify-center overflow-hidden shadow-sm"
        style={{
          width: `${section.dimensions?.width || 120}px`,
          height: `${section.dimensions?.height || 80}px`,
          position: 'absolute',
          left: 0,
          top: 0,
          // Apply rotation for rectangular tables
          transform: `translate(-50%, -50%) ${isCircle ? '' : `rotate(${section.rotation || 0}deg)`}`,
          zIndex: 1, // Tables below seats
          opacity: isSelected ? 0.9 : 0.75,
          boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
          border: isSelected ? `2px solid #0078d4` : '1px solid #ccc'
        }}
        onClick={onClick}
      >
        <span className="text-xs font-medium">{section.name}</span>
        {/* Visual rotation indicator for rectangle tables */}
        {!isCircle && (section.rotation || 0) > 0 && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl-sm">
            {section.rotation}°
          </div>
        )}
      </div>
    );
  }
};

/**
 * Use React.memo to prevent unnecessary re-renders 
 * by implementing a custom comparison function
 */
export default memo(OptimizedTable, (prevProps, nextProps) => {
  // Only re-render if one of these props changed
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.tableDiameter === nextProps.tableDiameter &&
    prevProps.section.id === nextProps.section.id &&
    prevProps.section.name === nextProps.section.name &&
    prevProps.section.shape === nextProps.section.shape &&
    prevProps.section.rotation === nextProps.section.rotation &&
    JSON.stringify(prevProps.section.dimensions) === JSON.stringify(nextProps.section.dimensions)
  );
});
