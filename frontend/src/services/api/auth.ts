import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  SendRegistrationOtpPayload,
} from '../../types/auth';
import { apiClient, fetchSanctumCsrfCookie } from './client';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    await fetchSanctumCsrfCookie();
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  sendRegistrationOtp: async (
    data: SendRegistrationOtpPayload
  ): Promise<{ message: string; otp_channel: string }> => {
    await fetchSanctumCsrfCookie();
    const response = await apiClient.post<{ message: string; otp_channel: string }>(
      '/auth/register/send-otp',
      data
    );
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    await fetchSanctumCsrfCookie();
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /** Server-backed consent to use the app while verification is pending (replaces client-only sessionStorage). */
  acknowledgeUnverifiedDashboard: async (): Promise<AuthResponse> => {
    await fetchSanctumCsrfCookie();
    const response = await apiClient.post<AuthResponse>('/auth/acknowledge-unverified-dashboard');
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
    await fetchSanctumCsrfCookie();
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

  setToken: (_token: string | null) => {
    // Session auth uses cookies; kept for backward compatibility with older call sites.
  },
};
