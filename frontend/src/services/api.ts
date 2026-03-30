import { apiClient } from './api/client';
export { fetchSanctumCsrfCookie } from './api/client';
export { authApi } from './api/auth';
export { financialApi } from './api/financial';
export type { FinancialStatisticsResponse, FinancialSeriesPoint } from './api/financial';
import {
  Warehouse,
  Donation,
  VulnerabilityScore,
  Allocation,
  DeliveryRoute,
  Logistic,
  VerificationDocument,
  AuditTrail,
  PrioritizedRequest,
  LocationUpdate,
} from '../types/backend';

export interface Contribution {
  id: number;
  request_id: number;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
    email: string;
  };
  percentage: number;
  amount_value?: number;
  status: 'pending' | 'committed';
  created_at: string;
  updated_at: string;
}

export interface ContributionData {
  request_id: number;
  percentage: number;
  amount_value?: number;
}

export interface ContributionStats {
  request_id: number;
  total_percentage: number;
  remaining_percentage: number;
  contribution_count: number;
  funding_status: string;
  contributions: Contribution[];
}

export interface RequestData {
  title: string;
  description?: string;
  need_type: string;
  time_sensitivity: string;
  recipient_type: string;
  region?: string;
  quantity_required?: number;
  unit?: string;
  availability_gap: number;
  admin_override?: number;
}

export interface RequestResponse {
  id: number;
  title: string;
  description?: string;
  aid_type: 'Education' | 'Health' | 'Infrastructure' | 'Other';
  custom_aid_type?: string;
  status: 'pending' | 'approved' | 'claimed' | 'recede_requested' | 'completed';
  funding_status?: 'unfunded' | 'partially_funded' | 'fully_funded';
  total_funded_percentage?: number;
  remaining_percentage?: number;
  assigned_supplier_id?: number;
  contributions?: Contribution[];
  supporting_documents?: string[];
  need_type: string;
  time_sensitivity: string;
  recipient_type: string;
  availability_gap: number;
  admin_override: number;
  urgency_score: number;
  urgency_level: string;
  urgency_calculation_log?: {
    raw_scores: Record<string, number>;
    weighted_scores: Record<string, number>;
    weights: Record<string, number>;
    response_time: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    organization?: string;
  };
  assigned_supplier?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MapRegionData {
  region: string;
  total_requested_quantity: number;
  total_allocated_quantity: number;
  net_need: number;
  total_requests: number;
  critical_requests: number;
  high_urgency_requests: number;
  medium_urgency_requests: number;
  low_urgency_requests: number;
  urgency_weighted_heat: number;
  urgency_score: number;
  requests: Array<{
    id: number;
    title: string;
    aid_type: string;
    urgency_level: string;
    urgency_score: number;
    quantity_required: number;
    unit: string;
    quantity_allocated: number;
    net_need: number;
    estimated_value?: number;
    recipient?: string;
    recipient_organization?: string;
  }>;
}

export interface MapDataResponse {
  regions: MapRegionData[];
  meta: {
    include_pii: boolean;
    user_role: string;
  };
}

/** Download or view files by storage path (e.g. requests/uuid.ext) */
export const filesApi = {
  getDownloadUrl: (path: string): string => {
    const base = apiClient.defaults.baseURL?.replace(/\/api\/?$/, '') || '';
    return `${base}/api/files/download?path=${encodeURIComponent(path)}`;
  },
  /** Fetch file with auth and trigger download, or open in new tab for viewable types */
  downloadOrView: async (path: string, openInNewTab = false): Promise<void> => {
    const url = filesApi.getDownloadUrl(path);
    const res = await fetch(url, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(res.status === 404 ? 'File not found' : 'Download failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const ext = (path.split('.').pop() || '').toLowerCase();
    const viewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (openInNewTab && viewable.includes(ext)) {
      window.open(blobUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = path.split('/').pop() || 'document';
      a.click();
      URL.revokeObjectURL(blobUrl);
    }
  },
};

export const requestApi = {
  uploadFile: async (formData: FormData): Promise<{
    success: boolean;
    path?: string;
    url?: string;
    filename?: string;
    message?: string;
  }> => {
    try {
      const response = await apiClient.post('/files/upload', formData, {
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (!response || !response.data) {
        throw new Error('No response received from server');
      }

      return response.data;
    } catch (error: any) {
      // Network errors (no response)
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to server. Please ensure the backend is running on http://localhost:8000');
      }
      
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new Error('Upload timeout. The file may be too large or the server is slow to respond.');
      }
      
      // If backend returned an error response, use its message
      if (error.response?.data) {
        if (error.response.data.message) {
          throw new Error(error.response.data.message);
        }
        if (error.response.data.errors) {
          const errorMessages = Object.values(error.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        // If we have a response but no message, return the response
        return error.response.data;
      }
      
      // Network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('File upload failed. Please check your connection and try again.');
    }
  },

  getAll: async (): Promise<RequestResponse[]> => {
    const response = await apiClient.get<RequestResponse[]>('/requests');
    return response.data;
  },

  getById: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.get<RequestResponse>(`/requests/${id}`);
    return response.data;
  },

  create: async (data: RequestData): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>('/requests', data);
    return response.data;
  },

  getAvailable: async (): Promise<RequestResponse[]> => {
    // Use /supplier/available-requests to avoid route conflict with apiResource /requests/{id}
    const response = await apiClient.get<RequestResponse[]>('/supplier/available-requests');
    return Array.isArray(response.data) ? response.data : [];
  },

  getMapData: async (): Promise<MapDataResponse> => {
    const response = await apiClient.get<MapDataResponse>('/requests/map-data');
    return response.data;
  },

  getFlagged: async (): Promise<RequestResponse[]> => {
    const response = await apiClient.get<RequestResponse[]>('/requests/flagged');
    return response.data;
  },

  batchUpdateStatus: async (requestIds: number[], action: 'closed_no_match' | 'boosted_urgency'): Promise<{ message: string; updated_count: number; action: string }> => {
    const response = await apiClient.post<{ message: string; updated_count: number; action: string }>('/requests/batch-update-status', {
      request_ids: requestIds,
      action,
    });
    return response.data;
  },

  approve: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>(`/requests/${id}/approve`);
    return response.data;
  },

  audit: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>(`/requests/${id}/audit`);
    return response.data;
  },

  claim: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>(`/requests/${id}/claim`);
    return response.data;
  },

  requestRecede: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>(`/requests/${id}/recede`);
    return response.data;
  },

