// src/ordering/components/admin/reports/MenuItemPerformance.tsx
import React, { useState, useMemo } from 'react';
import { MenuItemReport, CategoryReport } from '../../../../shared/api';
import * as XLSX from 'xlsx';

interface MenuItemPerformanceProps {
  menuItems: MenuItemReport[];
  categories: CategoryReport[];
}

// Interface for grouped menu items
interface GroupedMenuItem {
  id: number;
  name: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  variants: MenuItemReport[];
}

export function MenuItemPerformance({ menuItems, categories }: MenuItemPerformanceProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'name'>('revenue');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Helper function to format customizations for display
  const formatCustomizationsForDisplay = (customizations: Record<string, any>): string => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return 'Standard (No Customizations)';
    }
    
    return Object.entries(customizations).map(([optionGroup, selections]) => {
      let selectionsText = '';
      if (Array.isArray(selections)) {
        selectionsText = selections.join(', ');
      } else if (typeof selections === 'string') {
        selectionsText = selections;
      } else {
        selectionsText = String(selections);
      }
      return `${optionGroup}: ${selectionsText}`;
    }).join(' | ');
  };

  // Group menu items by name and category
  const groupedMenuItems = useMemo(() => {
    const groups: Record<string, GroupedMenuItem> = {};
    
    menuItems.forEach(item => {
      const key = `${item.name}_${item.category}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: item.id,
          name: item.name,
          category: item.category,
          totalQuantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
          variants: []
        };
      }
      
      groups[key].variants.push(item);
      groups[key].totalQuantitySold += item.quantity_sold;
      groups[key].totalRevenue += Number(item.revenue);
    });
    
    // Calculate average prices
    Object.values(groups).forEach(group => {
      group.averagePrice = group.totalQuantitySold > 0 ? group.totalRevenue / group.totalQuantitySold : 0;
    });
    
    return Object.values(groups);
  }, [menuItems]);

  // Sort categories by revenue
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }, [categories]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = groupedMenuItems;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'quantity':
          return b.totalQuantitySold - a.totalQuantitySold;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });
  }, [groupedMenuItems, searchTerm, sortBy]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedItems, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE);

  // Toggle item expansion
  const toggleItemExpanded = (groupKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedItems(newExpanded);
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (groupedMenuItems.length === 0 && categories.length === 0) {
      alert('No data to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Categories
    const categoryData = sortedCategories.map((cat, index) => ({
      'Rank': index + 1,
      'Category': cat.name,
      'Items Sold': cat.quantity_sold,
      'Revenue': `$${Number(cat.revenue).toFixed(2)}`,
      'Avg per Item': `$${(Number(cat.revenue) / cat.quantity_sold).toFixed(2)}`
    }));

    // Menu Items
    const itemData: any[] = [];
    filteredAndSortedItems.forEach((group) => {
      // Main item
      itemData.push({
        'Item': group.name,
        'Category': group.category,
        'Type': 'TOTAL',
        'Quantity Sold': group.totalQuantitySold,
        'Revenue': `$${group.totalRevenue.toFixed(2)}`,
        'Avg Price': `$${group.averagePrice.toFixed(2)}`,
        'Variants': group.variants.length,
        'Customizations': `${group.variants.length} variant${group.variants.length !== 1 ? 's' : ''}`
      });
      
      // Variants
      group.variants.forEach((variant, idx) => {
        itemData.push({
          'Item': `  └─ Variant ${idx + 1}`,
          'Category': variant.category,
          'Type': 'VARIANT',
          'Quantity Sold': variant.quantity_sold,
          'Revenue': `$${Number(variant.revenue).toFixed(2)}`,
          'Avg Price': `$${variant.average_price ? Number(variant.average_price).toFixed(2) : '0.00'}`,
          'Variants': '',
          'Customizations': formatCustomizationsForDisplay(variant.customizations || {})
        });
      });
    });

    // Add sheets
    if (categoryData.length > 0) {
      const catSheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');
    }

    const itemSheet = XLSX.utils.json_to_sheet(itemData);
    XLSX.utils.book_append_sheet(wb, itemSheet, 'Menu Items');

    // Export
    const now = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Menu_Performance_${now}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Menu Item Performance</h3>
          <p className="text-gray-600 text-sm mt-1">
            {groupedMenuItems.length} items • {groupedMenuItems.reduce((sum, item) => sum + item.variants.length, 0)} variants
          </p>
        </div>
        
        {(groupedMenuItems.length > 0 || categories.length > 0) && (
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export to Excel
          </button>
        )}
      </div>

      {/* Categories Section */}
      {sortedCategories.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Category Performance</h4>
          <div className="space-y-3">
            {sortedCategories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-orange-700">#{idx + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {cat.name.length > 50 ? `${cat.name.substring(0, 50)}...` : cat.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {cat.quantity_sold} items sold • ${(Number(cat.revenue) / cat.quantity_sold).toFixed(2)} avg
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">${Number(cat.revenue).toFixed(2)}</div>
                  <div className="text-sm text-gray-600">
                    {((Number(cat.revenue) / sortedCategories.reduce((sum, c) => sum + Number(c.revenue), 0)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">Menu Items</h4>
          
          {/* Search and Sort */}
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-48"
            />
            
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="revenue">Revenue</option>
              <option value="quantity">Quantity</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {paginatedItems.length > 0 ? (
          <div className="space-y-4">
            {paginatedItems.map((group) => {
              const groupKey = `${group.name}_${group.category}`;
              const isExpanded = expandedItems.has(groupKey);
              
              return (
                <div key={groupKey} className="border border-gray-200 rounded-lg">
                  {/* Main Item */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleItemExpanded(groupKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className={`w-4 h-4 transition-transform text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-900">{group.name}</div>
                          <div className="text-sm text-gray-600">
                            {group.category} • {group.totalQuantitySold} sold • {group.variants.length} variant{group.variants.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">${group.totalRevenue.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">${group.averagePrice.toFixed(2)} avg</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Variants */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="space-y-3">
                        {group.variants.map((variant, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-orange-700">#{idx + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {variant.customizations && Object.keys(variant.customizations).length > 0 
                                      ? `Variant ${idx + 1}`
                                      : 'Standard'
                                    }
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {variant.quantity_sold} sold
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  ${Number(variant.revenue).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  ${variant.average_price ? Number(variant.average_price).toFixed(2) : '0.00'} each
                                </div>
                              </div>
                            </div>
                            
                            {/* Customizations */}
                            {variant.customizations && Object.keys(variant.customizations).length > 0 && (
                              <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                                <div className="text-xs text-orange-800">
                                  {formatCustomizationsForDisplay(variant.customizations)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === pageNum
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-2">No menu items found</div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-orange-600 hover:text-orange-700 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}