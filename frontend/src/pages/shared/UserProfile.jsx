// ## User Profile Component
// ## Displays user information with all relationships (donations, verification status, allocations)
import React, { useState, useEffect } from 'react';
import { User, Package, ShieldCheck, CheckCircle, Clock, FileText, TrendingUp, MapPin, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authApi, donationApi, verificationDocumentApi, allocationApi, vulnerabilityScoreApi } from '../../services/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatGHC } from '../../utils/currency';

const UserProfile = () => {
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [vulnerabilityScore, setVulnerabilityScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePwdCurrent, setChangePwdCurrent] = useState('');
  const [changePwdNew, setChangePwdNew] = useState('');
  const [changePwdConfirm, setChangePwdConfirm] = useState('');
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState(false);

  useEffect(() => {
    if (authUser) {
      loadUserData();
    }
  }, [authUser]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userInfo, donationsData, documentsData, allocationsData, scoreData] = await Promise.all([
        authApi.getMe(),
        donationApi.getAll({ user_id: authUser.id }),
        verificationDocumentApi.getAll({ user_id: authUser.id }),
        allocationApi.getAll(),
        vulnerabilityScoreApi.getByUser(authUser.id).catch(() => null),
      ]);

      setUserData(userInfo);
      setDonations(donationsData);
      setDocuments(documentsData);
      setAllocations(allocationsData.filter(a => a.request?.user?.id === authUser.id));
      setVulnerabilityScore(scoreData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatus = () => {
    const verifiedDocs = documents.filter(d => d.verification_status === 'Verified');
    const pendingDocs = documents.filter(d => d.verification_status === 'Pending');
    const rejectedDocs = documents.filter(d => d.verification_status === 'Rejected');

    if (verifiedDocs.length > 0 && pendingDocs.length === 0 && rejectedDocs.length === 0) {
      return { status: 'Verified', color: 'bg-emerald-100 text-emerald-700' };
    } else if (pendingDocs.length > 0) {
      return { status: 'Pending', color: 'bg-amber-100 text-amber-700' };
    } else if (rejectedDocs.length > 0) {
      return { status: 'Rejected', color: 'bg-red-100 text-red-700' };
    }
    return { status: 'Not Submitted', color: 'bg-slate-100 text-slate-700' };
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const verificationStatus = getVerificationStatus();

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
        <p className="text-slate-600 mt-1">View your account information and activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="text-emerald-600" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{userData?.name || authUser?.name}</h3>
                <p className="text-sm text-slate-500">{userData?.email || authUser?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-sm font-semibold text-slate-800 capitalize">{userData?.role || authUser?.role}</p>
              </div>
              {userData?.organization && (
                <div>
                  <p className="text-xs text-slate-500">Organization</p>
                  <p className="text-sm font-semibold text-slate-800">{userData.organization}</p>
                </div>
              )}
              {userData?.phone && (
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-semibold text-slate-800">{userData.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Lock size={18} />
              Password
            </h4>
            <p className="text-xs text-slate-500 mb-3">Passwords expire every 30 days. Change yours to stay secure.</p>
            {!showChangePassword ? (
              <button
                onClick={() => setShowChangePassword(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setChangePwdError('');
                if (changePwdNew !== changePwdConfirm) {
                  setChangePwdError('New passwords do not match.');
                  return;
                }
                if (changePwdNew.length < 8) {
                  setChangePwdError('New password must be at least 8 characters.');
                  return;
                }
                try {
                  await authApi.changePassword({
                    current_password: changePwdCurrent,
                    password: changePwdNew,
                    password_confirmation: changePwdConfirm,
                  });
                  setChangePwdSuccess(true);
                  setChangePwdCurrent('');
                  setChangePwdNew('');
                  setChangePwdConfirm('');
                  setTimeout(() => {
                    setShowChangePassword(false);
                    setChangePwdSuccess(false);
                  }, 2000);
                } catch (err) {
                  setChangePwdError(err.response?.data?.message || err.response?.data?.errors?.current_password?.[0] || 'Failed to change password.');
                }
              }} className="space-y-3">
                <input
                  type="password"
                  value={changePwdCurrent}
                  onChange={(e) => setChangePwdCurrent(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3 py-2 border rounded-lg border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <input
                  type="password"
                  value={changePwdNew}
                  onChange={(e) => setChangePwdNew(e.target.value)}
                  placeholder="New password (min 8 chars)"
                  className="w-full px-3 py-2 border rounded-lg border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  minLength={8}
                />
                <input
                  type="password"
                  value={changePwdConfirm}
                  onChange={(e) => setChangePwdConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border rounded-lg border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  minLength={8}
                />
                {changePwdError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle size={16} />
                    <span>{changePwdError}</span>
                  </div>
                )}
                {changePwdSuccess && (
                  <p className="text-sm text-emerald-600 font-medium">Password changed successfully.</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setChangePwdError('');
                      setChangePwdCurrent('');
                      setChangePwdNew('');
                      setChangePwdConfirm('');
                    }}
                    className="px-3 py-1.5 text-slate-600 text-sm hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Verification Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <ShieldCheck size={18} />
              Verification Status
            </h4>
            <div className={`p-3 rounded-lg ${verificationStatus.color}`}>
              <p className="font-semibold">{verificationStatus.status}</p>
            </div>
            {documents.length > 0 && (
              <div className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{doc.document_type}</span>
                    <StatusBadge status={doc.verification_status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vulnerability Score */}
          {vulnerabilityScore && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Vulnerability Score
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Overall Score</span>
                    <span className="text-base font-bold text-emerald-600">
                      {vulnerabilityScore.overall_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${Math.min(vulnerabilityScore.overall_score, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Economic</p>
                    <p className="font-semibold">{vulnerabilityScore.economic_score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Social</p>
                    <p className="font-semibold">{vulnerabilityScore.social_score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Health</p>
                    <p className="font-semibold">{vulnerabilityScore.health_score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Geographic</p>
                    <p className="font-semibold">{vulnerabilityScore.geographic_score.toFixed(1)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    vulnerabilityScore.priority_level === 'Critical' ? 'bg-red-100 text-red-700' :
                    vulnerabilityScore.priority_level === 'High' ? 'bg-orange-100 text-orange-700' :
                    vulnerabilityScore.priority_level === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {vulnerabilityScore.priority_level} Priority
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Donations */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Package size={18} />
              My Donations ({donations.length})
            </h4>
            {donations.length === 0 ? (
              <p className="text-sm text-slate-500">No donations yet</p>
            ) : (
              <div className="space-y-3">
                {donations.slice(0, 5).map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-800">{donation.item}</p>
                      <p className="text-sm text-slate-600">
                        {donation.quantity} {donation.unit} • {donation.type}
                      </p>
                    </div>
                    <StatusBadge status={donation.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allocations */}
          {allocations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle size={18} />
                Allocations Received ({allocations.length})
              </h4>
              <div className="space-y-3">
                {allocations.slice(0, 5).map((allocation) => (
                  <div key={allocation.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {allocation.request?.title || 'Request'}
                      </p>
                      <p className="text-sm text-slate-600">
                        {allocation.quantity_allocated} {allocation.donation?.unit || 'units'}
                      </p>
                    </div>
                    <StatusBadge status={allocation.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