  approveRecede: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>(`/requests/${id}/approve-recede`);
    return response.data;
  },

  complete: async (id: number): Promise<RequestResponse> => {
    const response = await apiClient.post<RequestResponse>(`/requests/${id}/complete`);
    return response.data;
  },

  update: async (id: number, data: Partial<RequestData>): Promise<RequestResponse> => {
    const response = await apiClient.put<RequestResponse>(`/requests/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/requests/${id}`);
  },
};

export const urgencyApi = {
  calculate: async (factors: {
    need_type: string;
    time_sensitivity: string;
    recipient_type: string;
    availability_gap: number;
    admin_override?: number;
  }) => {
    const response = await apiClient.post('/urgency/calculate', factors);
    return response.data;
  },

  getFactors: async () => {
    const response = await apiClient.get('/urgency/factors');
    return response.data;
  },

  getScenarios: async () => {
    const response = await apiClient.get('/urgency/scenarios');
    return response.data;
  },
};

// Vulnerability Scores API
export const vulnerabilityScoreApi = {
  getAll: async (): Promise<VulnerabilityScore[]> => {
    const response = await apiClient.get<VulnerabilityScore[]>('/vulnerability-scores');
    return response.data;
  },

  getById: async (id: number): Promise<VulnerabilityScore> => {
    const response = await apiClient.get<VulnerabilityScore>(`/vulnerability-scores/${id}`);
    return response.data;
  },

  getByUser: async (userId: number): Promise<VulnerabilityScore> => {
    const response = await apiClient.get<VulnerabilityScore>(`/vulnerability-scores/user/${userId}`);
    return response.data;
  },

  getPriorityList: async (): Promise<VulnerabilityScore[]> => {
    const response = await apiClient.get<VulnerabilityScore[]>('/vulnerability-scores/priority-list');
    return response.data;
  },

  create: async (data: Partial<VulnerabilityScore>): Promise<VulnerabilityScore> => {
    const response = await apiClient.post<VulnerabilityScore>('/vulnerability-scores', data);
    return response.data;
  },

  update: async (id: number, data: Partial<VulnerabilityScore>): Promise<VulnerabilityScore> => {
    const response = await apiClient.put<VulnerabilityScore>(`/vulnerability-scores/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/vulnerability-scores/${id}`);
  },
};

