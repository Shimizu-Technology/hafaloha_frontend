// src/ordering/components/admin/reservations/OptimizedSeat.tsx
import React, { memo } from 'react';
import { Seat } from '../../../services/api-layouts';

interface OptimizedSeatProps {
  seat: Seat;
  index: number;
  isSelected: boolean;
  onClick?: (seat: Seat, index: number) => void;
}

/**
 * Optimized seat component with memoization to prevent unnecessary re-renders
 * This improves performance for complex layouts with many tables and seats
 */
const OptimizedSeat: React.FC<OptimizedSeatProps> = ({ 
  seat, 
  index, 
  isSelected,
  onClick 
}) => {
  // Handle seat click
  const handleClick = () => {
    if (onClick) {
      onClick(seat, index);
    }
  };

  return (
    <div
      className={`absolute transition-all duration-200 flex items-center justify-center
        ${seat.isCorner ? 'rounded-md bg-blue-500' : 'rounded-full bg-amber-500'}
        ${isSelected ? 'scale-110 shadow-md' : 'scale-100 shadow-sm'}
      `}
      style={{
        left: seat.position_x,
        top: seat.position_y,
        width: '20px',
        height: '20px',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: 10, // Seats above tables
      }}
      onClick={handleClick}
    >
      {/* Seat number with better visibility */}
      <span 
        className="text-[10px] font-bold bg-white bg-opacity-75 rounded-full w-[14px] h-[14px] flex items-center justify-center"
      >
        {index + 1}
      </span>
    </div>
  );
};

/**
 * Use React.memo to prevent unnecessary re-renders when props haven't changed
 */
export default memo(OptimizedSeat, (prevProps, nextProps) => {
  // Only re-render if these props changed
  return (
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.seat.id === nextProps.seat.id &&
    prevProps.seat.position_x === nextProps.seat.position_x &&
    prevProps.seat.position_y === nextProps.seat.position_y &&
    prevProps.seat.isCorner === nextProps.seat.isCorner
  );
});
