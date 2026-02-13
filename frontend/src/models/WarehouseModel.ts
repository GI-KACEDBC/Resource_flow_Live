// ## Warehouse Model
// ## Single Source of Truth for warehouse and inventory data and business logic
import { Warehouse, InventoryItem } from '../types/inventory';
import { getMarketPrice, getDefaultMarketPrice } from '../data/marketPrices';

// ## Mock warehouse data
const mockWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    name: 'Accra Central Warehouse',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'GA-123-4567, North Legon, Accra',
    capacity: 5000,
    capacityUnit: 'm²',
    manager: 'Kwame Asante',
    contact: '+233 24 123 4567',
    contactPerson: 'Kwame Asante',
    contactPhone: '+233 24 123 4567',
    contactEmail: 'kwame.asante@resourceflow.gh',
    status: 'Active',
    currentOccupancy: 3200,
    createdAt: '2024-01-15',
    updatedAt: '2024-02-10',
  },
  {
    id: 'wh-002',
    name: 'Kumasi Distribution Hub',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'AS-234-5678, Adum, Kumasi',
    capacity: 3500,
    capacityUnit: 'm²',
    manager: 'Ama Osei',
    contact: '+233 24 234 5678',
    contactPerson: 'Ama Osei',
    contactPhone: '+233 24 234 5678',
    contactEmail: 'ama.osei@resourceflow.gh',
    status: 'Active',
    currentOccupancy: 2800,
    createdAt: '2024-01-20',
    updatedAt: '2024-02-08',
  },
  {
    id: 'wh-003',
    name: 'Tamale Cold Storage',
    city: 'Tamale',
    region: 'Northern',
    address: 'NO-345-6789, Central Business District, Tamale',
    capacity: 2000,
    capacityUnit: 'm²',
    manager: 'Ibrahim Mohammed',
    contact: '+233 24 345 6789',
    contactPerson: 'Ibrahim Mohammed',
    contactPhone: '+233 24 345 6789',
    contactEmail: 'ibrahim.mohammed@resourceflow.gh',
    status: 'Active',
    currentOccupancy: 1500,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-12',
  },
  {
    id: 'wh-004',
    name: 'Takoradi Port Warehouse',
    city: 'Takoradi',
    region: 'Western',
    address: 'WE-456-7890, Port Area, Takoradi',
    capacity: 4000,
    capacityUnit: 'Pallets',
    manager: 'Kofi Mensah',
    contact: '+233 24 456 7890',
    contactPerson: 'Kofi Mensah',
    contactPhone: '+233 24 456 7890',
    contactEmail: 'kofi.mensah@resourceflow.gh',
    status: 'Full',
    currentOccupancy: 4000,
    createdAt: '2024-01-10',
    updatedAt: '2024-02-15',
  },
];

