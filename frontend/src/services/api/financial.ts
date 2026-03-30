import type { Financial } from '../../types/backend';
import { apiClient } from './client';

export interface FinancialSeriesPoint {
  label: string;
  date_key: string;
  Donation: number;
  Allocation: number;
  Expense: number;
}

export interface FinancialStatisticsResponse {
  total_donations: number;
  total_allocations: number;
  total_expenses: number;
  total_value: number;
  period?: string;
  range?: { start: string; end: string };
  series?: FinancialSeriesPoint[];
}

export const financialApi = {
  getAll: async (params?: { transaction_type?: string; status?: string; user_id?: number }): Promise<Financial[]> => {
    const response = await apiClient.get<{ data?: Financial[] } | Financial[]>('/financials', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<Financial> => {
    const response = await apiClient.get<Financial>(`/financials/${id}`);
    return response.data;
  },

  create: async (data: Partial<Financial>): Promise<Financial> => {
    const response = await apiClient.post<Financial>('/financials', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Financial>): Promise<Financial> => {
    const response = await apiClient.put<Financial>(`/financials/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/financials/${id}`);
  },

  getStatistics: async (params?: { period?: 'day' | 'week' | 'month' | 'year' }): Promise<FinancialStatisticsResponse> => {
    const response = await apiClient.get<FinancialStatisticsResponse>('/financials/statistics', { params });
    return response.data;
  },
};
