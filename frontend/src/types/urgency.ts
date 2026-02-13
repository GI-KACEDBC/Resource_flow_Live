export type NeedType =
  | 'medical_emergency'
  | 'life_saving_meds'
  | 'emergency_food'
  | 'clean_water'
  | 'shelter'
  | 'education'
  | 'clothing'
  | 'agricultural'

export type TimeSensitivity =
  | 'less_than_24h'
  | '24_to_72h'
  | '3_to_7_days'
  | 'more_than_7_days'

export type RecipientType =
  | 'disaster_zone'
  | 'refugee_camp'
  | 'rural_clinic'
  | 'urban_slum'
  | 'remote_village'
  | 'low_income_school'
  | 'community_center'
  | 'non_profit'

export interface UrgencyFactors {
  needType: NeedType;
  timeSensitivity: TimeSensitivity;
  recipientType: RecipientType;
  availabilityGap: number; // 0-100
  adminOverride: number; // -3 to +3
}

export interface UrgencyBreakdownItem {
  raw: number;
  weighted: number;
}

export interface UrgencyResult {
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  breakdown: {
    criticality: UrgencyBreakdownItem;
    timeSensitivity: UrgencyBreakdownItem;
    vulnerability: UrgencyBreakdownItem;
    availabilityGap: UrgencyBreakdownItem;
    adminOverride: UrgencyBreakdownItem;
  };
  responseTime: string;
  visualization: {
    color: string;
    level: string;
  };
}
