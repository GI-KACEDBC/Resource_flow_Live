<?php
namespace App\Services;

class UrgencyCalculationService
{
    const WEIGHTS = [
        'criticality' => 0.3,
        'time_sensitivity' => 0.25,
        'vulnerability' => 0.2,
        'availability_gap' => 0.15,
        'admin_override' => 0.1,
    ];

    const CRITICALITY_SCORES = [
        'medical_emergency' => 10,
        'life_saving_meds' => 10,
        'emergency_food' => 8,
        'clean_water' => 9,
        'shelter' => 7,
        'education' => 5,
        'clothing' => 4,
        'agricultural' => 5,
    ];

    const TIME_SCORES = [
        'less_than_24h' => 10,
        '24_to_72h' => 7,
        '3_to_7_days' => 4,
        'more_than_7_days' => 1,
    ];

    const VULNERABILITY_SCORES = [
        'disaster_zone' => 10,
        'refugee_camp' => 9,
        'rural_clinic' => 8,
        'urban_slum' => 7,
        'remote_village' => 6,
        'low_income_school' => 5,
        'community_center' => 4,
        'non_profit' => 3,
    ];

    const AVAILABILITY_SCORES = [
        '0' => 10,
        '1_25' => 8,
        '26_50' => 5,
        '51_75' => 2,
        '76_100' => 0,
    ];

    /**
     * Calculate urgency score with full breakdown
     * @param array $factors
     * @return array
     */
    public function calculateWithBreakdown(array $factors): array
    {
        $criticality = $this->getCriticalityScore($factors['need_type'] ?? null);
        $timeScore = $this->getTimeScore($factors['time_sensitivity'] ?? null);
        $vulnerability = $this->getVulnerabilityScore($factors['recipient_type'] ?? null);
        $availability = $this->getAvailabilityScore($factors['availability_gap'] ?? 100);
        $adminOverride = isset($factors['admin_override']) ? (float) $factors['admin_override'] : 0.0;

        $weightedComponents = [
            'criticality' => $criticality * self::WEIGHTS['criticality'],
            'time_sensitivity' => $timeScore * self::WEIGHTS['time_sensitivity'],
            'vulnerability' => $vulnerability * self::WEIGHTS['vulnerability'],
            'availability_gap' => $availability * self::WEIGHTS['availability_gap'],
            'admin_override' => $adminOverride * self::WEIGHTS['admin_override'],
        ];

        $totalScore = array_sum($weightedComponents);
        $finalScore = min(10, max(0, $totalScore));

        return [
            'score' => round($finalScore, 2),
            'level' => $this->getUrgencyLevel($finalScore),
            'raw_scores' => [
                'criticality' => $criticality,
                'time_sensitivity' => $timeScore,
                'vulnerability' => $vulnerability,
                'availability_gap' => $availability,
                'admin_override' => $adminOverride,
            ],
            'weighted_scores' => $weightedComponents,
            'weights' => self::WEIGHTS,
            'visualization' => $this->getVisualizationData($finalScore, $weightedComponents),
        ];
    }

    public function getUrgencyLevel(float $score): string
    {
        if ($score >= 9.0)
            return 'critical';
        if ($score >= 7.0)
            return 'high';
        if ($score >= 4.0)
            return 'medium';
        return 'low';
    }

    public function getResponseTime(string $level): string
    {
        return match ($level) {
            'critical' => '< 6 hours',
            'high' => '< 24 hours',
            'medium' => '< 72 hours',
            'low' => '> 72 hours',
            default => '> 72 hours',
        };
    }

    protected function getCriticalityScore(?string $key): float
    {
        return self::CRITICALITY_SCORES[$key] ?? 0.0;
    }

    protected function getTimeScore(?string $key): float
    {
        return self::TIME_SCORES[$key] ?? 0.0;
    }

    protected function getVulnerabilityScore(?string $key): float
    {
        return self::VULNERABILITY_SCORES[$key] ?? 0.0;
    }

    protected function getAvailabilityScore($percent): float
    {
        // Accept numeric percent or category
        if (is_numeric($percent)) {
            $p = (float) $percent;
            if ($p <= 0)
                return self::AVAILABILITY_SCORES['0'];
            if ($p <= 25)
                return self::AVAILABILITY_SCORES['1_25'];
            if ($p <= 50)
                return self::AVAILABILITY_SCORES['26_50'];
            if ($p <= 75)
                return self::AVAILABILITY_SCORES['51_75'];
            return self::AVAILABILITY_SCORES['76_100'];
        }

        return self::AVAILABILITY_SCORES['76_100'];
    }

    protected function getVisualizationData(float $score, array $weightedComponents): array
    {
        $level = $this->getUrgencyLevel($score);
        $color = match ($level) {
            'critical' => '#ef4444',
            'high' => '#f97316',
            'medium' => '#f59e0b',
            'low' => '#10b981',
            default => '#6b7280',
        };

        return [
            'color' => $color,
            'level' => $level,
            'components' => $weightedComponents,
            'response_time' => $this->getResponseTime($level),
        ];
    }
}
