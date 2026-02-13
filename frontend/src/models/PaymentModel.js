// ## Payment Model
// ## Manages payment and transaction data for financial auditing

// ## Mock payment transactions data
// ## In production, this would come from a backend API
const mockPayments = [
  {
    id: 'pay-001',
    reference: 'SUPP-1707123456789-ABC123',
    amount: 5000.00,
    currency: 'GHS',
    status: 'success',
    paymentType: 'general',
    projectId: null,
    projectName: null,
    supplierId: 'supplier-001',
    supplierName: 'Ghana Food Bank',
    supplierEmail: 'contact@ghanafoodbank.gh',
    paymentMethod: 'card',
    cardType: 'visa',
    last4: '4081',
    createdAt: '2024-02-05T10:30:00Z',
    completedAt: '2024-02-05T10:31:15Z',
    metadata: {
      description: 'General support for ResourceFlow',
    },
  },
  {
    id: 'pay-002',
    reference: 'PROJ-1707123789012-XYZ789',
    amount: 15000.00,
    currency: 'GHS',
    status: 'success',
    paymentType: 'project',
    projectId: 'proj-001',
    projectName: 'Emergency Relief for Northern Ghana',
    supplierId: 'supplier-002',
    supplierName: 'Accra Medical Supplies',
    supplierEmail: 'info@accramed.gh',
    paymentMethod: 'mobile_money',
    mobileMoneyProvider: 'MTN',
    phoneNumber: '0241234567',
    createdAt: '2024-02-06T14:20:00Z',
    completedAt: '2024-02-06T14:21:30Z',
    metadata: {
      description: 'Funding for Emergency Relief project',
    },
  },
  {
    id: 'pay-003',
    reference: 'SUPP-1707124123456-DEF456',
    amount: 3000.00,
    currency: 'GHS',
    status: 'success',
    paymentType: 'general',
    projectId: null,
    projectName: null,
    supplierId: 'supplier-003',
    supplierName: 'Kumasi Education Foundation',
    supplierEmail: 'donate@kumasiedu.gh',
    paymentMethod: 'card',
    cardType: 'mastercard',
    last4: '5555',
    createdAt: '2024-02-07T09:15:00Z',
    completedAt: '2024-02-07T09:16:45Z',
    metadata: {
      description: 'General support for ResourceFlow',
    },
  },
  {
    id: 'pay-004',
    reference: 'PROJ-1707124456789-GHI789',
    amount: 25000.00,
    currency: 'GHS',
    status: 'success',
    paymentType: 'project',
    projectId: 'proj-002',
    projectName: 'School Supplies for Rural Communities',
    supplierId: 'supplier-001',
    supplierName: 'Ghana Food Bank',
    supplierEmail: 'contact@ghanafoodbank.gh',
    paymentMethod: 'bank_transfer',
    bankName: 'GCB Bank',
    accountNumber: '***1234',
    createdAt: '2024-02-08T11:00:00Z',
    completedAt: '2024-02-08T11:05:20Z',
    metadata: {
      description: 'Funding for School Supplies project',
    },
  },
  {
    id: 'pay-005',
    reference: 'PROJ-1707124789012-JKL012',
    amount: 8000.00,
    currency: 'GHS',
    status: 'failed',
    paymentType: 'project',
    projectId: 'proj-003',
    projectName: 'Medical Equipment for Health Centers',
    supplierId: 'supplier-004',
    supplierName: 'Tamale Health Initiative',
    supplierEmail: 'support@tamalehealth.gh',
    paymentMethod: 'card',
    cardType: 'visa',
    last4: '1234',
    createdAt: '2024-02-09T16:30:00Z',
    completedAt: null,
    failureReason: 'Insufficient funds',
    metadata: {
      description: 'Funding for Medical Equipment project',
    },
  },
  {
    id: 'pay-006',
    reference: 'SUPP-1707125123456-MNO345',
    amount: 12000.00,
    currency: 'GHS',
    status: 'success',
    paymentType: 'general',
    projectId: null,
    projectName: null,
    supplierId: 'supplier-005',
    supplierName: 'Western Region Aid',
    supplierEmail: 'info@westernaid.gh',
    paymentMethod: 'mobile_money',
    mobileMoneyProvider: 'Vodafone',
    phoneNumber: '0209876543',
    createdAt: '2024-02-10T13:45:00Z',
    completedAt: '2024-02-10T13:46:10Z',
    metadata: {
      description: 'General support for ResourceFlow',
    },
  },
  {
    id: 'pay-007',
    reference: 'PROJ-1707125456789-PQR678',
    amount: 35000.00,
    currency: 'GHS',
    status: 'success',
    paymentType: 'project',
    projectId: 'proj-004',
    projectName: 'Clean Water Initiative',
    supplierId: 'supplier-002',
    supplierName: 'Accra Medical Supplies',
    supplierEmail: 'info@accramed.gh',
    paymentMethod: 'card',
    cardType: 'mastercard',
    last4: '9999',
    createdAt: '2024-02-11T08:20:00Z',
    completedAt: '2024-02-11T08:22:05Z',
    metadata: {
      description: 'Funding for Clean Water Initiative',
    },
  },
  {
    id: 'pay-008',
    reference: 'SUPP-1707125789012-STU901',
    amount: 7500.00,
    currency: 'GHS',
    status: 'pending',
    paymentType: 'general',
    projectId: null,
    projectName: null,
    supplierId: 'supplier-006',
    supplierName: 'Central Region Foundation',
    supplierEmail: 'donate@centralfoundation.gh',
    paymentMethod: 'bank_transfer',
    bankName: 'Ecobank',
    accountNumber: '***5678',
    createdAt: '2024-02-12T10:00:00Z',
    completedAt: null,
    metadata: {
      description: 'General support for ResourceFlow',
    },
  },
];

