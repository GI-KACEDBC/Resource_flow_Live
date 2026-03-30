// ## Project Detail - View/edit NGO project + admin/auditor funding ceiling verification
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Send, ShieldCheck } from 'lucide-react';
import { projectApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

const formatGHC = (n) =>
  `GH₵${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminCeiling, setAdminCeiling] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [auditorCeiling, setAuditorCeiling] = useState('');
  const [auditorNotes, setAuditorNotes] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await projectApi.getById(Number(id));
      setProject(data);
      const est = data.estimated_total_value ?? data.target_amount ?? data.budget ?? 0;
      setAdminCeiling(est ? String(est) : '');
      setAuditorCeiling(data.verified_ceiling_ghs ? String(data.verified_ceiling_ghs) : '');
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!project?.id) return;
    try {
      await projectApi.submit(project.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit');
    }
  };

  const handleAdminVerify = async (e) => {
    e.preventDefault();
    if (!project?.id) return;
    const v = parseFloat(adminCeiling);
    if (!Number.isFinite(v) || v <= 0) {
      alert('Enter a verified funding ceiling in GH₵.');
      return;
    }
    setVerifyBusy(true);
    try {
      await projectApi.verifyFundingCeilingAdmin(project.id, {
        verified_ceiling_ghs: v,
        notes: adminNotes || undefined,
      });
      await load();
      setAdminNotes('');
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleAuditorVerify = async (e) => {
    e.preventDefault();
    if (!project?.id) return;
    setVerifyBusy(true);
    try {
      const payload = {};
      if (auditorCeiling) {
        const v = parseFloat(auditorCeiling);
        if (Number.isFinite(v) && v > 0) payload.verified_ceiling_ghs = v;
      }
      if (auditorNotes) payload.notes = auditorNotes;
      await projectApi.verifyFundingCeilingAuditor(project.id, payload);
      await load();
      setAuditorNotes('');
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifyBusy(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!project) return <div className="p-6">Project not found</div>;

  const target = parseFloat(project.target_amount ?? project.budget ?? project.estimated_total_value ?? 0);
  const raised = parseFloat(project.raised_amount ?? project.funded_amount ?? 0);
  const ceiling = project.verified_ceiling_ghs != null ? parseFloat(project.verified_ceiling_ghs) : null;
  const pct = ceiling && ceiling > 0 ? Math.min(100, (raised / ceiling) * 100) : target > 0 ? Math.min(100, (raised / target) * 100) : 0;

  const isAdmin = user?.role === 'admin';
  const isAuditor = user?.role === 'auditor';
  const dualDone = project.admin_verified_value_at && project.auditor_verified_value_at && ceiling != null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{project.title}</h2>
          <p className="text-slate-500 text-sm">{project.status}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <p className="text-slate-700">{project.description}</p>
        <p>
          <strong>Location:</strong> {project.location || '—'}
        </p>
        <p>
          <strong>Estimated total (NGO / budget):</strong> {formatGHC(target)}
        </p>
        {ceiling != null && (
          <p>
            <strong>Verified funding ceiling:</strong> {formatGHC(ceiling)}
          </p>
        )}
        <p>
          <strong>Raised (commitments + Paystack project funding):</strong> {formatGHC(raised)} ({pct.toFixed(0)}% of
          ceiling)
        </p>

        {project.project_budgets?.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-800 mb-2">Budget Breakdown</h3>
            <ul className="space-y-1 text-sm">
              {project.project_budgets.map((b, i) => (
                <li key={i}>
                  {b.item_name} ({b.category}): {formatGHC(b.total_cost ?? b.quantity * b.unit_cost)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 mt-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Funding ceiling verification
          </h3>
          <p className="text-sm text-slate-600 mb-3">
            Project funding (Paystack and CSR commitments) is blocked until an administrator and an auditor both
            confirm the total funding ceiling after reviewing project documents. This prevents perpetual uncapped
            fundraising.
          </p>
          <ul className="text-sm text-slate-700 space-y-1 mb-4">
            <li>
              <strong>Admin:</strong>{' '}
              {project.admin_verified_value_at
                ? `Verified ${new Date(project.admin_verified_value_at).toLocaleString()}`
                : 'Pending'}
            </li>
            <li>
              <strong>Auditor:</strong>{' '}
              {project.auditor_verified_value_at
                ? `Verified ${new Date(project.auditor_verified_value_at).toLocaleString()}`
                : 'Pending'}
            </li>
            <li>
              <strong>Ceiling active for funding:</strong> {dualDone ? 'Yes' : 'No'}
            </li>
          </ul>

          {isAdmin && !project.admin_verified_value_at && (
            <form onSubmit={handleAdminVerify} className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-800">Administrator: set verified ceiling (GHS)</p>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={adminCeiling}
                onChange={(e) => setAdminCeiling(e.target.value)}
                required
              />
              <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Notes (optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
              <Button type="submit" disabled={verifyBusy}>
                {verifyBusy ? 'Saving…' : 'Record admin verification'}
              </Button>
            </form>
          )}

          {isAuditor && project.admin_verified_value_at && !project.auditor_verified_value_at && (
            <form onSubmit={handleAuditorVerify} className="space-y-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-slate-800">Auditor: confirm ceiling</p>
              <p className="text-xs text-slate-600">
                Leave amount blank to accept the admin value ({formatGHC(project.verified_ceiling_ghs)}), or enter an
                adjusted ceiling.
              </p>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={auditorCeiling}
                onChange={(e) => setAuditorCeiling(e.target.value)}
                placeholder="Adjust ceiling (optional)"
              />
              <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Auditor notes (optional)"
                value={auditorNotes}
                onChange={(e) => setAuditorNotes(e.target.value)}
              />
              <Button type="submit" disabled={verifyBusy}>
                {verifyBusy ? 'Saving…' : 'Confirm auditor verification'}
              </Button>
            </form>
          )}
        </div>

        {project.status === 'draft' && (
          <Button icon={Send} onClick={handleSubmit}>
            Submit for Approval
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
