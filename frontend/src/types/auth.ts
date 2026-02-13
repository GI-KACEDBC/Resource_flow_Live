export type UserRole = 'admin' | 'requestor' | 'donor' | 'supplier' | 'auditor' | 'ngo' | 'corporate' | 'field_agent';

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
}

export interface AuthResponse {
  user: User;
  token: string;
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
  role: 'requestor' | 'donor' | 'supplier';
  organization?: string;
  phone?: string;
}