// ## Mock inventory data
const mockInventory: InventoryItem[] = [
  {
    id: 'inv-001',
    category: 'Food',
    itemName: 'Rice',
    brand: 'Royal Feast',
    batchNumber: 'RF-2024-001',
    specification: '50kg Bag',
    quantity: 150,
    unit: 'bags',
    colocation: {
      facility: 'Accra Central Warehouse',
      subLocation: 'Aisle 4, Shelf B',
    },
    donorInfo: {
      name: 'Ghana Food Distributors Ltd',
      supplierId: 'supp-001',
    },
    status: 'Available',
    dateReceived: '2024-02-01',
    expiryDate: '2025-12-31',
    marketPrice: getMarketPrice('Rice', '50kg Bag', 'Royal Feast') || getDefaultMarketPrice('Food', '50kg Bag'),
    priceStatus: 'Pending Review',
    value: undefined,
    notes: 'Premium quality rice',
  },
  {
    id: 'inv-002',
    category: 'Medicine',
    itemName: 'Paracetamol',
    brand: 'PharmaCare',
    batchNumber: 'PC-2024-045',
    specification: '500mg Tablets',
    quantity: 500,
    unit: 'boxes',
    colocation: {
      facility: 'Kumasi Distribution Hub',
      subLocation: 'Medical Storage, Rack 3',
    },
    donorInfo: {
      name: 'MedSupply Ghana',
      supplierId: 'supp-002',
    },
    status: 'Available',
    dateReceived: '2024-01-25',
    expiryDate: '2025-06-30',
    marketPrice: getMarketPrice('Paracetamol', '500mg Tablets', 'PharmaCare') || getDefaultMarketPrice('Medicine', '500mg Tablets'),
    priceStatus: 'Locked',
    value: 25000,
    auditedPrice: 25000,
    lockedAt: '2024-01-26',
    lockedBy: 'Auditor-001',
  },
  {
    id: 'inv-003',
    category: 'Food',
    itemName: 'Maize',
    brand: 'FarmFresh',
    batchNumber: 'FF-2024-012',
    specification: '25kg Bag',
    quantity: 200,
    unit: 'bags',
    colocation: {
      facility: 'Tamale Cold Storage',
      subLocation: 'Grain Storage, Section A',
    },
    donorInfo: {
      name: 'Northern Farmers Cooperative',
      supplierId: 'supp-003',
    },
    status: 'Reserved',
    dateReceived: '2024-02-05',
    expiryDate: '2025-08-15',
    marketPrice: getMarketPrice('Maize', '25kg Bag', 'FarmFresh') || getDefaultMarketPrice('Food', '25kg Bag'),
    priceStatus: 'Estimated',
    value: undefined,
  },
  {
    id: 'inv-004',
    category: 'Equipment',
    itemName: 'Water Pumps',
    brand: 'AquaFlow',
    batchNumber: 'AF-2024-008',
    specification: 'Solar-Powered, 500L/min',
    quantity: 25,
    unit: 'units',
    colocation: {
      facility: 'Accra Central Warehouse',
      subLocation: 'Equipment Bay, Zone 2',
    },
    donorInfo: {
      name: 'Tech Solutions Ghana',
      supplierId: 'supp-004',
    },
    status: 'Available',
    dateReceived: '2024-01-30',
    marketPrice: getMarketPrice('Water Pumps', 'Solar-Powered, 500L/min', 'AquaFlow') || getDefaultMarketPrice('Equipment', 'Solar-Powered, 500L/min'),
    priceStatus: 'Locked',
    value: 125000,
    auditedPrice: 125000,
    lockedAt: '2024-02-01',
    lockedBy: 'Auditor-001',
  },
  {
    id: 'inv-005',
    category: 'Medicine',
    itemName: 'Antibiotics',
    brand: 'HealthFirst',
    batchNumber: 'HF-2024-023',
    specification: 'Amoxicillin 250mg',
    quantity: 300,
    unit: 'boxes',
    colocation: {
      facility: 'Kumasi Distribution Hub',
      subLocation: 'Medical Storage, Rack 1',
    },
    donorInfo: {
      name: 'MedSupply Ghana',
      supplierId: 'supp-002',
    },
    status: 'Available',
    dateReceived: '2024-01-20',
    expiryDate: '2024-05-15',
    marketPrice: getMarketPrice('Antibiotics', 'Amoxicillin 250mg', 'HealthFirst') || getDefaultMarketPrice('Medicine', 'Amoxicillin 250mg'),
    priceStatus: 'Pending Review',
    value: undefined,
  },
  {
    id: 'inv-006',
    category: 'Food',
    itemName: 'Cooking Oil',
    brand: 'Golden Harvest',
    batchNumber: 'GH-2024-005',
    specification: '5L Bottle',
    quantity: 80,
    unit: 'bottles',
    colocation: {
      facility: 'Takoradi Port Warehouse',
      subLocation: 'Aisle 2, Shelf C',
    },
    donorInfo: {
      name: 'Ghana Food Distributors Ltd',
      supplierId: 'supp-001',
    },
    status: 'Available',
    dateReceived: '2024-02-10',
    expiryDate: '2025-10-20',
    marketPrice: getMarketPrice('Cooking Oil', '5L Bottle', 'Golden Harvest') || getDefaultMarketPrice('Food', '5L Bottle'),
    priceStatus: 'Pending Review',
    value: undefined,
  },
];

