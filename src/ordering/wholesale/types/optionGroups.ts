// src/ordering/wholesale/types/optionGroups.ts

/**
 * Option for a fundraiser item
 */
export interface FundraiserOption {
  id: number;
  name: string;
  additional_price: number;
  additional_price_float?: number; // Float version for display
  position: number;
  is_preselected: boolean;
  is_available: boolean;
}

/**
 * Option Group for a fundraiser item
 */
export interface FundraiserOptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  free_option_count: number;
  // position field removed - not supported in backend
  options: FundraiserOption[];
  has_available_options?: boolean;
  required?: boolean; // Whether this option group is required (min_select > 0)
}

/**
 * User's selection of options for a cart item
 */
export interface SelectedOption {
  id: number;
  name: string;
  additional_price: number;
}

/**
 * Group of selected options for a cart item
 */
export interface SelectedOptionGroup {
  id: number;
  name: string;
  options: SelectedOption[];
}
