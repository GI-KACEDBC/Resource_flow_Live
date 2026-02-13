// ## Dashboard Controller
// ## Handles user interactions and coordinates between Model and View
import { DashboardModel } from '../models/DashboardModel';
import { WarehouseModel } from '../models/WarehouseModel';
import { RegionalRequestModel } from '../models/RegionalRequestModel';

// ## Dashboard Controller Class
// ## Manages dashboard data flow and user interactions
export class DashboardController {
  // ## Get dashboard statistics for display
  static getDashboardStats() {
    return DashboardModel.getDashboardStats();
  }

  // ## Get impact growth chart data
  static getImpactGrowthData() {
    return DashboardModel.getImpactGrowthData();
  }

  // ## Get resource value chart data
  static getResourceValueData() {
    return DashboardModel.getResourceValueData();
  }

  // ## Get scheduled deliveries
  static getScheduledDeliveries() {
    return DashboardModel.getScheduledDeliveries();
  }

  // ## Get recent audit logs
  static getRecentAuditLogs() {
    return DashboardModel.getRecentAuditLogs();
  }

  // ## Get warehouse capacity statistics
  static getWarehouseStats() {
    return WarehouseModel.calculateWarehouseStats();
  }

  // ## Get total stockpile value
  static getTotalStockpileValue() {
    return WarehouseModel.calculateTotalStockpileValue();
  }

  // ## Get regional request statistics
  static getRegionalRequestStats() {
    return RegionalRequestModel.calculateRegionStats();
  }

  // ## Handle refresh dashboard action
  static handleRefreshDashboard() {
    // ## In a real app, this would trigger a data refresh
    // ## For now, we just return the current data
    return this.getDashboardStats();
  }
}