// ## Warehouse Model Class
// ## Handles all warehouse and inventory data operations and business logic
export class WarehouseModel {
  // ## Get all warehouses
  static getAllWarehouses(): Warehouse[] {
    return mockWarehouses;
  }

  // ## Get warehouse by ID
  static getWarehouseById(id: string): Warehouse | undefined {
    return mockWarehouses.find(wh => wh.id === id);
  }

  // ## Get warehouses by region
  static getWarehousesByRegion(region: string): Warehouse[] {
    return mockWarehouses.filter(wh => wh.region === region);
  }

  // ## Get all inventory items
  // ## Automatically sets expired items to "Unavailable" status
  static getAllInventory(): InventoryItem[] {
    const today = new Date();
    return mockInventory.map(item => {
      // ## Check if item has expired
      if (item.expiryDate) {
        const expiryDate = new Date(item.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // ## If expired, set status to Unavailable (unless already Reserved or Disbursed)
        if (daysUntilExpiry < 0 && item.status === 'Available') {
          return {
            ...item,
            status: 'Unavailable' as const,
          };
        }
      }
      return item;
    });
  }

  // ## Get inventory by ID
  static getInventoryById(id: string): InventoryItem | undefined {
    return mockInventory.find(item => item.id === id);
  }

  // ## Get inventory by warehouse
  static getInventoryByWarehouse(warehouseName: string): InventoryItem[] {
    return mockInventory.filter(item => item.colocation.facility === warehouseName);
  }

  // ## Get locked inventory items only
  static getLockedInventory(): InventoryItem[] {
    return mockInventory.filter(item => item.priceStatus === 'Locked' && item.value);
  }

  // ## Calculate total stockpile value from locked items only
  static calculateTotalStockpileValue(): number {
    return mockInventory
      .filter(item => item.priceStatus === 'Locked' && item.value)
      .reduce((sum, item) => sum + ((item.value || 0) * item.quantity), 0);
  }

  // ## Calculate warehouse capacity statistics
  static calculateWarehouseStats(): {
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    const totalCapacity = mockWarehouses.reduce((sum, wh) => sum + wh.capacity, 0);
    const usedCapacity = mockWarehouses.reduce((sum, wh) => sum + (wh.currentOccupancy || 0), 0);
    const availableCapacity = totalCapacity - usedCapacity;
    const utilizationPercent = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

    return {
      totalCapacity,
      usedCapacity,
      availableCapacity,
      utilizationPercent,
    };
  }

  // ## Get inventory items by status
  static getInventoryByStatus(status: string): InventoryItem[] {
    return mockInventory.filter(item => item.status === status);
  }

  // ## Get inventory items by price status
  static getInventoryByPriceStatus(priceStatus: string): InventoryItem[] {
    return mockInventory.filter(item => item.priceStatus === priceStatus);
  }

  // ## Get low stock items (quantity < threshold)
  static getLowStockItems(threshold: number = 50): InventoryItem[] {
    return mockInventory.filter(item => item.quantity < threshold);
  }

  // ## Get near expiry items (within days)
  static getNearExpiryItems(days: number = 90): InventoryItem[] {
    const today = new Date();
    const thresholdDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    return mockInventory.filter(item => {
      if (!item.expiryDate) return false;
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= thresholdDate && expiryDate >= today;
    });
  }
}

// ## Export data for backward compatibility
// ## These exports provide direct access to the data arrays
export { mockWarehouses, mockInventory };
