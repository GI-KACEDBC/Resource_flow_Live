// ## Transparency Log Component (Audit Trail UI)
// ## Shows "Old vs. New" value comparison for all resource movements
import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, User, Clock, ArrowRight, Eye, Calendar } from 'lucide-react';
import { auditTrailApi } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const TransparencyLog = () => {
  const [auditTrails, setAuditTrails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadAuditTrails();
  }, [actionFilter, modelFilter, dateRange]);

  const loadAuditTrails = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (modelFilter !== 'all') params.model_type = modelFilter;
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const response = await auditTrailApi.getAll(params);
      // Ensure we always have an array
      const data = response?.data || response;
      setAuditTrails(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading audit trails:', error);
      setAuditTrails([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Ensure auditTrails is always an array before filtering
  const filteredTrails = Array.isArray(auditTrails) ? auditTrails.filter((trail) => {
      const matchesSearch =
        (trail.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trail.model_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trail.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) : [];

  const getModelName = (modelType) => {
    return modelType.split('\\').pop() || modelType;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderValueComparison = (oldValues, newValues) => {
    if (!oldValues && !newValues) return null;

    const allKeys = new Set([
      ...(oldValues ? Object.keys(oldValues) : []),
      ...(newValues ? Object.keys(newValues) : []),
    ]);

    return (
      <div className="space-y-2">
        {Array.from(allKeys).map((key) => {
          const oldValue = oldValues?.[key];
          const newValue = newValues?.[key];
          const changed = oldValue !== newValue;

          return (
            <div
              key={key}
              className={`p-2 rounded ${
                changed ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                {oldValue !== undefined && (
                  <span className={`text-slate-600 ${changed ? 'line-through' : ''}`}>
                    {typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)}
                  </span>
                )}
                {changed && oldValue !== undefined && (
                  <ArrowRight size={14} className="text-amber-600" />
                )}
                {newValue !== undefined && (
                  <span className={`font-semibold ${changed ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && (!Array.isArray(auditTrails) || auditTrails.length === 0)) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">Transparency Log</h2>
        <p className="text-slate-600 mt-1">Complete audit trail of all system changes and resource movements</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Entries</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{Array.isArray(auditTrails) ? auditTrails.length : 0}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Created</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {Array.isArray(auditTrails) ? auditTrails.filter(t => t.action === 'created').length : 0}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Updated</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {Array.isArray(auditTrails) ? auditTrails.filter(t => t.action === 'updated').length : 0}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Deleted</p>
          <p className="text-xl font-bold text-red-600 mt-1">
            {Array.isArray(auditTrails) ? auditTrails.filter(t => t.action === 'deleted').length : 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Search</label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description, model, or user..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="allocated">Allocated</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Model Type</label>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Models</option>
              <option value="App\Models\Allocation">Allocation</option>
              <option value="App\Models\Donation">Donation</option>
              <option value="App\Models\DeliveryRoute">DeliveryRoute</option>
              <option value="App\Models\Logistic">Logistic</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Date</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">End Date</label>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      {/* Audit Trail List */}
      <div className="space-y-4">
        {filteredTrails.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No audit trail entries found</p>
          </div>
        ) : (
          filteredTrails.map((trail) => (
            <div
              key={trail.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTrail(trail)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      {trail.action.toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {getModelName(trail.model_type)}
                    </span>
                    {trail.model_id && (
                      <span className="text-xs text-slate-500">ID: {trail.model_id}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{trail.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {trail.user && (
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        <span>{trail.user.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(trail.created_at)}</span>
                    </div>
                    {trail.ip_address && (
                      <span className="font-mono">{trail.ip_address}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" icon={Eye}>
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedTrail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Audit Trail Details</h3>
                <p className="text-sm text-slate-500 mt-1">Entry ID: {selectedTrail.id}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedTrail(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Action Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Action</p>
                    <p className="font-medium text-slate-900 capitalize">{selectedTrail.action}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Model Type</p>
                    <p className="font-medium text-slate-900">{getModelName(selectedTrail.model_type)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Model ID</p>
                    <p className="font-medium text-slate-900">{selectedTrail.model_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">User</p>
                    <p className="font-medium text-slate-900">{selectedTrail.user?.name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Date & Time</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedTrail.created_at)}</p>
                  </div>
                  {selectedTrail.ip_address && (
                    <div>
                      <p className="text-slate-500">IP Address</p>
                      <p className="font-medium text-slate-900 font-mono">{selectedTrail.ip_address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-2">Description</h4>
                <p className="text-sm text-slate-700">{selectedTrail.description}</p>
              </div>

              {/* Value Comparison */}
              {(selectedTrail.old_values || selectedTrail.new_values) && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">Value Changes</h4>
                  {renderValueComparison(selectedTrail.old_values || null, selectedTrail.new_values || null)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransparencyLog;