// Allocations API
export const allocationApi = {
  getAll: async (params?: { status?: string; request_id?: number }): Promise<Allocation[]> => {
    const response = await apiClient.get<{ data?: Allocation[] } | Allocation[]>('/allocations', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<Allocation> => {
    const response = await apiClient.get<Allocation>(`/allocations/${id}`);
    return response.data;
  },

  getPrioritizedRequests: async (): Promise<PrioritizedRequest[]> => {
    const response = await apiClient.get<PrioritizedRequest[]>('/allocations/prioritized-requests');
    return response.data;
  },

  create: async (data: Partial<Allocation>): Promise<Allocation> => {
    const response = await apiClient.post<Allocation>('/allocations', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Allocation>): Promise<Allocation> => {
    const response = await apiClient.put<Allocation>(`/allocations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/allocations/${id}`);
  },
};

// Delivery Routes API
export const deliveryRouteApi = {
  getAll: async (params?: { status?: string; warehouse_id?: number }): Promise<DeliveryRoute[]> => {
    const response = await apiClient.get<{ data?: DeliveryRoute[] } | DeliveryRoute[]>('/delivery-routes', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<DeliveryRoute> => {
    const response = await apiClient.get<DeliveryRoute>(`/delivery-routes/${id}`);
    return response.data;
  },

  create: async (data: Partial<DeliveryRoute>): Promise<DeliveryRoute> => {
    const response = await apiClient.post<DeliveryRoute>('/delivery-routes', data);
    return response.data;
  },

  update: async (id: number, data: Partial<DeliveryRoute>): Promise<DeliveryRoute> => {
    const response = await apiClient.put<DeliveryRoute>(`/delivery-routes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/delivery-routes/${id}`);
  },
};

// Logistics API
export const logisticApi = {
  getAll: async (params?: { status?: string; tracking_number?: string }): Promise<Logistic[]> => {
    const response = await apiClient.get<{ data?: Logistic[] } | Logistic[]>('/logistics', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<Logistic> => {
    const response = await apiClient.get<Logistic>(`/logistics/${id}`);
    return response.data;
  },

  track: async (trackingNumber: string): Promise<Logistic> => {
    const response = await apiClient.get<Logistic>(`/logistics/track/${trackingNumber}`);
    return response.data;
  },

  updateLocation: async (id: number, location: LocationUpdate): Promise<Logistic> => {
    const response = await apiClient.post<Logistic>(`/logistics/${id}/update-location`, location);
    return response.data;
  },

  create: async (data: Partial<Logistic>): Promise<Logistic> => {
    const response = await apiClient.post<Logistic>('/logistics', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Logistic>): Promise<Logistic> => {
    const response = await apiClient.put<Logistic>(`/logistics/${id}`, data);
    return response.data;
  },

  completeDelivery: async (id: number): Promise<Logistic> => {
    const response = await apiClient.post<Logistic>(`/logistics/${id}/complete-delivery`);
    return response.data;
  },
};

// Ghana Card Verification API (QoreID)
export const ghanaCardApi = {
  verify: async (params: {
    id_number: string;
    firstname: string;
    lastname: string;
    consent_given?: boolean;
  }): Promise<{
    verified: boolean;
    name_mismatch?: boolean;
    error?: string;
    error_code?: string;
    photo?: string;
    request_id?: string;
    nia_first_name?: string;
    nia_last_name?: string;
  }> => {
    const response = await apiClient.post('/verify-ghana-card', params);
    return response.data;
  },

  /** Verify with Ghana Card image + selfie (capture flow). Accepts base64 or FormData. */
  verifyWithImages: async (params: {
    ghana_card_base64?: string;
    ghana_card_image?: File;
    user_photo_base64?: string;
    user_photo?: File;
    firstname: string;
    lastname: string;
    consent_given?: boolean;
  }): Promise<{
    verified: boolean;
    error?: string;
    error_code?: string;
    request_id?: string;
    national_id?: string;
  }> => {
    const hasFiles = !!(params.ghana_card_image || params.user_photo);
    if (hasFiles) {
      const formData = new FormData();
      if (params.ghana_card_image) formData.append('ghana_card_image', params.ghana_card_image);
      else if (params.ghana_card_base64) formData.append('ghana_card_base64', params.ghana_card_base64);
      if (params.user_photo) formData.append('user_photo', params.user_photo);
      else if (params.user_photo_base64) formData.append('user_photo_base64', params.user_photo_base64);
      formData.append('firstname', params.firstname);
      formData.append('lastname', params.lastname);
      formData.append('consent_given', String(!!params.consent_given));
      const response = await apiClient.post('/verify-ghana-card-with-images', formData);
      return response.data;
    }
    const response = await apiClient.post('/verify-ghana-card-with-images', {
      ghana_card_base64: params.ghana_card_base64,
      user_photo_base64: params.user_photo_base64,
      firstname: params.firstname,
      lastname: params.lastname,
      consent_given: !!params.consent_given,
    });
    return response.data;
  },

  /** Store QoreID SDK result (requires auth). Call after SDK completes. */
  storeQoreIdResult: async (params: {
    customer_reference: string;
    workflow_id?: string;
    status: 'verified' | 'pending' | 'failed';
    national_id?: string;
    firstname?: string;
    lastname?: string;
  }): Promise<{ verified: boolean; document_id: number; message: string }> => {
    const response = await apiClient.post('/verify-ghana-card-qoreid-result', params);
    return response.data;
  },
};

// Verification Documents API
export const verificationDocumentApi = {
  getAll: async (params?: { user_id?: number; verification_status?: string }): Promise<VerificationDocument[]> => {
    const response = await apiClient.get<{ data?: VerificationDocument[] } | VerificationDocument[]>('/verification-documents', { params });
    const raw = response.data;
    // Handle Laravel ResourceCollection: { data: [...] }, direct array [...], or nested
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  },

  getById: async (id: number): Promise<VerificationDocument> => {
    const response = await apiClient.get<VerificationDocument>(`/verification-documents/${id}`);
    return response.data;
  },

  upload: async (
    file: File,
    documentType: string,
    documentNumber?: string,
    options?: { firstname?: string; lastname?: string; consent_given?: boolean }
  ): Promise<VerificationDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (documentNumber) {
      formData.append('document_number', documentNumber);
    }
    if (options?.firstname) formData.append('firstname', options.firstname);
    if (options?.lastname) formData.append('lastname', options.lastname);
    if (options?.consent_given !== undefined) {
      formData.append('consent_given', options.consent_given ? '1' : '0');
    }
    const response = await apiClient.post<VerificationDocument>('/verification-documents', formData);
    return response.data;
  },

  /** Submit Ghana Card + selfie for admin review (no QoreID). Admin can authorize and optionally run QoreID later. */
  uploadForAdminReview: async (
    ghanaCardFile: File,
    selfieFile: File,
    documentNumber: string,
    options: { firstname: string; lastname: string; consent_given: boolean }
  ): Promise<VerificationDocument> => {
    const formData = new FormData();
    formData.append('ghana_card_image', ghanaCardFile);
    formData.append('selfie_image', selfieFile);
    formData.append('document_number', documentNumber.trim());
    formData.append('firstname', options.firstname);
    formData.append('lastname', options.lastname);
    formData.append('consent_given', options.consent_given ? '1' : '0');
    const response = await apiClient.post<VerificationDocument>('/verification-documents/admin-review', formData);
    return response.data;
  },

  verifyViaQoreid: async (id: number): Promise<{ verified: boolean; message?: string; document?: VerificationDocument }> => {
    const response = await apiClient.post<{ verified: boolean; message?: string; document?: VerificationDocument }>(
      `/verification-documents/${id}/verify-via-qoreid`
    );
    return response.data;
  },

  verify: async (id: number, data: { verification_status: string; rejection_reason?: string; notes?: string }): Promise<VerificationDocument> => {
    const response = await apiClient.post<VerificationDocument>(`/verification-documents/${id}/verify`, data);
    return response.data;
  },

  download: async (id: number): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/verification-documents/${id}/download`, { responseType: 'blob' });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: Blob; status?: number } };
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        let msg = 'Failed to download document.';
        try {
          const json = JSON.parse(text);
          if (json.message) msg = json.message;
        } catch {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      throw error;
    }
  },
};

// Audit Trails API
export const auditTrailApi = {
  getAll: async (params?: { 
    user_id?: number; 
    action?: string; 
    model_type?: string; 
    model_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditTrail[]> => {
    const response = await apiClient.get<AuditTrail[]>('/audit-trails', { params });
    return response.data;
  },

  getById: async (id: number): Promise<AuditTrail> => {
    const response = await apiClient.get<AuditTrail>(`/audit-trails/${id}`);
    return response.data;
  },

  getByModel: async (modelType: string, modelId: number): Promise<AuditTrail[]> => {
    const response = await apiClient.get<AuditTrail[]>(`/audit-trails/model/${modelType}/${modelId}`);
    return response.data;
  },
};

// Warehouses API
export const warehouseApi = {
  getAll: async (): Promise<Warehouse[]> => {
    const response = await apiClient.get<{ data?: Warehouse[] } | Warehouse[]>('/warehouses');
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<Warehouse> => {
    const response = await apiClient.get<Warehouse>(`/warehouses/${id}`);
    return response.data;
  },

  create: async (data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await apiClient.post<Warehouse>('/warehouses', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await apiClient.put<Warehouse>(`/warehouses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/warehouses/${id}`);
  },
};

// Contributions API (Partial Funding)
export const contributionApi = {
  getAll: async (params?: { request_id?: number }): Promise<Contribution[]> => {
    const response = await apiClient.get<Contribution[]>('/contributions', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Contribution> => {
    const response = await apiClient.get<Contribution>(`/contributions/${id}`);
    return response.data;
  },

  create: async (data: ContributionData): Promise<Contribution> => {
    const response = await apiClient.post<Contribution>('/contributions', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ContributionData>): Promise<Contribution> => {
    const response = await apiClient.put<Contribution>(`/contributions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/contributions/${id}`);
  },

  getRequestStats: async (requestId: number): Promise<ContributionStats> => {
    const response = await apiClient.get<ContributionStats>(`/contributions/request/${requestId}/stats`);
    return response.data;
  },
};

// Donations API
export const donationApi = {
  getAll: async (params?: { status?: string; user_id?: number; warehouse_id?: number; aid_request_id?: number; receipt_confirmed?: boolean }): Promise<Donation[]> => {
    const response = await apiClient.get<{ data?: Donation[] } | Donation[]>('/donations', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<Donation> => {
    const response = await apiClient.get<Donation>(`/donations/${id}`);
    return response.data;
  },

  create: async (data: Partial<Donation>): Promise<Donation> => {
    const response = await apiClient.post<Donation>('/donations', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Donation>): Promise<Donation> => {
    const response = await apiClient.put<Donation>(`/donations/${id}`, data);
    return response.data;
  },

  lockPrice: async (id: number, data: { audited_price: number; auditor_notes?: string }): Promise<Donation> => {
    const response = await apiClient.put<Donation>(`/donations/${id}/lock-price`, data);
    return response.data;
  },

  confirmReceipt: async (id: number): Promise<Donation> => {
    const response = await apiClient.post<Donation>(`/donations/${id}/confirm-receipt`);
    return response.data;
  },

  assignWarehouse: async (id: number, data: { warehouse_id: number; colocation_facility?: string; colocation_sub_location?: string }): Promise<Donation> => {
    const response = await apiClient.put<Donation>(`/donations/${id}/assign-warehouse`, data);
    return response.data;
  },

  /** Donor: confirm Paystack reference (amount must match donation). */
  verifyPaystackPayment: async (payload: {
    reference: string;
    donation_id?: number;
    type?: 'Donation' | 'Project Funding' | 'General Support';
    /** Required when type is Project Funding (server enforces ceiling). */
    project_id?: number;
  }): Promise<{ message: string; financial?: unknown }> => {
    const response = await apiClient.post<{ message: string; financial?: unknown }>('/payments/verify', {
      reference: payload.reference,
      type: payload.type ?? 'Donation',
      donation_id: payload.donation_id,
      project_id: payload.project_id,
    });
    return response.data;
  },

  /** Admin: verify Paystack reference against a specific pending monetary donation. */
  verifyMonetaryAsAdmin: async (donationId: number, reference: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/donations/${donationId}/verify-monetary-payment`, {
      reference,
    });
    return response.data;
  },

  getCorporateTaxStats: async (): Promise<CorporateTaxStats> => {
    const response = await apiClient.get<CorporateTaxStats>('/donations/corporate-tax-stats');
    return response.data;
  },

  updateTaxProfile: async (assessableAnnualIncome: number): Promise<{ message: string; assessable_annual_income: number }> => {
    const response = await apiClient.put('/donations/tax-profile', { assessable_annual_income: assessableAnnualIncome });
    return response.data;
  },

  downloadCertificate: async (donationId: number): Promise<void> => {
    const response = await apiClient.get(`/donations/${donationId}/certificate`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donation-certificate-${donationId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export interface CorporateTaxStats {
  assessable_annual_income: number;
  max_deductible_limit: number;
  donations_ytd: number;
  remaining_deductible_cap: number;
  is_over_limit: boolean;
  tax_rate_percent: number;
}

// Trips API - Real-time driver tracking & last-mile verification
export interface Trip {
  id: number;
  driver_id: number;
  request_id: number;
  allocation_id?: number;
  delivery_route_id?: number;
  status: 'pending' | 'started' | 'arrived' | 'completed';
  current_lat?: number;
  current_lng?: number;
  started_at?: string;
  arrived_at?: string;
  completed_at?: string;
  driver?: { id: number; name: string; email: string };
  request?: { id: number; title: string; user?: { name: string } };
  allocation?: unknown;
  delivery_proof?: unknown;
}

export const tripApi = {
  getAll: async (params?: { status?: string }): Promise<Trip[]> => {
    const response = await apiClient.get<Trip[] | { data: Trip[] }>('/trips', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  getById: async (id: number): Promise<Trip> => {
    const response = await apiClient.get<Trip>(`/trips/${id}`);
    return response.data;
  },

  create: async (data: { request_id: number; allocation_id?: number; delivery_route_id?: number }): Promise<Trip> => {
    const response = await apiClient.post<Trip>('/trips', data);
    return response.data;
  },

  updateLocation: async (tripId: number, lat: number, lng: number): Promise<{ trip_id: number; lat: number; lng: number; status: string }> => {
    const response = await apiClient.put(`/trips/${tripId}/update-location`, { lat, lng });
    return response.data;
  },

  arrive: async (tripId: number): Promise<Trip> => {
    const response = await apiClient.post<Trip>(`/trips/${tripId}/arrive`);
    return response.data;
  },

  complete: async (tripId: number, data: {
    gha_card_path?: string;
    recipient_photo_path?: string;
    signature_path?: string;
    recipient_comments?: string;
    recipient_confirmed: boolean;
    recipient_ghana_card_verified?: boolean;
    recipient_ghana_card_number?: string;
  }): Promise<Trip> => {
    const response = await apiClient.post<Trip>(`/trips/${tripId}/complete`, data);
    return response.data;
  },
};

// CSR Matchmaking & Impact Tracking APIs
import { Project, CSRPartnership, MatchResult, ImpactDashboardData } from '../types/csr';

export interface NGOListItem {
  id: number;
  name: string;
  organization: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  verification_tier: string | null;
  reputation_score: number;
  completion_rate: number;
  total_projects: number;
  completed_projects: number;
  total_lives_impacted: number;
  projects: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    sdg_goals: number[];
    target_amount: number;
    funded_amount: number;
    funding_progress: number;
    impact_proofs_count: number;
  }>;
}

export const matchmakingApi = {
  getNGOs: async (params?: { region?: string; sdg?: number }): Promise<{ ngos: NGOListItem[] }> => {
    const response = await apiClient.get<{ ngos: NGOListItem[] }>('/matchmaking/ngos', { params });
    return response.data;
  },

  getMatches: async (params?: { sdg_goals?: number[]; location?: string; limit?: number }): Promise<{ matches: MatchResult[] }> => {
    const response = await apiClient.get<{ matches: MatchResult[] }>('/matchmaking/matches', { params });
    return response.data;
  },

  getProjectMatches: async (projectId: number): Promise<any> => {
    const response = await apiClient.get(`/matchmaking/project/${projectId}/matches`);
    return response.data;
  },
};

export const impactApi = {
  getDashboard: async (): Promise<ImpactDashboardData> => {
    const response = await apiClient.get<ImpactDashboardData>('/impact/dashboard');
    return response.data;
  },
};

export interface ProjectBudgetItem {
  category: 'material' | 'transportation' | 'admin' | 'labor';
  item_name: string;
  quantity: number;
  unit_cost: number;
}

export interface ProjectCreateData {
  title: string;
  description: string;
  location?: string;
  location_gps?: string;
  cover_photo_path?: string;
  need_type?: 'funding' | 'items' | 'both';
  sdg_goals?: number[];
  start_date?: string;
  end_date?: string;
  budgets: ProjectBudgetItem[];
  proof_documents?: string[];
}

export const organizationApi = {
  get: async (): Promise<{ organization: any }> => {
    const response = await apiClient.get('/organization');
    const data = response.data;
    if (data?.organization !== undefined) return data;
    if (data?.id && data?.name) return { organization: data };
    return { organization: null };
  },

  create: async (data: { name: string; registration_number?: string; tin?: string; logo_path?: string; cover_photo_path?: string; documents_path?: string[] }): Promise<any> => {
    const response = await apiClient.post('/organization', data);
    return response.data;
  },

  update: async (data: Partial<{ name: string; registration_number?: string; tin?: string; logo_path?: string; cover_photo_path?: string; documents_path?: string[] }>): Promise<any> => {
    const response = await apiClient.put('/organization', data);
    return response.data;
  },
};

export const projectApi = {
  getAll: async (params?: { status?: string; sdg_goals?: number[] }): Promise<any> => {
    const response = await apiClient.get('/projects', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: ProjectCreateData): Promise<{ project: Project; message: string }> => {
    const response = await apiClient.post<{ project: Project; message: string }>('/projects', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<{ project: Project; message: string }> => {
    const response = await apiClient.post<{ project: Project; message: string }>(`/projects/${id}/submit`);
    return response.data;
  },

  verifyFundingCeilingAdmin: async (
    id: number,
    data: { verified_ceiling_ghs: number; notes?: string }
  ): Promise<{ project: Project; message: string }> => {
    const response = await apiClient.post<{ project: Project; message: string }>(
      `/projects/${id}/verify-funding-ceiling-admin`,
      data
    );
    return response.data;
  },

  verifyFundingCeilingAuditor: async (
    id: number,
    data?: { verified_ceiling_ghs?: number; notes?: string }
  ): Promise<{ project: Project; message: string }> => {
    const response = await apiClient.post<{ project: Project; message: string }>(
      `/projects/${id}/verify-funding-ceiling-auditor`,
      data ?? {}
    );
    return response.data;
  },
};

export const csrPartnershipApi = {
  getAll: async (params?: { status?: string }): Promise<any> => {
    const response = await apiClient.get('/csr-partnerships', { params });
    return response.data;
  },

  getById: async (id: number): Promise<CSRPartnership> => {
    const response = await apiClient.get<CSRPartnership>(`/csr-partnerships/${id}`);
    return response.data;
  },

  create: async (data: Partial<CSRPartnership>): Promise<CSRPartnership> => {
    const response = await apiClient.post<CSRPartnership>('/csr-partnerships', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CSRPartnership>): Promise<CSRPartnership> => {
    const response = await apiClient.put<CSRPartnership>(`/csr-partnerships/${id}`, data);
    return response.data;
  },
};

export const ngoVerificationApi = {
  getAll: async (params?: { status?: string }): Promise<any> => {
    const response = await apiClient.get('/ngo-verification', { params });
    return response.data;
  },

  getById: async (ngoId: number): Promise<User> => {
    const response = await apiClient.get<User>(`/ngo-verification/${ngoId}`);
    return response.data;
  },

  verify: async (ngoId: number, data: { status: 'verified' | 'flagged'; notes?: string }): Promise<User> => {
    const response = await apiClient.post<User>(`/ngo-verification/${ngoId}/verify`, data);
    return response.data;
  },
};

// Impact Proof API (Field Agent)
export interface ImpactProof {
  id: number;
  project_id: number;
  field_agent_id: number;
  proof_type: 'photo' | 'video' | 'document' | 'note';
  file_path?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  metadata?: Record<string, any>;
  is_verified: boolean;
  verified_by?: number;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  project?: any;
  field_agent?: User;
  verifier?: User;
}

export const impactProofApi = {
  getAll: async (params?: { project_id?: number; is_verified?: boolean; proof_type?: string }): Promise<ImpactProof[]> => {
    const response = await apiClient.get<ImpactProof[]>('/impact-proofs', { params });
    return response.data;
  },
  getById: async (id: number): Promise<ImpactProof> => {
    const response = await apiClient.get<ImpactProof>(`/impact-proofs/${id}`);
    return response.data;
  },
  create: async (formData: FormData): Promise<ImpactProof> => {
    const response = await apiClient.post<ImpactProof>('/impact-proofs', formData);
    return response.data;
  },
  update: async (id: number, data: Partial<ImpactProof>): Promise<ImpactProof> => {
    const response = await apiClient.put<ImpactProof>(`/impact-proofs/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/impact-proofs/${id}`);
  },
  verify: async (id: number): Promise<ImpactProof> => {
    const response = await apiClient.post<ImpactProof>(`/impact-proofs/${id}/verify`);
    return response.data;
  },
  getActiveProjects: async (): Promise<any[]> => {
    const response = await apiClient.get('/impact-proofs/active-projects');
    return response.data;
  },
  download: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/impact-proofs/${id}/download`, { responseType: 'blob' });
    return response.data;
  },
};

// User API (for admin to get all users)
export const userApi = {
  getAll: async (params?: { role?: string; status?: string }): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users', { params });
    return response.data;
  },
  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },
  update: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },
  block: async (id: number, reason: string): Promise<User> => {
    const response = await apiClient.post<User>(`/users/${id}/block`, { reason });
    return response.data;
  },
  unblock: async (id: number): Promise<User> => {
    const response = await apiClient.post<User>(`/users/${id}/unblock`);
    return response.data;
  },
};

/** Account types Super Admin can create (Admin + Staff) */
export type StaffRole = 'admin' | 'auditor' | 'field_agent' | 'driver' | 'supervisor' | 'special';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  display_role: string;
  custom_role_name?: string;
  organization?: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface PermissionsConfig {
  [key: string]: { label: string; group: string };
}

export const userManagementApi = {
  index: async (params?: { role?: string; is_active?: boolean; search?: string }) => {
    const response = await apiClient.get<{
      users: StaffUser[];
      permissions: PermissionsConfig;
      role_defaults: Record<string, string[]>;
      staff_roles: StaffRole[];
    }>('/user-management', { params });
    return response.data;
  },
  store: async (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: StaffRole;
    organization?: string;
    phone?: string;
    custom_role_name?: string;
    permissions?: string[];
  }) => {
    const response = await apiClient.post<{ message: string; user: StaffUser }>('/user-management', data);
    return response.data;
  },
  show: async (id: number) => {
    const response = await apiClient.get<{ user: StaffUser }>(`/user-management/${id}`);
    return response.data;
  },
  update: async (id: number, data: Partial<{
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    role: StaffRole;
    organization?: string;
    phone?: string;
    custom_role_name?: string;
    permissions?: string[];
    is_active: boolean;
  }>) => {
    const response = await apiClient.put<{ message: string; user: StaffUser }>(`/user-management/${id}`, data);
    return response.data;
  },
  destroy: async (id: number, permanent?: boolean) => {
    const response = await apiClient.delete<{ message: string }>(`/user-management/${id}`, {
      params: { permanent },
    });
    return response.data;
  },
  reactivate: async (id: number) => {
    const response = await apiClient.post<{ message: string; user: StaffUser }>(`/user-management/${id}/reactivate`);
    return response.data;
  },
};

export default apiClient;

