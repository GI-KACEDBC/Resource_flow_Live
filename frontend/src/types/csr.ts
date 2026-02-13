// CSR Matchmaking & Impact Tracking Types

export interface Project {
  id: number;
  ngo_id: number;
  title: string;
  description: string;
  need_type: 'funding' | 'items' | 'both';
  sdg_goals: number[]; // Array of SDG goal numbers (1-17)
  budget: number | null;
  funded_amount: number;
  impact_metrics: ImpactMetrics | null;
  location: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  is_verified: boolean;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Relationships
  ngo?: User;
  verifier?: User;
  project_items?: ProjectItem[];
  csr_partnerships?: CSRPartnership[];
  funding_progress?: number;
  remaining_budget?: number;
}

export interface ProjectItem {
  id: number;
  project_id: number;
  item_name: string;
  description: string | null;
  quantity_needed: number;
  quantity_received: number;
  unit: string;
  estimated_value: number | null;
  status: 'pending' | 'partially_fulfilled' | 'fulfilled';
  created_at: string;
  updated_at: string;
  progress?: number;
  remaining_quantity?: number;
}

export interface CSRPartnership {
  id: number;
  corporate_id: number;
  ngo_id: number;
  project_id: number;
  funding_amount: number;
  funding_type: 'one_time' | 'recurring' | 'milestone_based';
  milestones: any[] | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'rejected';
  agreement_terms: string | null;
  impact_report: ImpactReport | null;
  funding_date: string | null;
  completion_date: string | null;
  created_at: string;
  updated_at: string;
  // Relationships
  corporate?: User;
  ngo?: User;
  project?: Project;
}

export interface ImpactMetrics {
  lives_impacted?: number;
  beneficiaries?: {
    children?: number;
    adults?: number;
    elderly?: number;
    total?: number;
  };
  geographic_reach?: string[];
  sdg_contributions?: number[];
  [key: string]: any;
}

export interface ImpactReport {
  lives_impacted: number;
  beneficiaries?: {
    children?: number;
    adults?: number;
    elderly?: number;
  };
  geographic_reach?: string[];
  [key: string]: any;
}

export interface MatchResult {
  id: number;
  name: string;
  organization: string;
  location: string;
  reputation_score: number;
  match_score: number;
  matched_sdg_goals: number[];
  active_projects_count: number;
  projects: Array<{
    id: number;
    title: string;
    sdg_goals: number[];
    budget: number;
    funded_amount: number;
    funding_progress: number;
  }>;
}

export interface ImpactDashboardData {
  summary: {
    total_funds_deployed: number;
    total_lives_impacted: number;
    active_partnerships: number;
    completed_partnerships: number;
    total_partnerships: number;
  };
  sdg_breakdown: Array<{
    goal: number;
    projects_count: number;
    funding_amount: number;
  }>;
  ngo_breakdown: Array<{
    ngo_id: number;
    ngo_name: string;
    partnerships_count: number;
    total_funding: number;
  }>;
  recent_partnerships: Array<{
    id: number;
    ngo_name: string;
    project_title: string;
    funding_amount: number;
    status: string;
    funding_date: string | null;
  }>;
}

// SDG Goals Reference
export const SDG_GOALS = [
  { id: 1, name: 'No Poverty', icon: '🌍' },
  { id: 2, name: 'Zero Hunger', icon: '🍽️' },
  { id: 3, name: 'Good Health and Well-being', icon: '🏥' },
  { id: 4, name: 'Quality Education', icon: '📚' },
  { id: 5, name: 'Gender Equality', icon: '⚖️' },
  { id: 6, name: 'Clean Water and Sanitation', icon: '💧' },
  { id: 7, name: 'Affordable and Clean Energy', icon: '⚡' },
  { id: 8, name: 'Decent Work and Economic Growth', icon: '💼' },
  { id: 9, name: 'Industry, Innovation and Infrastructure', icon: '🏗️' },
  { id: 10, name: 'Reduced Inequality', icon: '🤝' },
  { id: 11, name: 'Sustainable Cities and Communities', icon: '🏙️' },
  { id: 12, name: 'Responsible Consumption and Production', icon: '♻️' },
  { id: 13, name: 'Climate Action', icon: '🌱' },
  { id: 14, name: 'Life Below Water', icon: '🌊' },
  { id: 15, name: 'Life on Land', icon: '🌳' },
  { id: 16, name: 'Peace and Justice Strong Institutions', icon: '⚖️' },
  { id: 17, name: 'Partnerships to achieve the Goal', icon: '🤝' },
];
