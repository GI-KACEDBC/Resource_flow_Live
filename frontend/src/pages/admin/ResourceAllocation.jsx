// ## Resource Allocation Component
// ## Redesigned with vulnerability-based prioritization
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Search, MapPin, User, CheckCircle, Clock, Truck, Filter, AlertTriangle, TrendingUp, Award } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatGHC } from '../../utils/currency';
import { Button } from '../../components/ui/Button';
import { allocationApi, donationApi, requestApi } from '../../services/api';
import { WarehouseModel } from '../../models/WarehouseModel';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import AuditReviewModal from '../../components/admin/AuditReviewModal';

const ResourceAllocation = () => {
  const [prioritizedRequests, setPrioritizedRequests] = useState([]);
  const [availableDonations, setAvailableDonations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedDonations, setSelectedDonations] = useState({}); // donation_id -> quantity
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [auditModalRequest, setAuditModalRequest] = useState(null);
  const isLoadingRef = useRef(false);

  const loadData = async () => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('Load data already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      const [requestsData, donationsData] = await Promise.all([
        allocationApi.getPrioritizedRequests(),
        donationApi.getAll({ status: 'Verified' }),
      ]);
      // Ensure both are always arrays
      setPrioritizedRequests(Array.isArray(requestsData) ? requestsData : []);
      const donations = Array.isArray(donationsData) ? donationsData : [];
      setAvailableDonations(donations.filter(d => d && d.is_available));
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't show error for rate limiting - just log it
      if (error.response?.status === 429) {
        console.warn('Rate limited - will retry later');
      }
      setPrioritizedRequests([]); // Set to empty array on error
      setAvailableDonations([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ## Auto-refresh when requests, donations, or allocations are created
  useAutoRefresh(loadData, ['request', 'donation', 'allocation'], []);

  // ## Filter requests by priority and search
  const filteredRequests = useMemo(() => {
    if (!Array.isArray(prioritizedRequests)) return [];
    
    let filtered = prioritizedRequests;

    if (filterPriority !== 'all') {
      filtered = filtered.filter(req => req && req.priority_level === filterPriority);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req && req.request &&
        ((req.request.title || '').toLowerCase().includes(query) ||
        (req.request.description || '').toLowerCase().includes(query) ||
        (req.request.user?.name || '').toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      const scoreA = a && a.vulnerability_score ? a.vulnerability_score : 0;
      const scoreB = b && b.vulnerability_score ? b.vulnerability_score : 0;
      return scoreB - scoreA;
    });
  }, [prioritizedRequests, filterPriority, searchQuery]);

  // ## Filter donations - prioritize those targeting the selected request (aid_request_id)
  const filteredDonations = useMemo(() => {
    if (!Array.isArray(availableDonations)) return [];
    
    let filtered = availableDonations;

    if (filterCategory !== 'All') {
      filtered = filtered.filter(d => d && d.type === filterCategory);
    }

    // Prioritize donations where aid_request_id matches the currently selected request
    const selectedRequestId = selectedRequest?.request?.id;
    if (selectedRequestId) {
      filtered = [...filtered].sort((a, b) => {
        const aMatches = a?.aid_request_id === selectedRequestId ? 1 : 0;
        const bMatches = b?.aid_request_id === selectedRequestId ? 1 : 0;
        return bMatches - aMatches; // Matching donations first
      });
    }

    return filtered;
  }, [availableDonations, filterCategory, selectedRequest]);

  // ## Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const handleAuditClick = (e, prioritizedReq) => {
    e.stopPropagation();
    setAuditModalRequest(prioritizedReq?.request ?? null);
  };

  const handleAuditApproved = () => {
    localStorage.setItem('request_audited', Date.now().toString());
    loadData();
    setAuditModalRequest(null);
  };

  // ## Handle allocation
  const handleAllocate = async () => {
    if (!selectedRequest || Object.keys(selectedDonations).length === 0) {
      alert('Please select a request and at least one donation');
      return;
    }

    // Check if recipient is verified
    const recipient = selectedRequest.request.user;
    if (!recipient || !recipient.is_verified) {
      alert('Cannot allocate to unverified recipient. Please verify the recipient first.');
      return;
    }

    try {
      const allocations = Object.entries(selectedDonations).map(([donationId, quantity]) =>
        allocationApi.create({
          request_id: selectedRequest.request.id,
          donation_id: parseInt(donationId),
          quantity_allocated: quantity,
        })
      );

      await Promise.all(allocations);
      // Set flag to trigger refresh in other dashboards
      localStorage.setItem('allocation_created', Date.now().toString());
      alert('Allocation successful!');
      setSelectedRequest(null);
      setSelectedDonations({});
      loadData();
    } catch (error) {
      console.error('Error creating allocation:', error);
      if (error.response?.status === 403) {
        alert('Recipient is not verified. Please verify the recipient before allocating resources.');
      } else {
        alert('Failed to create allocation. Please try again.');
      }
    }
  };

  // ## Update donation quantity
  const updateDonationQuantity = (donationId, quantity) => {
    if (quantity <= 0) {
      const newSelected = { ...selectedDonations };
      delete newSelected[donationId];
      setSelectedDonations(newSelected);
    } else {
      setSelectedDonations({ ...selectedDonations, [donationId]: quantity });
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading allocation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Resource Allocation</h2>
        <p className="text-slate-600 mt-1">
          Allocate resources based on vulnerability scores and priority levels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Prioritized Requests */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-slate-400" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No requests found</p>
              </div>
            ) : (
              filteredRequests.map((prioritizedReq) => {
                const request = prioritizedReq.request;
                const isSelected = selectedRequest?.request.id === request.id;

                return (
                  <div
                    key={request.id}
                    className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedRequest(prioritizedReq)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-800">{request.title}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                              prioritizedReq.priority_level
                            )}`}
                          >
                            {prioritizedReq.priority_level}
                          </span>
                          {request.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleAuditClick(e, prioritizedReq)}
                              className="ml-auto border-amber-500 text-amber-700 hover:bg-amber-50"
                            >
                              Review & Approve
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{request.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-slate-600">
                            <User size={14} />
                            <span>{request.user?.name || 'Unknown'}</span>
                          </div>
                          {request.urgency_level && (
                            <StatusBadge status={request.urgency_level} />
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp size={16} className="text-emerald-600" />
                          <span className="text-base font-bold text-emerald-600">
                            {(prioritizedReq.vulnerability_score || 0).toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Vulnerability Score</p>
                      </div>
                    </div>

                    {/* Score Breakdown - Will be populated from API response */}
                    {prioritizedReq.vulnerability_score > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-2">Vulnerability Assessment</p>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(prioritizedReq.vulnerability_score || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Available Donations */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-bold text-slate-800 mb-3">Available Donations</h3>
            <div className="mb-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="All">All Types</option>
                <option value="Goods">Goods</option>
                <option value="Monetary">Monetary</option>
                <option value="Services">Services</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredDonations.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No available donations</p>
              </div>
            ) : (
              filteredDonations.map((donation) => {
                const selectedQuantity = selectedDonations[donation.id] || 0;
                const maxQuantity = donation.quantity;

                return (
                  <div
                    key={donation.id}
                    className="bg-white border border-slate-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900">{donation.item}</p>
                        <p className="text-xs text-slate-500">
                          {donation.type} • {maxQuantity} {donation.unit} available
                        </p>
                        {donation.warehouse && (
                          <p className="text-xs text-slate-500 mt-1">
                            <MapPin size={10} className="inline" /> {donation.warehouse.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={maxQuantity}
                        value={selectedQuantity}
                        onChange={(e) =>
                          updateDonationQuantity(donation.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 p-1 border border-slate-200 rounded text-sm"
                        placeholder="Qty"
                      />
                      <span className="text-xs text-slate-500">{donation.unit}</span>
                      {selectedQuantity > 0 && (
                        <span className="text-xs text-emerald-600 font-semibold">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Allocation Summary */}
          {selectedRequest && Object.keys(selectedDonations).length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
              <h4 className="font-semibold text-emerald-800 mb-3">Allocation Summary</h4>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-emerald-700">
                  <strong>Request:</strong> {selectedRequest.request.title}
                </p>
                <p className="text-sm text-emerald-700">
                  <strong>Priority:</strong> {selectedRequest.priority_level}
                </p>
                <p className="text-sm text-emerald-700">
                  <strong>Items Selected:</strong> {Object.keys(selectedDonations).length}
                </p>
              </div>
              <Button
                onClick={handleAllocate}
                className="w-full"
                icon={CheckCircle}
              >
                Create Allocation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Audit Review Modal */}
      <AuditReviewModal
        isOpen={!!auditModalRequest}
        onClose={() => setAuditModalRequest(null)}
        request={auditModalRequest}
        onApproved={handleAuditApproved}
      />
    </div>
  );
};

export default ResourceAllocation;
