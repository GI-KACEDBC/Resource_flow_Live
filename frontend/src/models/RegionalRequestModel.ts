// ## Regional Request Model
// ## Single Source of Truth for regional request data and business logic
import { RegionalRequest, RegionStats } from '../data/regionalRequests';

// ## Import mock data and utility functions
import { 
  mockRegionalRequests as importedMockRegionalRequests, 
  calculateRegionStats as calcStats, 
  getHeatColor, 
  getUrgencyLabel 
} from '../data/regionalRequests';

// ## Store reference to imported data
const mockRegionalRequests = importedMockRegionalRequests;

// ## Regional Request Model Class
// ## Handles all regional request data operations and business logic
export class RegionalRequestModel {
  // ## Get all regional requests
  static getAllRequests(): RegionalRequest[] {
    return mockRegionalRequests;
  }

  // ## Get requests by region
  static getRequestsByRegion(region: string): RegionalRequest[] {
    return mockRegionalRequests.filter(req => req.region === region);
  }

  // ## Get requests by urgency level
  static getRequestsByUrgency(urgency: 'Critical' | 'High' | 'Medium' | 'Low'): RegionalRequest[] {
    return mockRegionalRequests.filter(req => req.urgency === urgency);
  }

  // ## Get requests by category
  static getRequestsByCategory(category: 'Food' | 'Medicine' | 'Equipment' | 'Other'): RegionalRequest[] {
    return mockRegionalRequests.filter(req => req.category === category);
  }

  // ## Calculate regional statistics
  static calculateRegionStats(): RegionStats[] {
    return calcStats(mockRegionalRequests);
  }

  // ## Get region statistics by region name
  static getRegionStats(regionName: string): RegionStats | undefined {
    const stats = this.calculateRegionStats();
    return stats.find(s => s.region === regionName);
  }

  // ## Get heat color for urgency score
  static getHeatColor(urgencyScore: number): string {
    return getHeatColor(urgencyScore);
  }

  // ## Get urgency label from score
  static getUrgencyLabel(urgencyScore: number): string {
    return getUrgencyLabel(urgencyScore);
  }

  // ## Get total requests count
  static getTotalRequestsCount(): number {
    return mockRegionalRequests.length;
  }

  // ## Get critical requests count
  static getCriticalRequestsCount(): number {
    return mockRegionalRequests.filter(req => req.urgency === 'Critical').length;
  }

  // ## Get total estimated value of all requests
  static getTotalEstimatedValue(): number {
    return mockRegionalRequests.reduce((sum, req) => sum + (req.estimatedValue || 0), 0);
  }
}

// ## Export for backward compatibility
// ## Re-export the imported data directly (not through Model methods to avoid circular dependency)
export { mockRegionalRequests };
export const calculateRegionStats = RegionalRequestModel.calculateRegionStats.bind(RegionalRequestModel);
export { getHeatColor, getUrgencyLabel };
