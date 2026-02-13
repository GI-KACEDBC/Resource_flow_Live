// ## NGO Verification View
// ## Auditor interface for verifying NGOs
import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Search, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Building, Mail, Phone, MapPin, FileText, Loader2 } from 'lucide-react';
import { ngoVerificationApi } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const NGOVerification = () => {
  const [ngos, setNgos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedNgo, setSelectedNgo] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const loadNGOs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ngoVerificationApi.getAll({ status: statusFilter });
      // Handle paginated response
      const ngoList = data?.data || data || [];
      setNgos(Array.isArray(ngoList) ? ngoList : []);
    } catch (error) {
      console.error('Error loading NGOs:', error);
      setNgos([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadNGOs();
  }, [loadNGOs]);

  // Auto-refresh when verifications are made
  useAutoRefresh(loadNGOs, ['verification'], []);

  const handleVerify = async (ngoId, status, notes = '') => {
    try {
      setVerifying(true);
      await ngoVerificationApi.verify(ngoId, {
        status: status === 'verified' ? 'verified' : 'flagged',
        notes: notes || undefined,
      });
      
      // Set flag to trigger refresh
      localStorage.setItem('verification_created', Date.now().toString());
      
      // Reload NGOs
      await loadNGOs();
      setSelectedNgo(null);
      setVerificationStatus('');
      setVerificationNotes('');
      alert(`NGO ${status === 'verified' ? 'verified' : 'flagged'} successfully!`);
    } catch (error) {
      console.error('Error verifying NGO:', error);
      alert(error.response?.data?.message || 'Failed to verify NGO. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const filteredNGOs = Array.isArray(ngos) ? ngos.filter((ngo) => {
    if (!ngo) return false;
    const matchesSearch =
      (ngo.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ngo.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ngo.organization || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) : [];

  const stats = {
    pending: Array.isArray(ngos) ? ngos.filter(n => n.verification_status === 'pending').length : 0,
    verified: Array.isArray(ngos) ? ngos.filter(n => n.verification_status === 'verified').length : 0,
    flagged: Array.isArray(ngos) ? ngos.filter(n => n.verification_status === 'flagged').length : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading NGOs...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">NGO Verification</h2>
        <p className="text-slate-600 mt-1">Review and verify NGO organizations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-sm font-medium text-slate-700">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <p className="text-sm font-medium text-slate-700">Verified</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.verified}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-sm font-medium text-slate-700">Flagged</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{stats.flagged}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search NGOs by name, email, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {/* NGO List */}
      <div className="space-y-4">
        {filteredNGOs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No NGOs found</p>
          </div>
        ) : (
          filteredNGOs.map((ngo) => (
            <div
              key={ngo.id}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Building className="text-slate-400" size={24} />
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{ngo.name || 'Unknown'}</h3>
                      <p className="text-sm text-slate-600">{ngo.organization || 'No organization'}</p>
                    </div>
                    <StatusBadge status={ngo.verification_status || 'pending'} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={16} />
                      <span>{ngo.email || 'N/A'}</span>
                    </div>
                    {ngo.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={16} />
                        <span>{ngo.phone}</span>
                      </div>
                    )}
                    {ngo.address && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={16} />
                        <span>{ngo.address}</span>
                      </div>
                    )}
                    {ngo.reputation_score !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <ShieldCheck size={16} />
                        <span>Reputation: {ngo.reputation_score}/100</span>
                      </div>
                    )}
                  </div>

                  {ngo.verification_documents && ngo.verification_documents.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Verification Documents:</p>
                      <div className="flex gap-2 flex-wrap">
                        {ngo.verification_documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                            <FileText size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-600">{doc.document_type || 'Document'}</span>
                            <StatusBadge status={doc.verification_status || 'Pending'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {ngo.verification_status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      icon={CheckCircle}
                      onClick={() => {
                        setSelectedNgo(ngo);
                        setVerificationStatus('verified');
                      }}
                      className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    >
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      icon={XCircle}
                      onClick={() => {
                        setSelectedNgo(ngo);
                        setVerificationStatus('flagged');
                      }}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Flag
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Verification Modal */}
      {selectedNgo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {verificationStatus === 'verified' ? 'Verify' : 'Flag'} NGO
            </h3>
            <p className="text-slate-600 mb-4">
              {selectedNgo.name} ({selectedNgo.organization})
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Notes (Optional)</label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="Add verification notes..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedNgo(null);
                    setVerificationStatus('');
                    setVerificationNotes('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  icon={verificationStatus === 'verified' ? CheckCircle : XCircle}
                  onClick={() => {
                    if (!verificationStatus) return;
                    handleVerify(selectedNgo.id, verificationStatus, verificationNotes);
                  }}
                  disabled={verifying || !verificationStatus}
                  className={`flex-1 ${
                    verificationStatus === 'verified'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {verifying ? 'Processing...' : verificationStatus === 'verified' ? 'Verify NGO' : 'Flag NGO'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NGOVerification;
