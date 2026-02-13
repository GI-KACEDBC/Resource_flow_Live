// ## Backend Entity Type Definitions
// ## Complete type definitions matching Laravel models and migrations

import { User } from './auth';

// ## Warehouse Types
export interface Warehouse {
  id: number;
  name: string;
  city: string;
  region: string;
  address: string;
  capacity: number;
  capacity_unit: string;
  manager: string;
  contact_phone: string;
  contact_email: string;
  status: 'Active' | 'Full' | 'Maintenance' | 'Inactive';
  current_occupancy: number;
  occupancy_percentage?: number;
  created_at: string;
  updated_at: string;
}

// ## Donation Types
export interface Donation {
  id: number;
  user_id: number;
  aid_request_id?: number;
  user?: User;
  type: 'Goods' | 'Monetary' | 'Services';
  item: string;
  quantity: number;
  unit: string;
  description?: string;
  status: 'Pending' | 'Verified' | 'Allocated' | 'Delivered' | 'Rejected';
  date_received?: string;
  warehouse_id?: number;
  warehouse?: Warehouse;
  colocation_facility?: string;
  colocation_sub_location?: string;
  value?: number;
  market_price?: number;
  price_status: 'Estimated' | 'Pending Review' | 'Locked';
  audited_price?: number;
  auditor_notes?: string;
  audited_by?: number;
  auditor?: User;
  locked_at?: string;
  expiry_date?: string;
  is_expired?: boolean;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
}

// ## Vulnerability Score Types
export interface VulnerabilityScore {
  id: number;
  user_id: number;
  user?: User;
  economic_score: number;
  social_score: number;
  health_score: number;
  geographic_score: number;
  overall_score: number;
  score_breakdown?: Record<string, any>;
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low';
  assessment_date: string;
  assessed_by?: number;
  assessor?: User;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ## Allocation Types
export interface Allocation {
  id: number;
  request_id: number;
  request?: {
    id: number;
    title: string;
    user?: User;
  };
  donation_id: number;
  donation?: Donation;
  allocated_by: number;
  allocator?: User;
  quantity_allocated: number;
  status: 'Pending' | 'Approved' | 'In Transit' | 'Delivered' | 'Cancelled';
  notes?: string;
  allocated_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  logistics?: Logistic;
  created_at: string;
  updated_at: string;
}

// ## Delivery Route Types
export interface DeliveryRoute {
  id: number;
  route_name: string;
  warehouse_id: number;
  warehouse?: Warehouse;
  destination_region: string;
  destination_city: string;
  destination_address: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  status: 'Scheduled' | 'In Transit' | 'Delivered' | 'Cancelled';
  scheduled_date: string;
  actual_departure_date?: string;
  actual_arrival_date?: string;
  driver_id?: number;
  driver?: User;
  vehicle_id?: string;
  route_notes?: string;
  logistics?: Logistic[];
  created_at: string;
  updated_at: string;
}

// ## Logistic Types
export interface Logistic {
  id: number;
  allocation_id: number;
  allocation?: Allocation;
  delivery_route_id: number;
  delivery_route?: DeliveryRoute;
  status: 'Scheduled' | 'In Transit' | 'Delivered' | 'Delayed' | 'Cancelled';
  tracking_number: string;
  estimated_value?: number;
  delivery_notes?: string;
  location_updates?: LocationUpdate[];
  last_location_update?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
}

// ## Financial Types
export interface Financial {
  id: number;
  transaction_type: 'Donation' | 'Allocation' | 'Expense' | 'Refund';
  user_id?: number;
  user?: User;
  donation_id?: number;
  donation?: Donation;
  allocation_id?: number;
  allocation?: Allocation;
  amount: number;
  currency: string;
  payment_reference?: string;
  payment_method?: 'card' | 'mobile_money' | 'bank_transfer' | 'cash';
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  description?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

// ## Verification Document Types
export interface VerificationDocument {
  id: number;
  user_id: number;
  user?: User;
  document_type: 'Ghana Card' | 'Business Registration' | 'Tax Certificate' | 'Other';
  document_number?: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  verification_status: 'Pending' | 'Verified' | 'Rejected';
  verified_by?: number;
  verifier?: User;
  verified_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ## Audit Trail Types
export interface AuditTrail {
  id: number;
  user_id?: number;
  user?: User;
  action: string;
  model_type: string;
  model_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

// ## Prioritized Request (for Allocation)
export interface PrioritizedRequest {
  request: {
    id: number;
    title: string;
    description?: string;
    urgency_score?: number;
    urgency_level?: string;
    user?: User;
  };
  vulnerability_score: number;
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low';
}
