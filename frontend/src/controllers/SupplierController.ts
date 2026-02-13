// ## Supplier Controller
// ## Handles supplier user interactions and coordinates between Model and View
import { DonationModel } from '../models/DonationModel';
import { RegionalRequestModel } from '../models/RegionalRequestModel';

// ## Supplier Controller Class
// ## Manages supplier dashboard data flow and user interactions
export class SupplierController {
  // ## Get supplier donation statistics
  static getDonationStats() {
    return DonationModel.calculateDonationStats();
  }

  // ## Get all supplier donations
  static getAllDonations() {
    return DonationModel.getAllDonations();
  }

  // ## Get donations by status
  static getDonationsByStatus(status: 'Pending' | 'Verified' | 'Allocated' | 'Rejected') {
    return DonationModel.getDonationsByStatus(status);
  }

  // ## Get regional request statistics for heat map
  static getRegionalRequestStats() {
    return RegionalRequestModel.calculateRegionStats();
  }

  // ## Handle make donation action
  static handleMakeDonation(navigate: (path: string) => void) {
    navigate('/dashboard/donate');
  }

  // ## Handle view donation details
  static handleViewDonation(donationId: string, navigate: (path: string) => void) {
    navigate(`/dashboard/donations/${donationId}`);
  }
}
