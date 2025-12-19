/**
 * Format a number as Indian Rupees with proper decimal places
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatINR = (amount: number, decimals: number = 2): string => {
  return `₹${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
};

/**
 * Calculate savings between two prices
 * @param originalPrice - Original price per unit
 * @param newPrice - New price per unit
 * @param quantity - Quantity of units
 * @returns Savings amount
 */
export const calculateSavings = (originalPrice: number, newPrice: number, quantity: number): number => {
  return (originalPrice - newPrice) * quantity;
};
