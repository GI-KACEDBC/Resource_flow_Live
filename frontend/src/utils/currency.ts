// ## Currency Formatting Utility
// ## Provides functions to format monetary values in Ghana Cedi (GH₵)

// ## Main currency formatting function
// ## Converts numeric values to formatted Ghana Cedi strings
export const formatCurrency = (
  amount: number | string,
  options: {
    showSymbol?: boolean;
    decimals?: number;
    compact?: boolean;
  } = {}
): string => {
  // ## Extract formatting options with defaults
  const {
    showSymbol = true,
    decimals = 2,
    compact = false,
  } = options;

  // ## Convert string to number if needed
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // ## Return zero if amount is invalid
  if (isNaN(numAmount)) {
    return showSymbol ? 'GH₵ 0.00' : '0.00';
  }

  let formatted: string;

  // ## Handle compact notation for large numbers
  if (compact && numAmount >= 1000) {
    // ## Format millions (e.g., 1.2M)
    if (numAmount >= 1000000) {
      formatted = (numAmount / 1000000).toFixed(1) + 'M';
    } 
    // ## Format thousands (e.g., 1.5K)
    else if (numAmount >= 1000) {
      formatted = (numAmount / 1000).toFixed(1) + 'K';
    } 
    // ## Use standard decimals for smaller numbers
    else {
      formatted = numAmount.toFixed(decimals);
    }
  } 
  // ## Standard formatting with thousand separators
  else {
    formatted = numAmount.toLocaleString('en-GH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // ## Return formatted string with or without symbol
  return showSymbol ? `GH₵ ${formatted}` : formatted;
};

// ## Simplified formatting function for consistent GH₵ display
// ## Always shows symbol and uses 2 decimal places
export const formatGHC = (amount: number | string): string => {
  return formatCurrency(amount, { showSymbol: true, decimals: 2 });
};

// ## Format currency value without symbol
// ## Used for input fields and calculations
export const formatCurrencyValue = (amount: number | string): string => {
  return formatCurrency(amount, { showSymbol: false });
};

// ## Parse currency string back to number
// ## Removes GH₵ symbol, spaces, and commas before parsing
export const parseCurrency = (value: string): number => {
  // ## Clean the string by removing currency symbols and formatting
  const cleaned = value.replace(/GH₵/g, '').replace(/\s/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};
