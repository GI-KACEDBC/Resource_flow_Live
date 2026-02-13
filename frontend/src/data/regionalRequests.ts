// ## Regional Request Data
// ## Tracks open requests by region for heat map visualization

// ## Interface for a regional request
export interface RegionalRequest {
  id: string;
  region: string;
  item: string;
  specification: string;
  quantity: number;
  unit: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Food' | 'Medicine' | 'Equipment' | 'Other';
  recipient: string;
  createdAt: string;
  estimatedValue?: number; // ## In GH₵
}

// ## Interface for regional statistics
export interface RegionStats {
  region: string;
  totalRequests: number;
  criticalRequests: number;
  highUrgencyRequests: number;
  mediumUrgencyRequests: number;
  lowUrgencyRequests: number;
  urgencyScore: number; // ## 0-100, higher = more urgent
  requests: RegionalRequest[];
}

// ## Mock regional request data
export const mockRegionalRequests: RegionalRequest[] = [
  // ## Greater Accra
  {
    id: 'req-001',
    region: 'Greater Accra',
    item: 'Rice',
    specification: '50kg Bags',
    quantity: 200,
    unit: 'bags',
    urgency: 'Critical',
    category: 'Food',
    recipient: 'Orphanage A',
    createdAt: '2024-02-15',
    estimatedValue: 240000,
  },
  {
    id: 'req-002',
    region: 'Greater Accra',
    item: 'Paracetamol',
    specification: '500mg Tablets',
    quantity: 5000,
    unit: 'tablets',
    urgency: 'High',
    category: 'Medicine',
    recipient: 'Community Health Center',
    createdAt: '2024-02-14',
    estimatedValue: 2500,
  },
  // ## Ashanti
  {
    id: 'req-003',
    region: 'Ashanti',
    item: 'Cooking Oil',
    specification: '5L Bottles',
    quantity: 150,
    unit: 'bottles',
    urgency: 'Critical',
    category: 'Food',
    recipient: 'Rural Primary School',
    createdAt: '2024-02-16',
    estimatedValue: 18000,
  },
  {
    id: 'req-004',
    region: 'Ashanti',
    item: 'Solar Panel',
    specification: '100W',
    quantity: 30,
    unit: 'units',
    urgency: 'High',
    category: 'Equipment',
    recipient: 'Rural Electrification Project',
    createdAt: '2024-02-13',
    estimatedValue: 25500,
  },
  {
    id: 'req-005',
    region: 'Ashanti',
    item: 'Textbooks',
    specification: 'Primary Math (Set)',
    quantity: 100,
    unit: 'sets',
    urgency: 'Medium',
    category: 'Other',
    recipient: 'Community School',
    createdAt: '2024-02-10',
    estimatedValue: 25000,
  },
  // ## Northern
  {
    id: 'req-006',
    region: 'Northern',
    item: 'Rice',
    specification: '25kg Bags',
    quantity: 500,
    unit: 'bags',
    urgency: 'Critical',
    category: 'Food',
    recipient: 'Disaster Relief Center',
    createdAt: '2024-02-17',
    estimatedValue: 300000,
  },
  {
    id: 'req-007',
    region: 'Northern',
    item: 'Malaria Test Kits',
    specification: 'Box of 25 kits',
    quantity: 200,
    unit: 'boxes',
    urgency: 'Critical',
    category: 'Medicine',
    recipient: 'Regional Hospital',
    createdAt: '2024-02-16',
    estimatedValue: 40000,
  },
  {
    id: 'req-008',
    region: 'Northern',
    item: 'Water Pump',
    specification: 'Portable Diesel',
    quantity: 5,
    unit: 'units',
    urgency: 'High',
    category: 'Equipment',
    recipient: 'Irrigation Project',
    createdAt: '2024-02-12',
    estimatedValue: 12500,
  },
  // ## Volta
  {
    id: 'req-009',
    region: 'Volta',
    item: 'Gari',
    specification: '10kg Bags',
    quantity: 300,
    unit: 'bags',
    urgency: 'High',
    category: 'Food',
    recipient: 'Community Food Bank',
    createdAt: '2024-02-15',
    estimatedValue: 60000,
  },
  // ## Western
  {
    id: 'req-010',
    region: 'Western',
    item: 'Antibiotics',
    specification: 'Blister Pack (10 tabs)',
    quantity: 100,
    unit: 'packs',
    urgency: 'High',
    category: 'Medicine',
    recipient: 'District Hospital',
    createdAt: '2024-02-14',
    estimatedValue: 4500,
  },
  // ## Central
  {
    id: 'req-011',
    region: 'Central',
    item: 'Sugar',
    specification: '1kg Pack',
    quantity: 500,
    unit: 'packs',
    urgency: 'Medium',
    category: 'Food',
    recipient: 'Community Center',
    createdAt: '2024-02-13',
    estimatedValue: 12500,
  },
  // ## Eastern
  {
    id: 'req-012',
    region: 'Eastern',
    item: 'Rice',
    specification: '50kg Bags',
    quantity: 100,
    unit: 'bags',
    urgency: 'Medium',
    category: 'Food',
    recipient: 'Orphanage B',
    createdAt: '2024-02-11',
    estimatedValue: 120000,
  },
  // ## Upper East
  {
    id: 'req-013',
    region: 'Upper East',
    item: 'Paracetamol',
    specification: '500mg Tablets',
    quantity: 2000,
    unit: 'tablets',
    urgency: 'Critical',
    category: 'Medicine',
    recipient: 'Regional Clinic',
    createdAt: '2024-02-18',
    estimatedValue: 1000,
  },
  // ## Upper West
  {
    id: 'req-014',
    region: 'Upper West',
    item: 'Solar Panel',
    specification: '100W',
    quantity: 20,
    unit: 'units',
    urgency: 'High',
    category: 'Equipment',
    recipient: 'Rural School',
    createdAt: '2024-02-15',
    estimatedValue: 17000,
  },
  // ## Bono
  {
    id: 'req-015',
    region: 'Bono',
    item: 'Cooking Oil',
    specification: '5L Bottles',
    quantity: 80,
    unit: 'bottles',
    urgency: 'Medium',
    category: 'Food',
    recipient: 'Community Kitchen',
    createdAt: '2024-02-12',
    estimatedValue: 9600,
  },
  // ## Bono East
  {
    id: 'req-016',
    region: 'Bono East',
    item: 'Textbooks',
    specification: 'Primary Math (Set)',
    quantity: 50,
    unit: 'sets',
    urgency: 'Low',
    category: 'Other',
    recipient: 'Primary School',
    createdAt: '2024-02-10',
    estimatedValue: 12500,
  },
  // ## Ahafo
  {
    id: 'req-017',
    region: 'Ahafo',
    item: 'Rice',
    specification: '25kg Bags',
    quantity: 150,
    unit: 'bags',
    urgency: 'Medium',
    category: 'Food',
    recipient: 'Food Distribution Center',
    createdAt: '2024-02-14',
    estimatedValue: 90000,
  },
  // ## Western North
  {
    id: 'req-018',
    region: 'Western North',
    item: 'Malaria Test Kits',
    specification: 'Box of 25 kits',
    quantity: 75,
    unit: 'boxes',
    urgency: 'High',
    category: 'Medicine',
    recipient: 'Health Center',
    createdAt: '2024-02-16',
    estimatedValue: 15000,
  },
  // ## Oti
  {
    id: 'req-019',
    region: 'Oti',
    item: 'Gari',
    specification: '10kg Bags',
    quantity: 200,
    unit: 'bags',
    urgency: 'High',
    category: 'Food',
    recipient: 'Community Support',
    createdAt: '2024-02-15',
    estimatedValue: 40000,
  },
  // ## Savannah
  {
    id: 'req-020',
    region: 'Savannah',
    item: 'Water Pump',
    specification: 'Portable Diesel',
    quantity: 3,
    unit: 'units',
    urgency: 'Critical',
    category: 'Equipment',
    recipient: 'Irrigation Initiative',
    createdAt: '2024-02-17',
    estimatedValue: 7500,
  },
  // ## North East
  {
    id: 'req-021',
    region: 'North East',
    item: 'Antibiotics',
    specification: 'Blister Pack (10 tabs)',
    quantity: 150,
    unit: 'packs',
    urgency: 'Critical',
    category: 'Medicine',
    recipient: 'District Hospital',
    createdAt: '2024-02-18',
    estimatedValue: 6750,
  },
];

