// ## AML/KYC Model
// ## Manages Anti-Money Laundering and Know Your Customer data and reviews

// ## Mock AML flags and reviews
const mockAMLFlags = [
  {
    id: 'aml-001',
    userId: 'supplier-001',
    userName: 'Ghana Food Bank',
    userEmail: 'contact@ghanafoodbank.gh',
    flagType: 'suspicious_transaction',
    severity: 'high',
    status: 'pending_review',
    description: 'Multiple large transactions within short time period',
    transactionIds: ['pay-001', 'pay-004'],
    totalAmount: 20000.00,
    flaggedAt: '2024-02-08T10:00:00Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    action: null, // 'clear', 'block', 'escalate'
  },
  {
    id: 'aml-002',
    userId: 'supplier-002',
    userName: 'Accra Medical Supplies',
    userEmail: 'info@accramed.gh',
    flagType: 'unusual_pattern',
    severity: 'medium',
    status: 'pending_review',
    description: 'Rapid increase in transaction frequency',
    transactionIds: ['pay-002', 'pay-007'],
    totalAmount: 50000.00,
    flaggedAt: '2024-02-11T08:30:00Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    action: null,
  },
  {
    id: 'aml-003',
    userId: 'supplier-003',
    userName: 'Kumasi Education Foundation',
    userEmail: 'donate@kumasiedu.gh',
    flagType: 'kyc_verification_required',
    severity: 'medium',
    status: 'under_review',
    description: 'KYC documents require re-verification',
    transactionIds: ['pay-003'],
    totalAmount: 3000.00,
    flaggedAt: '2024-02-07T09:20:00Z',
    reviewedBy: 'admin-001',
    reviewedAt: '2024-02-07T14:00:00Z',
    reviewNotes: 'Requesting updated business registration documents',
    action: 'escalate',
  },
  {
    id: 'aml-004',
    userId: 'supplier-005',
    userName: 'Western Region Aid',
    userEmail: 'info@westernaid.gh',
    flagType: 'sanctions_list_match',
    severity: 'critical',
    status: 'blocked',
    description: 'Potential match with sanctions list - requires immediate review',
    transactionIds: ['pay-006'],
    totalAmount: 12000.00,
    flaggedAt: '2024-02-10T13:50:00Z',
    reviewedBy: 'admin-001',
    reviewedAt: '2024-02-10T15:00:00Z',
    reviewNotes: 'User blocked pending further investigation. Contacted compliance team.',
    action: 'block',
  },
];

// ## Mock blocked users
const mockBlockedUsers = [
  {
    userId: 'supplier-005',
    userName: 'Western Region Aid',
    userEmail: 'info@westernaid.gh',
    blockedAt: '2024-02-10T15:00:00Z',
    blockedBy: 'admin-001',
    reason: 'AML - Potential sanctions list match',
    status: 'blocked',
  },
];

class AMLModel {
  /**
   * Get all AML flags
   * @returns {Array} All AML flags
   */
  static getAllFlags() {
    return [...mockAMLFlags];
  }

  /**
   * Get flags by status
   * @param {string} status - Flag status
   * @returns {Array} Filtered flags
   */
  static getFlagsByStatus(status) {
    return mockAMLFlags.filter(flag => flag.status === status);
  }

  /**
   * Get flags by severity
   * @param {string} severity - Flag severity
   * @returns {Array} Filtered flags
   */
  static getFlagsBySeverity(severity) {
    return mockAMLFlags.filter(flag => flag.severity === severity);
  }

  /**
   * Get flags for a specific user
   * @param {string} userId - User ID
   * @returns {Array} User's flags
   */
  static getFlagsByUser(userId) {
    return mockAMLFlags.filter(flag => flag.userId === userId);
  }

  /**
   * Get blocked users
   * @returns {Array} All blocked users
   */
  static getBlockedUsers() {
    return [...mockBlockedUsers];
  }

  /**
   * Check if user is blocked
   * @param {string} userId - User ID
   * @returns {boolean} Whether user is blocked
   */
  static isUserBlocked(userId) {
    return mockBlockedUsers.some(user => user.userId === userId && user.status === 'blocked');
  }

  /**
   * Block a user
   * @param {string} userId - User ID
   * @param {string} reason - Block reason
   * @param {string} blockedBy - Admin ID who blocked
   * @returns {Object} Blocked user record
   */
  static blockUser(userId, reason, blockedBy) {
    // ## In production, this would call an API
    const user = {
      userId,
      blockedAt: new Date().toISOString(),
      blockedBy,
      reason,
      status: 'blocked',
    };
    mockBlockedUsers.push(user);
    return user;
  }

  /**
   * Unblock a user
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  static unblockUser(userId) {
    const index = mockBlockedUsers.findIndex(user => user.userId === userId);
    if (index !== -1) {
      mockBlockedUsers[index].status = 'unblocked';
      mockBlockedUsers[index].unblockedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Review an AML flag
   * @param {string} flagId - Flag ID
   * @param {string} reviewedBy - Admin ID
   * @param {string} reviewNotes - Review notes
   * @param {string} action - Action taken (clear, block, escalate)
   * @returns {Object} Updated flag
   */
  static reviewFlag(flagId, reviewedBy, reviewNotes, action) {
    const flag = mockAMLFlags.find(f => f.id === flagId);
    if (flag) {
      flag.status = action === 'block' ? 'blocked' : action === 'clear' ? 'cleared' : 'under_review';
      flag.reviewedBy = reviewedBy;
      flag.reviewedAt = new Date().toISOString();
      flag.reviewNotes = reviewNotes;
      flag.action = action;

      // ## If blocking, also block the user
      if (action === 'block') {
        this.blockUser(flag.userId, `AML Review: ${reviewNotes}`, reviewedBy);
      }
    }
    return flag;
  }

  /**
   * Get AML statistics
   * @returns {Object} AML statistics
   */
  static getAMLStats() {
    return {
      totalFlags: mockAMLFlags.length,
      pendingReview: mockAMLFlags.filter(f => f.status === 'pending_review').length,
      underReview: mockAMLFlags.filter(f => f.status === 'under_review').length,
      cleared: mockAMLFlags.filter(f => f.status === 'cleared').length,
      blocked: mockAMLFlags.filter(f => f.status === 'blocked').length,
      critical: mockAMLFlags.filter(f => f.severity === 'critical').length,
      high: mockAMLFlags.filter(f => f.severity === 'high').length,
      medium: mockAMLFlags.filter(f => f.severity === 'medium').length,
      blockedUsers: mockBlockedUsers.filter(u => u.status === 'blocked').length,
    };
  }

  /**
   * Get flag type label
   * @param {string} flagType - Flag type
   * @returns {string} Human-readable label
   */
  static getFlagTypeLabel(flagType) {
    const labels = {
      suspicious_transaction: 'Suspicious Transaction',
      unusual_pattern: 'Unusual Pattern',
      kyc_verification_required: 'KYC Verification Required',
      sanctions_list_match: 'Sanctions List Match',
      high_risk_country: 'High Risk Country',
      large_amount: 'Large Amount Transaction',
    };
    return labels[flagType] || flagType;
  }
}

export { AMLModel };
