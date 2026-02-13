// ## Audit Logs View
// ## Displays history of audit actions and price changes
import React, { useState } from 'react';
import { FileText, Search, Filter, Calendar, User } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/shared/StatusBadge';

// ## Mock audit logs data
// ## In production, this would come from a Model
const mockAuditLogs = [
  {
    id: 'audit-001',
    timestamp: '2024-02-15T10:30:00Z',
    auditor: 'Financial Controller',
    action: 'Price Locked',
    itemId: 'inv-002',
    itemName: 'Paracetamol',
    specification: '500mg Tablets',
    previousPrice: null,
    newPrice: 25000,
    notes: 'Price confirmed and locked after market verification',
  },
  {
    id: 'audit-002',
    timestamp: '2024-02-15T09:15:00Z',
    auditor: 'Financial Controller',
    action: 'Price Override',
    itemId: 'inv-001',
    itemName: 'Rice',
    specification: '50kg Bag',
    previousPrice: 1200,
    newPrice: 1500,
    notes: 'Market price adjusted due to premium quality',
  },
  {
    id: 'audit-003',
    timestamp: '2024-02-14T16:45:00Z',
    auditor: 'Financial Controller',
    action: 'Price Confirmed',
    itemId: 'inv-003',
    itemName: 'Maize',
    specification: '25kg Bag',
    previousPrice: null,
    newPrice: 800,
    notes: 'Market price verified and confirmed',
  },
  {
    id: 'audit-004',
    timestamp: '2024-02-14T14:20:00Z',
    auditor: 'Financial Controller',
    action: 'Price Locked',
    itemId: 'inv-004',
    itemName: 'Medical Equipment',
    specification: 'Blood Pressure Monitor',
    previousPrice: null,
    newPrice: 3500,
    notes: 'Equipment price locked after supplier verification',
  },
  {
    id: 'audit-005',
    timestamp: '2024-02-13T11:00:00Z',
    auditor: 'Financial Controller',
    action: 'Price Override',
    itemId: 'inv-005',
    itemName: 'Antibiotics',
    specification: 'Amoxicillin 250mg',
    previousPrice: 450,
    newPrice: 500,
    notes: 'Price adjusted for brand premium',
  },
];

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // ## Filter audit logs
  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesSearch = 
      log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    // ## Simple date filter (in production, use proper date comparison)
    const matchesDate = dateFilter === 'all' || true; // ## Simplified for now
    
    return matchesSearch && matchesAction && matchesDate;
  });

  // ## Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      {/* ## Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Audit Logs</h2>
        <p className="text-slate-500 mt-1">History of all price review and locking actions</p>
      </div>

      {/* ## Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Actions</p>
          <p className="text-xl font-bold text-slate-900 mt-2">{mockAuditLogs.length}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Price Locked</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">
            {mockAuditLogs.filter(log => log.action === 'Price Locked').length}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Price Overrides</p>
          <p className="text-xl font-bold text-amber-600 mt-2">
            {mockAuditLogs.filter(log => log.action === 'Price Override').length}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Price Confirmed</p>
          <p className="text-xl font-bold text-blue-600 mt-2">
            {mockAuditLogs.filter(log => log.action === 'Price Confirmed').length}
          </p>
        </div>
      </div>

      {/* ## Search and Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            label="Search Logs"
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item name, auditor, or notes..."
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">
            Action Type
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">All Actions</option>
            <option value="Price Locked">Price Locked</option>
            <option value="Price Override">Price Override</option>
            <option value="Price Confirmed">Price Confirmed</option>
          </select>
        </div>
        <div className="w-48">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">
            Date Range
          </label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* ## Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Price Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Auditor
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-slate-400" size={16} />
                        <span className="text-sm text-slate-700">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">{log.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{log.itemName}</p>
                        <p className="text-xs text-slate-500">{log.specification}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {log.previousPrice ? (
                          <div>
                            <p className="text-xs text-slate-500 line-through">
                              {formatGHC(log.previousPrice)}
                            </p>
                            <p className="text-sm font-semibold text-emerald-600">
                              → {formatGHC(log.newPrice)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900">
                            {formatGHC(log.newPrice)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="text-slate-400" size={16} />
                        <span className="text-sm text-slate-700">{log.auditor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 max-w-md">{log.notes}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