// ## Calculate urgency score (0-100) based on request urgency levels
const getUrgencyWeight = (urgency: string): number => {
  switch (urgency) {
    case 'Critical': return 100;
    case 'High': return 70;
    case 'Medium': return 40;
    case 'Low': return 10;
    default: return 0;
  }
};

// ## Calculate regional statistics from requests
export const calculateRegionStats = (requests: RegionalRequest[]): RegionStats[] => {
  // ## List of all 16 Ghana regions
  const allRegions = [
    'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western',
    'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
    'Bono East', 'Ahafo', 'Savannah', 'North East', 'Oti', 'Western North'
  ];

  // ## Group requests by region
  const regionMap = new Map<string, RegionalRequest[]>();
  allRegions.forEach(region => {
    regionMap.set(region, []);
  });

  requests.forEach(request => {
    const existing = regionMap.get(request.region) || [];
    regionMap.set(request.region, [...existing, request]);
  });

  // ## Calculate stats for each region
  return allRegions.map(region => {
    const regionRequests = regionMap.get(region) || [];
    const critical = regionRequests.filter(r => r.urgency === 'Critical').length;
    const high = regionRequests.filter(r => r.urgency === 'High').length;
    const medium = regionRequests.filter(r => r.urgency === 'Medium').length;
    const low = regionRequests.filter(r => r.urgency === 'Low').length;

    // ## Calculate weighted urgency score
    const urgencyScore = Math.min(100, Math.max(0,
      (critical * 100 + high * 70 + medium * 40 + low * 10) / Math.max(1, regionRequests.length)
    ));

    return {
      region,
      totalRequests: regionRequests.length,
      criticalRequests: critical,
      highUrgencyRequests: high,
      mediumUrgencyRequests: medium,
      lowUrgencyRequests: low,
      urgencyScore: Math.round(urgencyScore),
      requests: regionRequests,
    };
  });
};

// ## Get heat color based on urgency score
export const getHeatColor = (urgencyScore: number): string => {
  if (urgencyScore >= 80) return '#EF4444'; // ## Red - Critical
  if (urgencyScore >= 60) return '#F59E0B'; // ## Amber - High
  if (urgencyScore >= 40) return '#EAB308'; // ## Yellow - Medium
  if (urgencyScore >= 20) return '#84CC16'; // ## Green - Low-Medium
  return '#3B82F6'; // ## Blue - Low
};

// ## Get urgency label from score
export const getUrgencyLabel = (urgencyScore: number): string => {
  if (urgencyScore >= 80) return 'Critical';
  if (urgencyScore >= 60) return 'High';
  if (urgencyScore >= 40) return 'Medium';
  return 'Low';
};
