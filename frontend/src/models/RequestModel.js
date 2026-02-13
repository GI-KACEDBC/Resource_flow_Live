// ## Request Model
// ## Single Source of Truth for recipient request data and business logic

// ## Request interface
export class RequestModel {
  // ## Mock requests data
  static mockRequests = [
    {
      id: 'req-001',
      recipientId: 'recipient-001',
      recipientName: 'Orphanage A',
      item: 'Rice',
      specification: '50kg Bags',
      quantity: 200,
      unit: 'bags',
      category: 'Food',
      region: 'Greater Accra',
      urgency: 'Critical',
      status: 'Pending',
      createdAt: '2024-02-15',
      estimatedValue: 240000,
      description: 'Urgent need for rice to feed 150 children for the next month',
    },
    {
      id: 'req-002',
      recipientId: 'recipient-001',
      recipientName: 'Orphanage A',
      item: 'Paracetamol',
      specification: '500mg Tablets',
      quantity: 1000,
      unit: 'tablets',
      category: 'Medicine',
      region: 'Greater Accra',
      urgency: 'High',
      status: 'Approved',
      createdAt: '2024-02-10',
      estimatedValue: 5000,
      description: 'Medical supplies for children health care',
    },
    {
      id: 'req-003',
      recipientId: 'recipient-002',
      recipientName: 'Community Health Center',
      item: 'Medical Equipment',
      specification: 'Blood Pressure Monitors',
      quantity: 5,
      unit: 'units',
      category: 'Equipment',
      region: 'Ashanti',
      urgency: 'Medium',
      status: 'Pending',
      createdAt: '2024-02-20',
      estimatedValue: 15000,
      description: 'Equipment needed for health screening programs',
    },
    {
      id: 'req-004',
      recipientId: 'recipient-003',
      recipientName: 'Rural Primary School',
      item: 'School Supplies',
      specification: 'Exercise Books',
      quantity: 500,
      unit: 'books',
      category: 'Other',
      region: 'Northern',
      urgency: 'Low',
      status: 'Fulfilled',
      createdAt: '2024-01-25',
      estimatedValue: 2500,
      description: 'Educational materials for students',
    },
  ];

  // ## Get all requests
  static getAllRequests() {
    return this.mockRequests;
  }

  // ## Get requests by recipient ID
  static getRequestsByRecipient(recipientId) {
    return this.mockRequests.filter(r => r.recipientId === recipientId);
  }

  // ## Get requests by status
  static getRequestsByStatus(status) {
    return this.mockRequests.filter(r => r.status === status);
  }

  // ## Get requests by urgency
  static getRequestsByUrgency(urgency) {
    return this.mockRequests.filter(r => r.urgency === urgency);
  }

  // ## Calculate request statistics
  static calculateRequestStats(recipientId = null) {
    const requests = recipientId 
      ? this.getRequestsByRecipient(recipientId)
      : this.getAllRequests();
    
    return {
      totalRequests: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      fulfilled: requests.filter(r => r.status === 'Fulfilled').length,
      critical: requests.filter(r => r.urgency === 'Critical').length,
      high: requests.filter(r => r.urgency === 'High').length,
      medium: requests.filter(r => r.urgency === 'Medium').length,
      low: requests.filter(r => r.urgency === 'Low').length,
    };
  }

  // ## Create a new request
  static createRequest(requestData) {
    const newRequest = {
      id: `req-${Date.now()}`,
      ...requestData,
      status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.mockRequests.push(newRequest);
    return newRequest;
  }
}
