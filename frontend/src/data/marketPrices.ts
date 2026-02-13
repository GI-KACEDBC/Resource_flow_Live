// ## Market Price Data Table
// ## Contains reference prices for automatic price initialization
// ## In production, this would be populated from an API or database

// ## Market price data structure
export interface MarketPrice {
  itemName: string;
  brand?: string;
  specification: string;
  category: 'Food' | 'Medicine' | 'Equipment' | 'Other';
  basePrice: number; // ## Price per unit in GH₵
  unit: string;
  lastUpdated: string;
}

export const marketPriceTable: MarketPrice[] = [
  // Food Items
  {
    itemName: 'Rice',
    brand: 'Royal Feast',
    specification: '50kg Bag',
    category: 'Food',
    basePrice: 1150,
    unit: 'bag',
    lastUpdated: '2024-02-15',
  },
  {
    itemName: 'Rice',
    brand: 'FarmFresh',
    specification: '25kg Bag',
    category: 'Food',
    basePrice: 580,
    unit: 'bag',
    lastUpdated: '2024-02-15',
  },
  {
    itemName: 'Maize',
    brand: 'FarmFresh',
    specification: '25kg Bag',
    category: 'Food',
    basePrice: 500,
    unit: 'bag',
    lastUpdated: '2024-02-15',
  },
  {
    itemName: 'Cooking Oil',
    brand: 'Golden Harvest',
    specification: '5L Bottle',
    category: 'Food',
    basePrice: 100,
    unit: 'bottle',
    lastUpdated: '2024-02-15',
  },
  
  // Medicine Items
  {
    itemName: 'Paracetamol',
    brand: 'PharmaCare',
    specification: '500mg Tablets',
    category: 'Medicine',
    basePrice: 50,
    unit: 'box',
    lastUpdated: '2024-02-15',
  },
  {
    itemName: 'Antibiotics',
    brand: 'HealthFirst',
    specification: 'Amoxicillin 250mg',
    category: 'Medicine',
    basePrice: 150,
    unit: 'box',
    lastUpdated: '2024-02-15',
  },
  
  // Equipment Items
  {
    itemName: 'Water Pumps',
    brand: 'AquaFlow',
    specification: 'Solar-Powered, 500L/min',
    category: 'Equipment',
    basePrice: 5000,
    unit: 'unit',
    lastUpdated: '2024-02-15',
  },
];

// ## Get market price for a specific item
// ## Matches by item name, brand (if provided), and specification
export const getMarketPrice = (
  itemName: string,
  specification: string,
  brand?: string
): number | null => {
  // ## Search for exact match in price table
  const match = marketPriceTable.find(
    (price) =>
      price.itemName.toLowerCase() === itemName.toLowerCase() &&
      price.specification.toLowerCase() === specification.toLowerCase() &&
      (!brand || price.brand?.toLowerCase() === brand.toLowerCase())
  );
  
  // ## Return matched price or null if not found
  return match ? match.basePrice : null;
};

// ## Get default market price when exact match is not found
// ## Uses category averages or weight-based estimation
export const getDefaultMarketPrice = (
  category: 'Food' | 'Medicine' | 'Equipment' | 'Other',
  specification: string
): number => {
  // ## Category-based fallback pricing
  const categoryAverages: Record<string, number> = {
    Food: 500,
    Medicine: 100,
    Equipment: 2000,
    Other: 300,
  };
  
  // ## Extract weight/quantity from specification for better estimation
  const weightMatch = specification.match(/(\d+)\s*(kg|g|L|ml)/i);
  if (weightMatch) {
    const weight = parseFloat(weightMatch[1]);
    const unit = weightMatch[2].toLowerCase();
    
    // ## Calculate price based on weight for food items
    if (category === 'Food') {
      // ## ~GH₵20 per kg for food items
      if (unit === 'kg') return weight * 20;
      // ## ~GH₵15 per L for liquid items
      if (unit === 'l' || unit === 'ml') return weight * 15;
    }
  }
  
  // ## Return category average or default fallback
  return categoryAverages[category] || 300;
};
