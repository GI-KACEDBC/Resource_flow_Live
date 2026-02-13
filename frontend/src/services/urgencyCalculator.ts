import { UrgencyFactors, UrgencyResult } from '../types/urgency'

const WEIGHTS = {
  criticality: 0.3,
  time_sensitivity: 0.25,
  vulnerability: 0.2,
  availability_gap: 0.15,
  admin_override: 0.1,
}

const CRITICALITY_SCORES: Record<string, number> = {
  medical_emergency: 10,
  life_saving_meds: 10,
  emergency_food: 8,
  clean_water: 9,
  shelter: 7,
  education: 5,
  clothing: 4,
  agricultural: 5,
}

const TIME_SCORES: Record<string, number> = {
  less_than_24h: 10,
  '24_to_72h': 7,
  '3_to_7_days': 4,
  more_than_7_days: 1,
}

const VULNERABILITY_SCORES: Record<string, number> = {
  disaster_zone: 10,
  refugee_camp: 9,
  rural_clinic: 8,
  urban_slum: 7,
  remote_village: 6,
  low_income_school: 5,
  community_center: 4,
  non_profit: 3,
}

function availabilityScore(percent: number){
  if (percent <= 0) return 10
  if (percent <= 25) return 8
  if (percent <= 50) return 5
  if (percent <= 75) return 2
  return 0
}

function getLevel(score: number){
  if (score >= 9.0) return 'critical'
  if (score >= 7.0) return 'high'
  if (score >= 4.0) return 'medium'
  return 'low'
}

function getResponseTime(level: string){
  switch(level){
    case 'critical': return '< 6 hours'
    case 'high': return '< 24 hours'
    case 'medium': return '< 72 hours'
    default: return '> 72 hours'
  }
}

export function calculateUrgency(factors: UrgencyFactors): UrgencyResult {
  const criticality = CRITICALITY_SCORES[factors.needType] ?? 0
  const timeScore = TIME_SCORES[factors.timeSensitivity] ?? 0
  const vulnerability = VULNERABILITY_SCORES[factors.recipientType] ?? 0
  const availability = availabilityScore(factors.availabilityGap)
  const adminOverride = factors.adminOverride ?? 0

  const weighted = {
    criticality: criticality * WEIGHTS.criticality,
    timeSensitivity: timeScore * WEIGHTS.time_sensitivity,
    vulnerability: vulnerability * WEIGHTS.vulnerability,
    availabilityGap: availability * WEIGHTS.availability_gap,
    adminOverride: adminOverride * WEIGHTS.admin_override,
  }

  const total = Object.values(weighted).reduce((s, v) => s + v, 0)
  const finalScore = Math.max(0, Math.min(10, total))
  const level = getLevel(finalScore)

  const breakdown = {
    criticality: { raw: criticality, weighted: weighted.criticality },
    timeSensitivity: { raw: timeScore, weighted: weighted.timeSensitivity },
    vulnerability: { raw: vulnerability, weighted: weighted.vulnerability },
    availabilityGap: { raw: availability, weighted: weighted.availabilityGap },
    adminOverride: { raw: adminOverride, weighted: weighted.adminOverride },
  }

  const color = level === 'critical' ? '#ef4444' : level === 'high' ? '#f97316' : level === 'medium' ? '#f59e0b' : '#10b981'

  return {
    score: Math.round(finalScore * 100) / 100,
    level: level as any,
    breakdown,
    responseTime: getResponseTime(level),
    visualization: { color, level },
  }
}
