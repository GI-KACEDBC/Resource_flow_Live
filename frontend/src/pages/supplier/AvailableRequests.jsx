import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Users, MapPin, Clock, AlertCircle, Calendar, Gift } from 'lucide-react';
import { requestApi, contributionApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import PartialFundingModal from '../../components/funding/PartialFundingModal';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const AvailableRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await requestApi.getAvailable();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // ## Auto-refresh when requests are created or updated
  useAutoRefresh(loadRequests, ['request', 'contribution'], []);

  const handleFundClick = (request) => {
    setSelectedRequest(request);
    setShowFundingModal(true);
  };

  const handleFundingSuccess = () => {
    // Set flag to trigger refresh
    localStorage.setItem('contribution_created', Date.now().toString());
    loadRequests(); // Reload to show updated funding status
  };

  const filteredRequests = Array.isArray(requests) ? requests.filter((request) => {
    if (!request) return false;
    const matchesSearch =
      (request.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (request.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (request.aid_type?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) : [];

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-slate-400 animate-pulse mb-4" />
          <p className="text-slate-600">Loading available requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={32} />
          Available Requests
        </h2>
        <p className="text-slate-600 mt-1">
          Partner with other suppliers to fund aid requests through percentage splits
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search requests by title, description, or aid type..."
          className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-semibold">No available requests found</p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery ? 'Try adjusting your search' : 'All requests are fully funded or not yet approved'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((request) => {
            if (!request) return null;
            
            const totalFunded = request.total_funded_percentage || 0;
            const remaining = request.remaining_percentage || (100 - totalFunded);
            const fundingStatus = request.funding_status || 'unfunded';

            return (
              <div
                key={request.id}
                className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-emerald-300 transition-all shadow-sm"
              >
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-slate-800 line-clamp-2">
                      {request.title}
                    </h3>
                    <StatusBadge
                      status={
                        fundingStatus === 'fully_funded'
                          ? 'Fully Funded'
                          : fundingStatus === 'partially_funded'
                          ? 'Partially Funded'
                          : 'Unfunded'
                      }
                    />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {request.description}
                  </p>
                </div>

                {/* Aid Type */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                    <Package size={12} />
                    {request.aid_type}
                    {request.custom_aid_type && ` - ${request.custom_aid_type}`}
                  </span>
                </div>

                {/* Funding Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">Funding Progress</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {totalFunded}% / {remaining}% remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${totalFunded}%` }}
                    />
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock size={14} />
                    <span>Urgency: {request.urgency_level || 'N/A'}</span>
                  </div>
                  {request.user && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users size={14} />
                      <span>Recipient: {request.user.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={14} />
                    <span>Request date: {request.created_at ? new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate('/dashboard/donate', { state: { targetRequest: request } })}
                    variant="outline"
                    className="flex-1"
                    icon={Gift}
                  >
                    Donate Goods
                  </Button>
                  <Button
                    onClick={() => handleFundClick(request)}
                    className="flex-1"
                    icon={TrendingUp}
                    disabled={fundingStatus === 'fully_funded' || remaining === 0}
                  >
                    {fundingStatus === 'fully_funded'
                      ? 'Fully Funded'
                      : remaining === 0
                      ? 'No Remaining'
                      : `Partner & Fund (${remaining}%)`}
                  </Button>
                </div>

                {/* Warning if fully funded */}
                {fundingStatus === 'fully_funded' && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    This request is fully funded
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Funding Modal */}
      {showFundingModal && selectedRequest && (
        <PartialFundingModal
          isOpen={showFundingModal}
          onClose={() => {
            setShowFundingModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onSuccess={handleFundingSuccess}
        />
      )}
    </div>
  );
};

export default AvailableRequests;
