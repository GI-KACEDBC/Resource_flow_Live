// ## My Proofs Component
// ## Field Agent view of all uploaded impact proofs
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, MapPin, CheckCircle, Clock, Filter, Search, Download, Trash2, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { impactProofApi } from '../../services/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const MyProofs = () => {
  const navigate = useNavigate();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProof, setSelectedProof] = useState(null);

  const loadProofs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'all') {
        params.proof_type = filterType;
      }
      if (filterStatus !== 'all') {
        params.is_verified = filterStatus === 'verified';
      }
      const data = await impactProofApi.getAll(params);
      setProofs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading proofs:', error);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    loadProofs();
  }, [loadProofs]);

  // Auto-refresh when proofs are uploaded
  useAutoRefresh(loadProofs, ['impact_proof'], []);

  const handleDelete = async (proofId) => {
    if (!window.confirm('Are you sure you want to delete this proof? This action cannot be undone.')) {
      return;
    }

    try {
      await impactProofApi.delete(proofId);
      // Set flag to trigger refresh
      localStorage.setItem('impact_proof_created', Date.now().toString());
      loadProofs();
    } catch (error) {
      console.error('Error deleting proof:', error);
      alert('Failed to delete proof. Please try again.');
    }
  };

  const handleDownload = async (proof) => {
    if (!proof.file_path) {
      alert('No file available for download');
      return;
    }

    try {
      const blob = await impactProofApi.download(proof.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = proof.file_path.split('/').pop() || 'proof';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading proof:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const filteredProofs = Array.isArray(proofs) ? proofs.filter((proof) => {
    if (!proof) return false;
    
    const matchesSearch =
      (proof.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proof.location_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proof.project?.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  }) : [];

  const stats = {
    total: proofs.length,
    verified: proofs.filter(p => p.is_verified).length,
    pending: proofs.filter(p => !p.is_verified).length,
    photos: proofs.filter(p => p.proof_type === 'photo').length,
    videos: proofs.filter(p => p.proof_type === 'video').length,
    documents: proofs.filter(p => p.proof_type === 'document').length,
    notes: proofs.filter(p => p.proof_type === 'note').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading proofs...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">My Proofs</h2>
          <p className="text-slate-500 mt-1">View and manage your uploaded impact proofs</p>
        </div>
        <Button icon={Camera} onClick={() => navigate('/dashboard/upload-proof')}>
          Upload Proof
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-slate-600">Total</p>
          <p className="text-lg font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs text-slate-600">Verified</p>
          <p className="text-lg font-bold text-emerald-600">{stats.verified}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-slate-600">Pending</p>
          <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-xs text-slate-600">Photos</p>
          <p className="text-lg font-bold text-purple-600">{stats.photos}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by description, location, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Types</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
          <option value="note">Notes</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Proofs List */}
      <div className="space-y-4">
        {filteredProofs.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
            <Camera className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-600 font-medium">No proofs found</p>
            <p className="text-sm text-slate-500 mt-2">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first proof of impact'}
            </p>
            {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
              <Button icon={Camera} onClick={() => navigate('/dashboard/upload-proof')} className="mt-4">
                Upload Proof
              </Button>
            )}
          </div>
        ) : (
          filteredProofs.map((proof) => (
            <div key={proof.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 capitalize">{proof.proof_type}</h3>
                      {proof.project && (
                        <p className="text-sm text-slate-600 mt-1">{proof.project.title}</p>
                      )}
                    </div>
                    <StatusBadge status={proof.is_verified ? 'Verified' : 'Pending'} />
                  </div>

                  {proof.description && (
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{proof.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    {proof.location_name && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{proof.location_name}</span>
                      </div>
                    )}
                    {(proof.latitude && proof.longitude) && (
                      <span>
                        {parseFloat(proof.latitude).toFixed(4)}, {parseFloat(proof.longitude).toFixed(4)}
                      </span>
                    )}
                    <span>{new Date(proof.created_at).toLocaleDateString()}</span>
                    {proof.is_verified && proof.verifier && (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Verified by {proof.verifier.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {proof.file_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Download}
                      onClick={() => handleDownload(proof)}
                    >
                      Download
                    </Button>
                  )}
                  {!proof.is_verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDelete(proof.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyProofs;
