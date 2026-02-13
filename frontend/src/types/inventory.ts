// ## Inventory Type Definitions
// ## Defines data structures for warehouse and inventory management

// ## Warehouse operational status
export type WarehouseStatus = 'Active' | 'Full' | 'Maintenance';
// ## Inventory item categories
export type InventoryCategory = 'Food' | 'Medicine' | 'Equipment' | 'Other';
// ## Inventory item availability status
export type InventoryStatus = 'Available' | 'Reserved' | 'Disbursed' | 'Unavailable';
// ## Price verification status for financial reporting
export type PriceStatus = 'Estimated' | 'Pending Review' | 'Locked';

// ## Warehouse data structure
export interface Warehouse {
  id: string;
  name: string;
  city: string;
  region: string;
  address?: string; // ## Full address or Ghana Post GPS code
  capacity: number; // ## Storage capacity in m², units, or pallets
  capacityUnit: 'm²' | 'Units' | 'Pallets';
  manager: string; // ## Facility manager name
  contact: string; // ## Contact phone/email
  contactPhone?: string;
  contactEmail?: string;
  status: WarehouseStatus;
  currentOccupancy?: number; // ## Current usage level
  createdAt: string;
  updatedAt: string;
}

// ## Inventory Item data structure
// ## Tracks physical donations with full traceability
export interface InventoryItem {
  id: string; // ## Unique Tracking ID
  category: InventoryCategory;
  itemName: string;
  brand: string;
  batchNumber?: string; // ## Batch number for quality control
  specification: string; // ## Item specification (e.g., "25kg Bag", "500mg")
  quantity: number;
  unit: string; // ## Unit of measurement (e.g., "bags", "boxes", "units")
  // ## Physical storage location
  colocation: {
    facility: string; // ## Warehouse name (e.g., "Kumasi Hub")
    subLocation: string; // ## Specific location (e.g., "Aisle 4, Shelf B")
  };
  // ## Donor traceability information
  donorInfo: {
    name: string; // ## Original supplier name
    supplierId: string;
  };
  status: InventoryStatus;
  dateReceived: string;
  expiryDate?: string; // ## Expiration date for perishable items
  value?: number; // ## Locked monetary value in GH₵ (for financial reporting)
  marketPrice?: number; // ## Auto-generated suggested price from market data
  priceStatus: PriceStatus; // ## Price verification status
  auditedPrice?: number; // ## Final price set by auditor
  auditorNotes?: string; // ## Notes from auditor
  lockedAt?: string; // ## Date when price was locked
  lockedBy?: string; // ## Auditor who locked the price
  notes?: string;
}

export interface StockHealth {
  totalItems: number;
  totalValue: number;
  lowStockAlerts: number;
  nearExpiryItems: number;
  availableItems: number;
  reservedItems: number;
  disbursedItems: number;
  unavailableItems: number;
}
