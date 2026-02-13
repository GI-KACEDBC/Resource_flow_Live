// ## Donation Model
// ## Single Source of Truth for donation data and business logic

// ## Donation interface
export interface Donation {
  id: string;
  type: 'Goods' | 'Monetary' | 'Services';
  item: string;
  quantity: number;
  unit: string;
  status: 'Pending' | 'Verified' | 'Allocated' | 'Rejected';
  createdAt: string;
  allocatedTo?: string;
}

// ## Mock donations data
const mockDonations: Donation[] = [
  {
    id: 'D1',
    type: 'Goods',
    item: 'Rice',
    quantity: 50,
    unit: 'bags',
    status: 'Verified',
    createdAt: '2026-01-15',
    allocatedTo: 'Orphanage A',
  },
  {
    id: 'D2',
    type: 'Monetary',
    item: 'Funds',
    quantity: 5000,
    unit: 'GH₵',
    status: 'Pending',
    createdAt: '2026-01-20',
  },
  {
    id: 'D3',
    type: 'Services',
    item: 'Medical Consultation',
    quantity: 10,
    unit: 'hours',
    status: 'Allocated',
    createdAt: '2026-01-18',
    allocatedTo: 'Community Clinic',
  },
];

// ## Donation Model Class
// ## Handles all donation data operations and business logic
export class DonationModel {
  // ## Get all donations
  static getAllDonations(): Donation[] {
    return mockDonations;
  }

  // ## Get donations by status
  static getDonationsByStatus(status: Donation['status']): Donation[] {
    return mockDonations.filter(d => d.status === status);
  }

  // ## Get donations by type
  static getDonationsByType(type: Donation['type']): Donation[] {
    return mockDonations.filter(d => d.type === type);
  }

  // ## Calculate donation statistics
  static calculateDonationStats(): {
    totalDonations: number;
    verified: number;
    pending: number;
    allocated: number;
  } {
    return {
      totalDonations: mockDonations.length,
      verified: mockDonations.filter(d => d.status === 'Verified' || d.status === 'Allocated').length,
      pending: mockDonations.filter(d => d.status === 'Pending').length,
      allocated: mockDonations.filter(d => d.status === 'Allocated').length,
    };
  }

  // ## Get total donation value (for monetary donations)
  static getTotalDonationValue(): number {
    return mockDonations
      .filter(d => d.type === 'Monetary')
      .reduce((sum, d) => sum + d.quantity, 0);
  }
}
