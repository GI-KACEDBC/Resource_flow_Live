// ## Region Name Normalization Utility
// ## Handles mapping between SVG region names and data region names

// ## GHANA_REGIONS constant - Exact region names as they appear in the SVG
// ## Keys are the SVG region identifiers (uppercase), values are normalized data names
export const GHANA_REGIONS = {
  'WESTERN NORTH': 'Western North',
  'BONO EAST': 'Bono East',
  'GREATER ACCRA': 'Greater Accra',
  'UPPER EAST': 'Upper East',
  'UPPER WEST': 'Upper West',
  'NORTH EAST': 'North East',
  'NORTHERN': 'Northern',
  'SAVANNAH': 'Savannah',
  'BONO': 'Bono',
  'AHAFO': 'Ahafo',
  'ASHANTI': 'Ashanti',
  'EASTERN': 'Eastern',
  'VOLTA': 'Volta',
  'OTI': 'Oti',
  'CENTRAL': 'Central',
  'WESTERN': 'Western',
} as const;

// ## All 16 region names in normalized format (for data matching)
export const NORMALIZED_REGIONS = [
  'Western North',
  'Bono East',
  'Greater Accra',
  'Upper East',
  'Upper West',
  'North East',
  'Northern',
  'Savannah',
  'Bono',
  'Ahafo',
  'Ashanti',
  'Eastern',
  'Volta',
  'Oti',
  'Central',
  'Western',
] as const;

// ## Normalization function to map SVG region names to data region names
// ## Handles variations in naming (uppercase, spaces, etc.)
export const normalizeRegionName = (svgRegionName: string): string => {
  // ## First, try direct lookup in GHANA_REGIONS
  if (GHANA_REGIONS[svgRegionName.toUpperCase() as keyof typeof GHANA_REGIONS]) {
    return GHANA_REGIONS[svgRegionName.toUpperCase() as keyof typeof GHANA_REGIONS];
  }

  // ## Convert to title case and handle common variations
  const normalized = svgRegionName
    .toLowerCase()
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // ## Handle specific mappings
  const regionMap: Record<string, string> = {
    'western north': 'Western North',
    'bono east': 'Bono East',
    'greater accra': 'Greater Accra',
    'upper east': 'Upper East',
    'upper west': 'Upper West',
    'north east': 'North East',
    'northern': 'Northern',
    'savannah': 'Savannah',
    'bono': 'Bono',
    'ahafo': 'Ahafo',
    'ashanti': 'Ashanti',
    'eastern': 'Eastern',
    'volta': 'Volta',
    'oti': 'Oti',
    'central': 'Central',
    'western': 'Western',
  };

  return regionMap[normalized.toLowerCase()] || normalized;
};

// ## Reverse mapping: from data region name to SVG region name (for finding paths)
export const getSVGRegionName = (dataRegionName: string): keyof typeof GHANA_REGIONS | null => {
  const entries = Object.entries(GHANA_REGIONS) as [keyof typeof GHANA_REGIONS, string][];
  const found = entries.find(([_, value]) => value === dataRegionName);
  return found ? found[0] : null;
};

// ## Check if a region name is valid
export const isValidRegion = (regionName: string): boolean => {
  const normalized = normalizeRegionName(regionName);
  return NORMALIZED_REGIONS.includes(normalized as typeof NORMALIZED_REGIONS[number]);
};
