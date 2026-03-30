import { useState, useCallback } from 'react';
import type { AuditTrail, Allocation, Donation } from '../types/backend';
import {
  deliveryRouteApi,
  userApi,
  warehouseApi,
  auditTrailApi,
  allocationApi,
  donationApi,
} from '../services/api';
import {
  deriveCategoryFromItemName,
  computeWarehouseUtilization,
  buildRecentAuditLogRows,
  computeDonationsReceivedGhs,
} from '../utils/adminDashboardAggregates';
import { financialApi } from '../services/api/financial';
import {
  isActiveAllocationForCashValue,
  allocationCashEquivalentValue,
  allocationLineForReport,
  buildImpactGrowthSeriesFromAllocations,
} from '../utils/allocatedFinancials';

export type AdminDashboardMetricsState = {
  stats: {
    totalDonations: number;
    totalReceivedDonationsGhs: number;
    totalRecipients: number;
    activeDeliveries: number;
    pendingUsers: number;
  };
  impactGrowthData: Array<{ month: string; value: number }>;
  resourceValueData: Array<{ category: string; value: number }>;
  scheduledDeliveries: Array<{
    date: string;
    region: string;
    status: string;
    items: number;
  }>;
  warehouseStats: {
    utilizationPercent: number;
    usedCapacity: number;
    availableCapacity: number;
  };
  totalStockpileValue: number;
  netBalanceChangePercent: number | null;
  recentAuditLogs: Array<{ item: string; action: string; date: string }>;
};

const initialState: AdminDashboardMetricsState = {
  stats: {
    totalDonations: 0,
    totalReceivedDonationsGhs: 0,
    totalRecipients: 0,
    activeDeliveries: 0,
    pendingUsers: 0,
  },
  impactGrowthData: [],
  resourceValueData: [],
  scheduledDeliveries: [],
  warehouseStats: {
    utilizationPercent: 0,
    usedCapacity: 0,
    availableCapacity: 0,
  },
  totalStockpileValue: 0,
  netBalanceChangePercent: null,
  recentAuditLogs: [],
};

/**
 * Admin KPIs use **allocated value in GHS**: goods/services (qty × unit price) plus Monetary allocations (GHS).
 */
export function useAdminDashboardMetrics() {
  const [data, setData] = useState<AdminDashboardMetricsState>(initialState);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [deliveryRoutes, users, warehouses, audits, allocationsRaw, donationsRaw, financialsRaw] =
        await Promise.all([
          deliveryRouteApi.getAll().catch(() => []),
          userApi.getAll().catch(() => []),
          warehouseApi.getAll().catch(() => []),
          auditTrailApi.getAll().catch(() => []),
          allocationApi.getAll().catch(() => []),
          donationApi.getAll().catch(() => []),
          financialApi.getAll().catch(() => []),
        ]);

      const userList = Array.isArray(users) ? users : [];
      const routeList = Array.isArray(deliveryRoutes) ? deliveryRoutes : [];
      const whList = Array.isArray(warehouses) ? warehouses : [];
      const allocations: Allocation[] = Array.isArray(allocationsRaw) ? allocationsRaw : [];
      const donations: Donation[] = Array.isArray(donationsRaw) ? donationsRaw : [];
      const financials = Array.isArray(financialsRaw) ? financialsRaw : [];
      const totalReceivedDonationsGhs = computeDonationsReceivedGhs(donations, financials);
      const activeAlloc = allocations.filter(isActiveAllocationForCashValue);

      const totalRecipients = userList.filter(
        (u) => u.role === 'requestor' || u.role === 'recipient'
      ).length;
      const activeDeliveries = routeList.filter(
        (d) => d.status === 'in_transit' || d.status === 'In Transit'
      ).length;
      const pendingUsers = userList.filter(
        (u) => !u.is_verified && u.verification_status === 'pending'
      ).length;

      const totalAllocatedGoodsValue = activeAlloc.reduce((sum, a) => sum + allocationCashEquivalentValue(a), 0);

      const impactGrowthData = buildImpactGrowthSeriesFromAllocations(allocations, 6);

      const catTotals: Record<string, number> = {
        Food: 0,
        Medical: 0,
        Education: 0,
        Equipment: 0,
        Other: 0,
      };
      activeAlloc.forEach((a) => {
        const cat = deriveCategoryFromItemName(a.donation?.item);
        catTotals[cat] = (catTotals[cat] || 0) + allocationCashEquivalentValue(a);
      });
      const resourceValueData = Object.entries(catTotals).map(([category, value]) => ({
        category,
        value: Math.round(value),
      }));

      const scheduled = routeList
        .filter((d) => d.status === 'scheduled' || d.status === 'Scheduled')
        .slice(0, 5)
        .map((d) => ({
          date: new Date((d as { scheduled_date?: string }).scheduled_date || d.created_at).toLocaleDateString(),
          region: (d as { destination_region?: string }).destination_region || 'Unknown',
          status: String(d.status),
          items: Number((d as { items_count?: number }).items_count) || 0,
        }));

      const warehouseStats = computeWarehouseUtilization(whList);

      const totalStockpileValue = activeAlloc.reduce((sum, a) => sum + allocationLineForReport(a).locked, 0);

      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const prevLocked = activeAlloc.reduce((sum, a) => {
        const createdAt = new Date(a.allocated_date || a.created_at);
        if (createdAt >= prevMonthStart && createdAt <= prevMonthEnd) {
          return sum + allocationLineForReport(a).locked;
        }
        return sum;
      }, 0);
      const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currLocked = activeAlloc.reduce((sum, a) => {
        const createdAt = new Date(a.allocated_date || a.created_at);
        if (createdAt >= currMonthStart) {
          return sum + allocationLineForReport(a).locked;
        }
        return sum;
      }, 0);
      let netBalanceChangePercent: number | null = null;
      if (prevLocked > 0) {
        netBalanceChangePercent = Math.round(((currLocked - prevLocked) / prevLocked) * 1000) / 10;
      }

      const auditList = Array.isArray(audits) ? audits : [];
      const recentAuditLogs = buildRecentAuditLogRows(auditList as AuditTrail[], 5);

      setData({
        stats: {
          totalDonations: totalAllocatedGoodsValue,
          totalReceivedDonationsGhs,
          totalRecipients,
          activeDeliveries,
          pendingUsers,
        },
        impactGrowthData,
        resourceValueData,
        scheduledDeliveries: scheduled,
        warehouseStats,
        totalStockpileValue,
        netBalanceChangePercent,
        recentAuditLogs,
      });
    } catch {
      setData(initialState);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetchDashboardData };
}
