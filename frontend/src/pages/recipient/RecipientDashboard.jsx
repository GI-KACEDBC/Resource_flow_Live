// ## Recipient Dashboard View
// ## Displays recipient requests from the backend API
import React, { useState, useEffect } from 'react';
import { Package, Plus, AlertCircle, CheckCircle, Clock, MapPin, TrendingUp, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { requestApi } from '../../services/api';
import { formatGHC } from '../../utils/currency';

const RecipientDashboard = () => {
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ## Fetch requests from API
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Fetch all requests - the backend filters by user_id automatically for recipients
        const data = await requestApi.getAll();
        // Filter requests for the current user (backend should do this, but double-check)
        const userRequests = Array.isArray(data) ? data.filter(req => req.user_id === user.id) : [];
        setRequests(userRequests);
      } catch (err) {
        console.error('Error fetching requests:', err);
        setError('Failed to load requests. Please try again.');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user?.id]);

  // ## Calculate stats from requests
  const stats = React.useMemo(() => {
    const totalRequests = requests.length;
    const pending = requests.filter(r => r.status === 'pending' || r.status === 'Pending').length;
    const approved = requests.filter(r => r.status === 'approved' || r.status === 'Approved').length;
    const fulfilled = requests.filter(r => r.status === 'completed' || r.status === 'delivered' || r.status === 'Completed').length;
    
    // Urgency breakdown
    const critical = requests.filter(r => r.urgency === 'critical' || r.urgency === 'Critical').length;
    const high = requests.filter(r => r.urgency === 'high' || r.urgency === 'High').length;
    const medium = requests.filter(r => r.urgency === 'medium' || r.urgency === 'Medium').length;
    const low = requests.filter(r => r.urgency === 'low' || r.urgency === 'Low').length;

    return {
      totalRequests,
      pending,
      approved,
      fulfilled,
      critical,
      high,
      medium,
      low,
    };
  }, [requests]);

  // ## Handle user interactions - unverified users go to verification-wait
  const handleCreateRequest = () => {
    if (!isVerified) {
      navigate('/verification-wait');
      return;
    }
    navigate('/dashboard/request');
  };

  // ## Refresh requests after creating a new one
  const refreshRequests = async () => {
    if (!user?.id) return;
    try {
      const data = await requestApi.getAll();
      const userRequests = Array.isArray(data) ? data.filter(req => req.user_id === user.id) : [];
      setRequests(userRequests);
    } catch (err) {
      console.error('Error refreshing requests:', err);
    }
  };

  // ## Listen for request creation and refresh
  useEffect(() => {
    // Check if a request was just created (from CreateRequest page)
    const checkForNewRequest = () => {
      const requestCreated = localStorage.getItem('request_created');
      if (requestCreated) {
        refreshRequests();
        localStorage.removeItem('request_created');
      }
    };

    // Check immediately and set up interval to check periodically
    checkForNewRequest();
    const interval = setInterval(checkForNewRequest, 1000);

    // Also listen for storage events (in case of multiple tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'request_created') {
        refreshRequests();
        localStorage.removeItem('request_created');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      {/* ## Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Recipient Dashboard</h2>
          <p className="text-slate-500 mt-1">Track your resource requests and their status</p>
        </div>
        {isVerified && (
          <Button icon={Plus} onClick={handleCreateRequest}>
            Create Request
          </Button>
        )}
      </div>

      {/* ## Verification Status Banner - unverified users cannot request until approved */}
      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Verification Pending</h3>
              <p className="text-sm text-amber-800 mb-4">
                Your account is under review. You can view your dashboard and reupload documents.
                Request will be available once your account is verified (typically 1–3 business days).
              </p>
              <Button
                variant="outline"
                icon={ShieldCheck}
                onClick={() => navigate('/dashboard/documents')}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Reupload Documents
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ## Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-yellow-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-yellow-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Total Requests</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalRequests}</p>
        </div>

        <div className="bg-yellow-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-yellow-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats.pending}</p>
        </div>

        <div className="bg-yellow-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-yellow-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Approved</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{stats.approved}</p>
        </div>

        <div className="bg-yellow-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-yellow-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Fulfilled</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.fulfilled}</p>
        </div>
      </div>

      {/* ## Urgency Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Critical</span>
            <span className="text-lg font-bold text-red-600">{stats.critical}</span>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">High</span>
            <span className="text-lg font-bold text-orange-600">{stats.high}</span>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Medium</span>
            <span className="text-lg font-bold text-yellow-600">{stats.medium}</span>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Low</span>
            <span className="text-lg font-bold text-green-600">{stats.low}</span>
          </div>
        </div>
      </div>

      {/* ## Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
          <span className="ml-3 text-slate-600">Loading requests...</span>
        </div>
      )}

      {/* ## Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ## Requests List */}
      {!loading && (
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">My Requests</h3>
          <div className="space-y-4">
            {requests.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-lg text-center">
              <Package className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-600 font-medium">No requests yet</p>
              <p className="text-sm text-slate-500 mt-2">Create your first resource request to get started</p>
              <Button icon={Plus} onClick={handleCreateRequest} className="mt-4">
                Create Request
              </Button>
            </div>
          ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Package className="text-slate-400" size={20} />
                      <div>
                        <h3 className="font-bold text-slate-900">{request.title || request.item || 'Untitled Request'}</h3>
                        <p className="text-sm text-slate-500">
                          {request.description ? `${request.description.substring(0, 50)}...` : 'No description'}
                          {request.quantity && ` • ${request.quantity} ${request.unit || 'units'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={request.status || 'pending'} />
                      {request.urgency && <StatusBadge status={request.urgency} />}
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-sm text-slate-600 mb-3">{request.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    {request.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{request.location}</span>
                      </div>
                    )}
                    {request.estimated_value && (
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} />
                        <span>Est. Value: {formatGHC(request.estimated_value)}</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-400">
                      Created: {new Date(request.created_at || request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientDashboard;