class PaymentModel {
  /**
   * Get all payment transactions
   * @returns {Array} All payments
   */
  static getAllPayments() {
    return [...mockPayments];
  }

  /**
   * Get payments by status
   * @param {string} status - Payment status (success, failed, pending)
   * @returns {Array} Filtered payments
   */
  static getPaymentsByStatus(status) {
    return mockPayments.filter(payment => payment.status === status);
  }

  /**
   * Get payments by type
   * @param {string} type - Payment type (general, project)
   * @returns {Array} Filtered payments
   */
  static getPaymentsByType(type) {
    return mockPayments.filter(payment => payment.paymentType === type);
  }

  /**
   * Get payments by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Filtered payments
   */
  static getPaymentsByDateRange(startDate, endDate) {
    return mockPayments.filter(payment => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  }

  /**
   * Get payment statistics
   * @returns {Object} Payment statistics
   */
  static getPaymentStats() {
    const allPayments = this.getAllPayments();
    const successfulPayments = allPayments.filter(p => p.status === 'success');
    
    return {
      total: allPayments.length,
      successful: successfulPayments.length,
      failed: allPayments.filter(p => p.status === 'failed').length,
      pending: allPayments.filter(p => p.status === 'pending').length,
      totalAmount: successfulPayments.reduce((sum, p) => sum + p.amount, 0),
      totalGeneral: successfulPayments
        .filter(p => p.paymentType === 'general')
        .reduce((sum, p) => sum + p.amount, 0),
      totalProject: successfulPayments
        .filter(p => p.paymentType === 'project')
        .reduce((sum, p) => sum + p.amount, 0),
      averageAmount: successfulPayments.length > 0
        ? successfulPayments.reduce((sum, p) => sum + p.amount, 0) / successfulPayments.length
        : 0,
    };
  }

  /**
   * Get payments by supplier
   * @param {string} supplierId - Supplier ID
   * @returns {Array} Filtered payments
   */
  static getPaymentsBySupplier(supplierId) {
    return mockPayments.filter(payment => payment.supplierId === supplierId);
  }

  /**
   * Get payments by project
   * @param {string} projectId - Project ID
   * @returns {Array} Filtered payments
   */
  static getPaymentsByProject(projectId) {
    return mockPayments.filter(payment => payment.projectId === projectId);
  }

  /**
   * Search payments
   * @param {string} query - Search query
   * @returns {Array} Filtered payments
   */
  static searchPayments(query) {
    const lowerQuery = query.toLowerCase();
    return mockPayments.filter(payment => 
      payment.reference.toLowerCase().includes(lowerQuery) ||
      payment.supplierName.toLowerCase().includes(lowerQuery) ||
      payment.supplierEmail.toLowerCase().includes(lowerQuery) ||
      (payment.projectName && payment.projectName.toLowerCase().includes(lowerQuery))
    );
  }
}

export { PaymentModel };
