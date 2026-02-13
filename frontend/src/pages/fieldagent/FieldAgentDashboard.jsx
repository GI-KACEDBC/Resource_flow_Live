// ## Field Agent Dashboard
// ## Mobile-first interface for field agents to track their impact proof uploads
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, MapPin, CheckCircle, Clock, Package, TrendingUp, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { impactProofApi, projectApi } from '../../services/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const FieldAgentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proofs, setProofs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [proofsData, projectsData] = await Promise.all([
        impactProofApi.getAll().catch(() => []),
        impactProofApi.getActiveProjects().catch(() => []),
      ]);
      setProofs(Array.isArray(proofsData) ? proofsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
      setProofs([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh when proofs are uploaded
  useAutoRefresh(loadData, ['impact_proof'], []);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalProofs = proofs.length;
    const verified = proofs.filter(p => p.is_verified).length;
    const pending = proofs.filter(p => !p.is_verified).length;
    const photos = proofs.filter(p => p.proof_type === 'photo').length;
    const videos = proofs.filter(p => p.proof_type === 'video').length;
    const documents = proofs.filter(p => p.proof_type === 'document').length;
    const notes = proofs.filter(p => p.proof_type === 'note').length;

    return {
      totalProofs,
      verified,
      pending,
      photos,
      videos,
      documents,
      notes,
    };
  }, [proofs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <AlertCircle className="text-red-500" size={32} />
        <span className="ml-3 text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Field Agent Dashboard</h2>
          <p className="text-slate-500 mt-1">Track your impact proof uploads</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/dashboard/upload-proof')} size="sm">
          Upload Proof
        </Button>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-700">Total Proofs</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalProofs}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-700">Verified</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.verified}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-700">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-700">Active Projects</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{projects.length}</p>
        </div>
      </div>

      {/* Proof Type Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600">Photos</p>
          <p className="text-base font-bold text-slate-900">{stats.photos}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600">Videos</p>
          <p className="text-base font-bold text-slate-900">{stats.videos}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600">Documents</p>
          <p className="text-base font-bold text-slate-900">{stats.documents}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600">Notes</p>
          <p className="text-base font-bold text-slate-900">{stats.notes}</p>
        </div>
      </div>

      {/* Active Projects */}
      {projects.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-3">Active Projects</h3>
          <div className="space-y-3">
            {projects.slice(0, 3).map((project) => {
              const projectProofs = proofs.filter(p => p.project_id === project.id);
              return (
                <div key={project.id} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{project.title}</h4>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{project.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>{project.location || 'No location'}</span>
                        <span>•</span>
                        <span>{projectProofs.length} proof{projectProofs.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard/upload-proof?project=${project.id}`)}
                      className="ml-3"
                    >
                      Add Proof
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Proofs */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-slate-800">Recent Proofs</h3>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/proofs')}>
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {proofs.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <Camera className="mx-auto text-slate-400 mb-3" size={32} />
              <p className="text-slate-600 font-medium">No proofs uploaded yet</p>
              <p className="text-sm text-slate-500 mt-2">Start uploading proof of impact for active projects</p>
              <Button icon={Plus} onClick={() => navigate('/dashboard/upload-proof')} className="mt-4">
                Upload Your First Proof
              </Button>
            </div>
          ) : (
            proofs.slice(0, 5).map((proof) => (
              <div key={proof.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-slate-900 capitalize">{proof.proof_type}</h4>
                      <StatusBadge status={proof.is_verified ? 'Verified' : 'Pending'} />
                    </div>
                    {proof.project && (
                      <p className="text-sm text-slate-600 mb-1">{proof.project.title}</p>
                    )}
                    {proof.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{proof.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {proof.location_name && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{proof.location_name}</span>
                        </div>
                      )}
                      <span>{new Date(proof.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldAgentDashboard;
