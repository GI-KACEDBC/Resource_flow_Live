<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request as HttpRequest;
use App\Services\UrgencyCalculationService;

class UrgencyController extends Controller
{
    protected UrgencyCalculationService $service;

    public function __construct(UrgencyCalculationService $service)
    {
        $this->service = $service;
    }

    public function calculate(HttpRequest $request)
    {
        $data = $request->only(['need_type', 'time_sensitivity', 'recipient_type', 'availability_gap', 'admin_override']);
        $result = $this->service->calculateWithBreakdown($data);
        $result['response_time'] = $this->service->getResponseTime($result['level']);
        return response()->json($result);
    }

    public function getFormula()
    {
        return response()->json([
            'formula' => 'Score = (A * 0.3) + (B * 0.25) + (C * 0.2) + (D * 0.15) + (E * 0.1)'
        ]);
    }

    public function getDemoScenarios()
    {
        // Example static demo scenarios; in a full app these come from DB
        $scenarios = [
            [
                'id' => 'medical_disaster',
                'name' => 'Medical Emergency in Disaster Zone',
                'factors' => [
                    'need_type' => 'medical_emergency',
                    'time_sensitivity' => 'less_than_24h',
                    'recipient_type' => 'disaster_zone',
                    'availability_gap' => 0,
                    'admin_override' => 3,
                ]
            ],
            // Additional scenarios can be added here or read from DB/seeder
        ];

        return response()->json($scenarios);
    }

    public function getFactorDefinitions()
    {
        return response()->json([
            'criticality' => UrgencyCalculationService::CRITICALITY_SCORES,
            'time' => UrgencyCalculationService::TIME_SCORES,
            'vulnerability' => UrgencyCalculationService::VULNERABILITY_SCORES,
            'availability' => UrgencyCalculationService::AVAILABILITY_SCORES,
            'weights' => UrgencyCalculationService::WEIGHTS,
        ]);
    }
}
