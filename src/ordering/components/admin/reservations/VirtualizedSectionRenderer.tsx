// src/ordering/components/admin/reservations/VirtualizedSectionRenderer.tsx
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { SeatSection } from '../../../services/api-layouts';
import OptimizedTable from './OptimizedTable';
import OptimizedSeat from './OptimizedSeat';
import { calculateSeatPathData } from '../../../utils/performance-optimizations';

interface VirtualizedSectionRendererProps {
  sections: SeatSection[];
  selectedSection: string | null;
  tableDiameter: number;
  containerWidth: number;
  containerHeight: number;
  onSelectSection: (id: string) => void;
  onSelectSeat?: (sectionId: string, seatIndex: number) => void;
}

/**
 * Performance-optimized section renderer that uses virtualization for large layouts
 * Only renders tables and seats that are currently in the viewport
 */
const VirtualizedSectionRenderer: React.FC<VirtualizedSectionRendererProps> = ({
  sections,
  selectedSection,
  tableDiameter,
  containerWidth,
  containerHeight,
  onSelectSection,
  onSelectSeat
}) => {
  // Skip virtualization for small layouts (less than 20 tables)
  const useVirtualization = sections.length >= 20;
  
  // Memoize the section renderer to prevent unnecessary recalculations
  const renderSection = useMemo(() => (
    { index, style }: { index: number; style: React.CSSProperties }
  ) => {
    const section = sections[index];
    const isSelected = selectedSection === section.id;
    
    return (
      <div 
        key={section.id}
        style={{
          ...style,
          position: 'absolute',
          left: section.offsetX,
          top: section.offsetY,
          width: 0,
          height: 0
        }}
      >
        {/* Optimized Table Component */}
        <OptimizedTable
          section={section}
          isSelected={isSelected}
          tableDiameter={tableDiameter}
          onClick={() => onSelectSection(section.id)}
        />
        
        {/* Seat Connector Path - only shown when section is selected */}
        {isSelected && section.seats.length > 1 && (
          <svg
            className="absolute left-0 top-0 pointer-events-none"
            style={{ 
              width: '100%', 
              height: '100%', 
              overflow: 'visible',
              zIndex: 5 
            }}
          >
            <path
              d={calculateSeatPathData(section.seats)}
              fill="none"
              stroke="#0078d4"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              opacity="0.6"
            />
          </svg>
        )}
        
        {/* Render Seats */}
        {section.seats.map((seat, i) => (
          <OptimizedSeat
            key={`${section.id}-seat-${i}`}
            seat={seat}
            index={i}
            isSelected={isSelected}
            onClick={
              onSelectSeat 
                ? () => onSelectSeat(section.id, i) 
                : undefined
            }
          />
        ))}
      </div>
    );
  }, [sections, selectedSection, tableDiameter, onSelectSection, onSelectSeat]);
  
  // For smaller layouts, render directly without virtualization
  if (!useVirtualization) {
    return (
      <div className="relative w-full h-full">
        {sections.map((_, index) => renderSection({ index, style: {} }))}
      </div>
    );
  }
  
  // For large layouts, use virtualization
  return (
    <List
      className="virtualized-section-list"
      width={containerWidth}
      height={containerHeight}
      itemCount={sections.length}
      itemSize={20} // This is just for the list calculations, actual positions are absolute
      layout="horizontal" // Use horizontal layout since we're positioning absolutely
      overscanCount={5} // Render a few extra items for smoother scrolling
    >
      {renderSection}
    </List>
  );
};

export default React.memo(VirtualizedSectionRenderer);
