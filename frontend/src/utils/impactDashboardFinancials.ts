import type { Financial, Allocation, Donation } from '../types/backend';
import type { FinancialStatisticsResponse } from '../services/api/financial';
import { financialApi } from '../services/api/financial';
import { allocationApi, donationApi } from '../services/api';

export type ImpactFinancialLoadResult = {
  financials: Financial[];
  statistics: FinancialStatisticsResponse | null;
  allocations: Allocation[];
  donations: Donation[];
};

/**
 * Ledger rows + `/financials/statistics` for cash KPIs; **allocations** for goods value (allocated qty × prices).
 * No client-side fallback that sums raw ledger rows into total_value (that inflated dashboards).
 */
export async function loadImpactFinancialData(period: 'day' | 'week' | 'month' | 'year'): Promise<ImpactFinancialLoadResult> {
  let financialsData: Financial[] = [];
  try {
    financialsData = await financialApi.getAll();
  } catch {
    financialsData = [];
  }

  let allocationsData: Allocation[] = [];
  try {
    allocationsData = await allocationApi.getAll();
  } catch {
    allocationsData = [];
  }

  let donationsData: Donation[] = [];
  try {
    donationsData = await donationApi.getAll();
  } catch {
    donationsData = [];
  }

  let statsData: FinancialStatisticsResponse | null = null;
  try {
    statsData = await financialApi.getStatistics({ period });
  } catch {
    statsData = null;
  }

  if (!statsData) {
    statsData = {
      total_donations: 0,
      total_allocations: 0,
      total_expenses: 0,
      total_value: 0,
      series: [],
    };
  }

  return {
    financials: Array.isArray(financialsData) ? financialsData : [],
    statistics: statsData,
    allocations: Array.isArray(allocationsData) ? allocationsData : [],
    donations: Array.isArray(donationsData) ? donationsData : [],
  };
}
