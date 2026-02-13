// ## Flagged Requests - Monthly Review
// ## Admin-only table for batch actions on requests flagged for review
import React, { useState, useEffect, useCallback } from 'react';
import { Flag, Loader2, CheckSquare, Square, XCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { requestApi } from '../../services/api';

const FlaggedRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchFlagged = useCallback(async () => {
    try {
      setLoading(true);
      const data = await requestApi.getFlagged();
      setRequests(Array.isArray(data) ? data : []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to fetch flagged requests:', err);
      setRequests([]);
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to load flagged requests.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlagged();
  }, [fetchFlagged]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    }
  };

  const handleBatchAction = async (action) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setMessage({ type: 'warning', text: 'Please select at least one request.' });
      return;
    }
    try {
      setActionLoading(true);
      setMessage(null);
      const result = await requestApi.batchUpdateStatus(ids, action);
      setMessage({ type: 'success', text: result?.message || `${ids.length} request(s) updated.` });
      await fetchFlagged();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Batch update failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const daysOpen = (createdAt) => {
    if (!createdAt) return '—';
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading flagged requests...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Flag className="text-amber-500" size={28} />
            Flagged Requests for Review
          </h2>
          <p className="text-slate-600 mt-1">
            Requests older than 30 days. Review and close or boost urgency.
          </p>
        </div>
        <button
          onClick={fetchFlagged}
          disabled={loading}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
        >
          <RefreshCw size={20} className="text-slate-600" />
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Batch action toolbar */}
      {requests.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              {selectedIds.size === requests.length ? (
                <CheckSquare size={18} className="text-blue-600" />
              ) : (
                <Square size={18} className="text-slate-400" />
              )}
              {selectedIds.size === requests.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-slate-500">
              {selectedIds.size} of {requests.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBatchAction('closed_no_match')}
              disabled={selectedIds.size === 0 || actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
              Close as No Match
            </button>
            <button
              onClick={() => handleBatchAction('boosted_urgency')}
              disabled={selectedIds.size === 0 || actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
              Boost Urgency
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Flag size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium">No requests over 30 days</p>
            <p className="text-sm mt-1">This list shows requests older than 30 days for admin review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === requests.length && requests.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Recipient</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Region</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Urgency</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Days Open</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(req.id)}
                        onChange={() => toggleSelect(req.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-slate-600">#{req.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{req.title}</td>
                    <td className="py-3 px-4 text-slate-600">{req.user?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{req.region ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (req.urgency_level || '').toLowerCase() === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : (req.urgency_level || '').toLowerCase() === 'high'
                            ? 'bg-amber-100 text-amber-700'
                            : (req.urgency_level || '').toLowerCase() === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {req.urgency_level ?? 'Low'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">{formatDate(req.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{daysOpen(req.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlaggedRequests;
