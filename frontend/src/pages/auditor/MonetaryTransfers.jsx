// ## Monetary Transfers View
// ## Financial Auditor's interface for viewing all payment transactions
import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { PaymentModel } from '../../models/PaymentModel';
import { formatGHC } from '../../utils/currency';
import { downloadCsv } from '../../utils/exportCsv';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';

const MonetaryTransfers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // ## Get all payments and stats
  const allPayments = PaymentModel.getAllPayments();
  const stats = PaymentModel.getPaymentStats();

  // ## Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = [...allPayments];

    // ## Search filter
    if (searchQuery) {
      filtered = PaymentModel.searchPayments(searchQuery);
    }

    // ## Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // ## Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentType === typeFilter);
    }

    // ## Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentMethod === paymentMethodFilter);
    }

    // ## Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(p => new Date(p.createdAt) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(p => new Date(p.createdAt) <= endDate);
    }

    // ## Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [searchQuery, statusFilter, typeFilter, paymentMethodFilter, dateRange, allPayments]);

  // ## Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'success':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: CheckCircle,
          label: 'Success'
        };
      case 'failed':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: XCircle,
          label: 'Failed'
        };
      case 'pending':
        return { 
          color: 'bg-amber-100 text-amber-700 border-amber-200', 
          icon: Clock,
          label: 'Pending'
        };
      default:
        return { 
          color: 'bg-slate-100 text-slate-700 border-slate-200', 
          icon: Clock,
          label: 'Unknown'
        };
    }
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

  // ## Export filtered payments to CSV
  const handleExport = () => {
    const headers = ['Reference', 'Supplier', 'Type', 'Project', 'Amount (GHS)', 'Payment Method', 'Date', 'Status'];
    const rows = [
      headers,
      ...filteredPayments.map((p) => [
        p.reference || '',
        p.supplierName || '',
        p.paymentType || '',
        p.projectName || '—',
        p.amount ?? '',
        p.paymentMethod || '',
        formatDate(p.createdAt),
        p.status || '',
      ]),
    ];
    downloadCsv(`monetary-transfers-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Monetary Transfers</h2>
          <p className="text-slate-600 mt-1">View and audit all payment transactions</p>
        </div>
        <Button icon={Download} onClick={handleExport} variant="outline">
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Transactions</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Successful</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.successful}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Amount</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatGHC(stats.totalAmount)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Average Amount</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatGHC(stats.averageAmount)}</p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-2">General Support</p>
          <p className="text-xl font-bold text-slate-800">{formatGHC(stats.totalGeneral)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {allPayments.filter(p => p.paymentType === 'general' && p.status === 'success').length} transactions
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-2">Project Funding</p>
          <p className="text-xl font-bold text-emerald-600">{formatGHC(stats.totalProject)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {allPayments.filter(p => p.paymentType === 'project' && p.status === 'success').length} transactions
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-2">Failed/Pending</p>
          <p className="text-xl font-bold text-red-600">
            {allPayments.filter(p => p.status !== 'success').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by reference, supplier, project..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="general">General Support</option>
              <option value="project">Project Funding</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Methods</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Date</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">End Date</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No payment transactions found</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const statusConfig = getStatusConfig(payment.status);

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {payment.reference}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{payment.supplierName}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <User size={12} />
                            {payment.supplierEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.paymentType === 'project'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {payment.paymentType === 'project' ? 'Project' : 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payment.projectName ? (
                          <div className="text-sm text-slate-700">{payment.projectName}</div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatGHC(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="text-slate-700">
                            {payment.paymentMethod === 'card' && payment.cardType
                              ? `${payment.cardType} •••• ${payment.last4}`
                              : payment.paymentMethod === 'mobile_money'
                              ? `${payment.mobileMoneyProvider} • ${payment.phoneNumber}`
                              : payment.paymentMethod === 'bank_transfer'
                              ? `${payment.bankName} • ${payment.accountNumber}`
                              : payment.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-700">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDate(payment.createdAt)}
                          </div>
                          {payment.completedAt && (
                            <div className="text-xs text-slate-500 mt-1">
                              Completed: {formatDate(payment.completedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {payment.failureReason && (
                          <div className="text-xs text-red-600 mt-1">{payment.failureReason}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      {filteredPayments.length > 0 && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-800">{filteredPayments.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{allPayments.length}</span> transactions
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Filtered Total: {formatGHC(
                filteredPayments
                  .filter(p => p.status === 'success')
                  .reduce((sum, p) => sum + p.amount, 0)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonetaryTransfers;
