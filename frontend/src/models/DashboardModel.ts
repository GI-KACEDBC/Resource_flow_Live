// ## Dashboard Model
// ## Single Source of Truth for dashboard data and business logic
import { WarehouseModel } from './WarehouseModel';
import { RegionalRequestModel } from './RegionalRequestModel';

// ## Dashboard statistics interface
export interface DashboardStats {
  totalDonations: number;
  totalRecipients: number;
  activeDeliveries: number;
  pendingUsers: number;
  totalStockpileValue: number;
  netBalance: number;
  warehouseStats: {
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    utilizationPercent: number;
  };
}

// ## Dashboard Model Class
// ## Handles all dashboard data aggregation and business logic
export class DashboardModel {
  // ## Get complete dashboard statistics
  static getDashboardStats(): DashboardStats {
    const totalStockpileValue = WarehouseModel.calculateTotalStockpileValue();
    const warehouseStats = WarehouseModel.calculateWarehouseStats();

    return {
      totalDonations: 142500, // ## This would come from donations data source
      totalRecipients: 1240, // ## This would come from recipients data source
      activeDeliveries: 18, // ## This would come from logistics data source
      pendingUsers: 5, // ## This would come from user verification data source
      totalStockpileValue,
      netBalance: totalStockpileValue,
      warehouseStats,
    };
  }

  // ## Get impact growth data (verified users over time)
  static getImpactGrowthData() {
    return [
      { month: 'Jan', suppliers: 45, recipients: 120 },
      { month: 'Feb', suppliers: 52, recipients: 145 },
      { month: 'Mar', suppliers: 61, recipients: 168 },
      { month: 'Apr', suppliers: 68, recipients: 192 },
      { month: 'May', suppliers: 75, recipients: 215 },
      { month: 'Jun', suppliers: 82, recipients: 240 },
    ];
  }

  // ## Get resource value data by category
  static getResourceValueData() {
    // ## Calculate from locked inventory by category
    const lockedInventory = WarehouseModel.getLockedInventory();
    const categoryMap = new Map<string, number>();

    lockedInventory.forEach(item => {
      const current = categoryMap.get(item.category) || 0;
      const value = (item.value || 0) * item.quantity;
      categoryMap.set(item.category, current + value);
    });

    return Array.from(categoryMap.entries()).map(([category, value]) => ({
      category,
      value,
    }));
  }

  // ## Get scheduled deliveries for current month
  static getScheduledDeliveries() {
    return [
      { date: '2024-02-20', region: 'Greater Accra', items: 5, status: 'Scheduled' },
      { date: '2024-02-22', region: 'Ashanti', items: 8, status: 'Scheduled' },
      { date: '2024-02-25', region: 'Northern', items: 12, status: 'Scheduled' },
      { date: '2024-02-28', region: 'Volta', items: 6, status: 'Scheduled' },
    ];
  }

  // ## Get recent audit logs
  static getRecentAuditLogs() {
    return [
      { item: 'Rice - 50kg', action: 'Price Locked', date: '2 hours ago' },
      { item: 'Paracetamol', action: 'Price Confirmed', date: '5 hours ago' },
      { item: 'Solar Panel', action: 'Price Overridden', date: '1 day ago' },
    ];
  }
}
