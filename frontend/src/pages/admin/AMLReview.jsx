// ## AML/KYC Review View
// ## Admin interface for reviewing AML flags and managing user blocks
import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Ban,
  Unlock,
  FileText,
  User,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { AMLModel } from '../../models/AMLModel';
import { PaymentModel } from '../../models/PaymentModel';
import { formatGHC } from '../../utils/currency';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';

const AMLReview = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  // ## Get all flags and stats
  const allFlags = AMLModel.getAllFlags();
  const blockedUsers = AMLModel.getBlockedUsers();
  const stats = AMLModel.getAMLStats();
  const allPayments = PaymentModel.getAllPayments();

  // ## Filter flags
  const filteredFlags = useMemo(() => {
    let filtered = [...allFlags];

    // ## Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        flag =>
          flag.userName.toLowerCase().includes(lowerQuery) ||
          flag.userEmail.toLowerCase().includes(lowerQuery) ||
          flag.description.toLowerCase().includes(lowerQuery) ||
          flag.id.toLowerCase().includes(lowerQuery)
      );
    }

    // ## Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(flag => flag.status === statusFilter);
    }

    // ## Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(flag => flag.severity === severityFilter);
    }

    return filtered.sort((a, b) => {
      // ## Sort by severity (critical > high > medium) then by date
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.flaggedAt) - new Date(a.flaggedAt);
    });
  }, [searchQuery, statusFilter, severityFilter, allFlags]);

  // ## Get severity configuration
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: AlertTriangle,
          label: 'Critical',
        };
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-700 border-orange-300',
          icon: AlertTriangle,
          label: 'High',
        };
      case 'medium':
        return {
          color: 'bg-amber-100 text-amber-700 border-amber-300',
          icon: Clock,
          label: 'Medium',
        };
      case 'low':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: FileText,
          label: 'Low',
        };
      default:
        return {
          color: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: FileText,
          label: 'Unknown',
        };
    }
  };

  // ## Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending_review':
        return { color: 'bg-amber-100 text-amber-700', label: 'Pending Review' };
      case 'under_review':
        return { color: 'bg-blue-100 text-blue-700', label: 'Under Review' };
      case 'cleared':
        return { color: 'bg-emerald-100 text-emerald-700', label: 'Cleared' };
      case 'blocked':
        return { color: 'bg-red-100 text-red-700', label: 'Blocked' };
      default:
        return { color: 'bg-slate-100 text-slate-700', label: status };
    }
  };

  // ## Handle review flag
  const handleReviewFlag = () => {
    if (!selectedFlag || !reviewAction || !reviewNotes.trim()) {
      alert('Please select an action and provide review notes');
      return;
    }

    // ## In production, this would call an API
    AMLModel.reviewFlag(selectedFlag.id, 'admin-001', reviewNotes, reviewAction);
    alert(`Flag ${reviewAction === 'block' ? 'blocked' : reviewAction === 'clear' ? 'cleared' : 'escalated'} successfully`);
    setSelectedFlag(null);
    setReviewNotes('');
    setReviewAction('');
  };

  // ## Handle block user
  const handleBlockUser = (flag = null) => {
    if (flag) {
      setUserToBlock({
        userId: flag.userId,
        userName: flag.userName,
        userEmail: flag.userEmail,
      });
      setBlockReason(`AML Review: ${flag.description}`);
    }
    setShowBlockModal(true);
  };

  // ## Confirm block user
  const confirmBlockUser = () => {
    if (!userToBlock || !blockReason.trim()) {
      alert('Please provide a reason for blocking');
      return;
    }

    AMLModel.blockUser(userToBlock.userId, blockReason, 'admin-001');
    alert(`User ${userToBlock.userName} has been blocked`);
    setShowBlockModal(false);
    setUserToBlock(null);
    setBlockReason('');
  };

  // ## Handle unblock user
  const handleUnblockUser = (userId) => {
    if (window.confirm('Are you sure you want to unblock this user?')) {
      AMLModel.unblockUser(userId);
      alert('User has been unblocked');
    }
  };

  // ## Get transactions for a flag
  const getFlagTransactions = (flag) => {
    return allPayments.filter(payment => flag.transactionIds.includes(payment.id));
  };

  // ## Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">AML/KYC Review</h2>
          <p className="text-slate-600 mt-1">Review flagged transactions and manage user blocks</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Flags</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.totalFlags}</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Pending Review</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.pendingReview}</p>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Critical</p>
          <p className="text-xl font-bold text-red-600 mt-1">{stats.critical}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Blocked Users</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.blockedUsers}</p>
        </div>
      </div>

      {/* Blocked Users Section */}
      {blockedUsers.filter(u => u.status === 'blocked').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-3">Blocked Users</h3>
          <div className="space-y-2">
            {blockedUsers
              .filter(u => u.status === 'blocked')
              .map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                >
                  <div>
                    <p className="font-medium text-slate-800">{user.userName}</p>
                    <p className="text-sm text-slate-600">{user.userEmail}</p>
                    <p className="text-xs text-red-600 mt-1">Reason: {user.reason}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Blocked: {formatDate(user.blockedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Unlock}
                    onClick={() => handleUnblockUser(user.userId)}
                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  >
                    Unblock
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, email, or flag ID..."
              className="pl-10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="cleared">Cleared</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flags Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Flag ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Flagged At
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No AML flags found</p>
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => {
                  const severityConfig = getSeverityConfig(flag.severity);
                  const SeverityIcon = severityConfig.icon;
                  const statusConfig = getStatusConfig(flag.status);

                  return (
                    <tr key={flag.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-slate-900">{flag.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{flag.userName}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <User size={12} />
                            {flag.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{AMLModel.getFlagTypeLabel(flag.flagType)}</div>
                        <div className="text-xs text-slate-500 mt-1">{flag.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit border ${severityConfig.color}`}
                        >
                          <SeverityIcon size={12} />
                          {severityConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatGHC(flag.totalAmount)}
                        </span>
                        <div className="text-xs text-slate-500 mt-1">
                          {flag.transactionIds.length} transaction(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-700">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDate(flag.flaggedAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={FileText}
                            onClick={() => setSelectedFlag(flag)}
                            className="text-xs px-2 py-1"
                          >
                            Review
                          </Button>
                          {flag.status !== 'blocked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Ban}
                              onClick={() => handleBlockUser(flag)}
                              className="text-xs px-2 py-1 border-red-500 text-red-600 hover:bg-red-50"
                            >
                              Block
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Review AML Flag</h3>
                <p className="text-sm text-slate-500 mt-1">Flag ID: {selectedFlag.id}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedFlag(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-6">
              {/* User Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">User Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-slate-900">{selectedFlag.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-900">{selectedFlag.userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Flag Details */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Flag Details</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-slate-900">
                      {AMLModel.getFlagTypeLabel(selectedFlag.flagType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-700">{selectedFlag.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatGHC(selectedFlag.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Related Transactions */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Related Transactions</h4>
                <div className="space-y-2">
                  {getFlagTransactions(selectedFlag).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-white rounded border border-slate-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{transaction.reference}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(transaction.createdAt)} • {transaction.paymentType}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatGHC(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Form */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Review Action</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Select Action *
                    </label>
                    <select
                      value={reviewAction}
                      onChange={(e) => setReviewAction(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Action --</option>
                      <option value="clear">Clear Flag</option>
                      <option value="block">Block User</option>
                      <option value="escalate">Escalate to Compliance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Review Notes *
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Provide detailed notes about your review decision..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setSelectedFlag(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon={CheckCircle}
                  onClick={handleReviewFlag}
                  disabled={!reviewAction || !reviewNotes.trim()}
                >
                  Submit Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Block User</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {userToBlock?.userName} ({userToBlock?.userEmail})
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowBlockModal(false)}>
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Reason for Blocking *
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Provide a detailed reason for blocking this user..."
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Blocking a user will prevent them from making any transactions
                  or accessing the platform. This action can be reversed later.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowBlockModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  icon={Ban}
                  onClick={confirmBlockUser}
                  disabled={!blockReason.trim()}
                >
                  Block User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AMLReview;
