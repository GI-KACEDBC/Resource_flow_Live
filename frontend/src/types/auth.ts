export type UserRole =
  | 'admin'
  | 'finance'
  | 'requestor'
  | 'ngo'
  | 'donor_institution'
  | 'donor_individual'
  | 'angel_donor'
  | 'auditor'
  | 'field_agent';

import { VulnerabilityScore, Donation, VerificationDocument, Allocation } from './backend';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  is_verified?: boolean;
  is_blocked?: boolean;
  verified_at?: string;
  reputation_score?: number;
  verification_status?: 'pending' | 'verified' | 'flagged';
  verified_by?: number;
  vulnerability_score?: VulnerabilityScore;
  donations?: Donation[];
  verification_documents?: VerificationDocument[];
  allocations?: Allocation[];
  created_at: string;
  updated_at: string;
  /** Set when Super Admin (email match). */
  is_super_admin?: boolean;
  /** Server session: user chose to continue to the app before admin verification completed. */
  allow_unverified_dashboard_access?: boolean;
}

/** Laravel Sanctum session auth — no bearer token in body. */
export interface AuthResponse {
  user: User;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'requestor' | 'ngo' | 'donor_institution' | 'donor_individual' | 'angel_donor';
  organization?: string;
  phone?: string;
  /** Where the signup OTP was delivered */
  otp_channel: 'email' | 'sms';
  otp: string;
}

export interface SendRegistrationOtpPayload {
  email: string;
  otp_channel: 'email' | 'sms';
  phone?: string;
}
