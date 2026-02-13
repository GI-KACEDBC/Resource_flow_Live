import axios from 'axios';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';
import {
  Warehouse,
  Donation,
  VulnerabilityScore,
  Allocation,
  DeliveryRoute,
  Logistic,
  Financial,
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

// Use environment variable or default to 127.0.0.1:8000 (Laravel backend)
// Using 127.0.0.1 instead of localhost to avoid IPv6 resolution issues on macOS
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for Sanctum session cookies
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // For FormData requests, remove Content-Type header to let browser set it with boundary
  // This is crucial for file uploads - the browser needs to set multipart/form-data with the correct boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Handle 401/403 errors (unauthorized, password expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Password expired - clear token and redirect to login
    if (error.response?.status === 403 && error.response?.data?.error_code === 'PASSWORD_EXPIRED') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?password_expired=1';
      }
      return Promise.reject(error);
    }
    // Only logout on 401 if it's not a CORS error and we have a token
    if (error.response?.status === 401) {
      const token = localStorage.getItem('auth_token');
      
      // Only logout if we had a token (real auth failure, not CORS)
      if (token) {
        console.warn('Authentication failed - logging out');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    // Don't auto-logout on network errors (CORS, connection refused, etc.)
    if (!error.response && error.code !== 'ERR_NETWORK') {
      console.error('API request failed:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const url = `${apiClient.defaults.baseURL}/auth/login`;
    console.log('🔐 Attempting login to:', url);
    console.log('📧 Email:', credentials.email);
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      console.log('✅ Login successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: url,
      });
      throw error;
    }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me', { timeout: 5000 });
    return response.data;
  },

  changeExpiredPassword: async (data: {
    email: string;
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/change-expired-password', data);
    return response.data;
  },

  changePassword: async (data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/change-password', data);
    return response.data;
  },

  setToken: (token: string | null) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },
};

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

export const requestApi = {
  uploadFile: async (formData: FormData): Promise<{
    success: boolean;
    path?: string;
    url?: string;
    filename?: string;
    message?: string;
  }> => {
    try {
      console.log('Uploading file to:', apiClient.defaults.baseURL + '/files/upload');
      
      // Verify FormData contains the file
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
      }
      
      // Don't set Content-Type header - let axios set it automatically for FormData
      // This ensures the boundary is set correctly
      // Explicitly remove Content-Type to let browser set multipart/form-data with boundary
      // The interceptor will automatically remove Content-Type for FormData
      // This allows the browser to set multipart/form-data with the correct boundary
      const response = await apiClient.post('/files/upload', formData, {
        timeout: 30000, // 30 second timeout for file uploads
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      console.log('Upload response:', response);
      console.log('Response data:', response.data);
      
      // Check if response exists and has data
      if (!response || !response.data) {
        throw new Error('No response received from server');
      }
      
      return response.data;
    } catch (error: any) {
      // Better error handling
      console.error('File upload error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
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
    const response = await apiClient.get<Allocation[]>('/allocations', { params });
    return response.data;
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
};

// Verification Documents API
export const verificationDocumentApi = {
  getAll: async (params?: { user_id?: number; verification_status?: string }): Promise<VerificationDocument[]> => {
    const response = await apiClient.get<{ data?: VerificationDocument[] } | VerificationDocument[]>('/verification-documents', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
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

// Financials API
export const financialApi = {
  getAll: async (params?: { transaction_type?: string; status?: string; user_id?: number }): Promise<Financial[]> => {
    const response = await apiClient.get<Financial[]>('/financials', { params });
    return response.data;
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

  getStatistics: async (): Promise<{
    total_donations: number;
    total_allocations: number;
    total_expenses: number;
    total_value: number;
  }> => {
    const response = await apiClient.get('/financials/statistics');
    return response.data;
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
  getAll: async (params?: { status?: string; user_id?: number; warehouse_id?: number; aid_request_id?: number }): Promise<Donation[]> => {
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

  assignWarehouse: async (id: number, data: { warehouse_id: number; colocation_facility?: string; colocation_sub_location?: string }): Promise<Donation> => {
    const response = await apiClient.put<Donation>(`/donations/${id}/assign-warehouse`, data);
    return response.data;
  },
};

// CSR Matchmaking & Impact Tracking APIs
import { Project, CSRPartnership, MatchResult, ImpactDashboardData } from '../types/csr';

export const matchmakingApi = {
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

export const projectApi = {
  getAll: async (params?: { status?: string; sdg_goals?: number[] }): Promise<any> => {
    const response = await apiClient.get('/projects', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
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

