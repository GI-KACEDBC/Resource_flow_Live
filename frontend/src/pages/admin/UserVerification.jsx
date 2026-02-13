// ## User Verification View
// ## Admin interface for verifying users (Suppliers and Recipients)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, Search, Filter, FileText, ShieldCheck, Mail, Phone, MapPin, Ban, Unlock, Loader2, ExternalLink } from 'lucide-react';
import { userApi, verificationDocumentApi } from '../../services/api';
import { AMLModel } from '../../models/AMLModel';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

// Roles that require verification (exclude admin and staff)
const VERIFICATION_ROLES = ['supplier', 'recipient', 'donor', 'requestor', 'ngo', 'corporate'];

const UserVerification = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [viewedDocumentPreview, setViewedDocumentPreview] = useState(null); // { url, doc, mime }

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const users = await userApi.getAll();
        const verificationUsers = (Array.isArray(users) ? users : [])
          .filter((u) => VERIFICATION_ROLES.includes(u.role))
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role === 'donor' ? 'supplier' : u.role === 'requestor' ? 'recipient' : u.role,
            ghanaCard: u.ghana_card || null,
            businessReg: null,
            verificationStatus: u.is_verified ? 'Verified' : (u.verification_status === 'rejected' ? 'Rejected' : 'Pending'),
            is_blocked: u.is_blocked,
          }));
        setAllUsers(verificationUsers);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load users');
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ## Filter users based on search and filters
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.ghanaCard && user.ghanaCard.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || user.verificationStatus === statusFilter;
    
    const matchesRole = 
      roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // ## Get blocked users (combine API is_blocked with AMLModel for backward compat)
  const blockedUsers = AMLModel.getBlockedUsers();

  // ## Calculate statistics
  const stats = {
    total: allUsers.length,
    pending: allUsers.filter(u => u.verificationStatus === 'Pending').length,
    verified: allUsers.filter(u => u.verificationStatus === 'Verified').length,
    rejected: allUsers.filter(u => u.verificationStatus === 'Rejected').length,
    suppliers: allUsers.filter(u => u.role === 'supplier').length,
    recipients: allUsers.filter(u => u.role === 'recipient').length,
    blocked: allUsers.filter(u => u.is_blocked).length + blockedUsers.filter(u => u.status === 'blocked').length,
  };

  const refreshUsers = async () => {
    try {
      const users = await userApi.getAll();
      const verificationUsers = (Array.isArray(users) ? users : [])
        .filter((u) => VERIFICATION_ROLES.includes(u.role))
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role === 'donor' ? 'supplier' : u.role === 'requestor' ? 'recipient' : u.role,
          ghanaCard: u.ghana_card || null,
          businessReg: null,
          verificationStatus: u.is_verified ? 'Verified' : (u.verification_status === 'rejected' ? 'Rejected' : 'Pending'),
          is_blocked: u.is_blocked,
        }));
      setAllUsers(verificationUsers);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refresh');
    }
  };

  // ## Handle verify user
  const handleVerifyUser = async (userId) => {
    setActionLoading(userId);
    try {
      await userApi.update(userId, { is_verified: true, verification_status: 'verified' });
      await refreshUsers();
      setSelectedUser(null);
      alert('User verified successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  // ## Handle reject user
  const handleRejectUser = async (userId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    setActionLoading(userId);
    try {
      await userApi.update(userId, { is_verified: false, verification_status: 'rejected' });
      await refreshUsers();
      setSelectedUser(null);
      alert('User rejected.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  // ## Handle view user details
  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setUserDocuments([]);
  };

  // Clear document preview when modal closes
  useEffect(() => {
    if (!selectedUser) {
      setViewedDocumentPreview((prev) => {
        if (prev?.url) window.URL.revokeObjectURL(prev.url);
        return null;
      });
    }
  }, [selectedUser]);

  // Fetch user's verification documents when modal opens
  useEffect(() => {
    if (!selectedUser?.id) {
      setUserDocuments([]);
      return;
    }
    const fetchDocs = async () => {
      setDocsLoading(true);
      try {
        // Prefer backend filter; fallback to client-side with type-safe comparison
        const userId = Number(selectedUser.id);
        let list = await verificationDocumentApi.getAll({ user_id: userId });
        if (!Array.isArray(list)) list = [];
        // If backend didn't filter (e.g. empty), filter client-side with type coercion
        const filtered = list.filter((d) => Number(d.user_id) === userId);
        setUserDocuments(filtered);
      } catch (err) {
        console.error('Failed to load documents:', err);
        setUserDocuments([]);
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocs();
  }, [selectedUser?.id]);

  const handleViewDocument = async (doc) => {
    try {
      const blob = await verificationDocumentApi.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const mime = doc.mime_type || 'application/pdf';
      if (mime.startsWith('image/') || mime === 'application/pdf') {
        setViewedDocumentPreview({ url, doc, mime });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(err?.message || 'Failed to open document');
    }
  };

  const closeDocumentPreview = () => {
    if (viewedDocumentPreview?.url) {
      window.URL.revokeObjectURL(viewedDocumentPreview.url);
    }
    setViewedDocumentPreview(null);
  };

  // ## Check if user is blocked
  const isUserBlocked = (user) => {
    if (user?.is_blocked) return true;
    return AMLModel.isUserBlocked(user?.id);
  };

  // ## Handle block user
  const handleBlockUser = (user) => {
    setUserToBlock(user);
    setShowBlockModal(true);
  };

  // ## Confirm block user
  const confirmBlockUser = () => {
    if (!userToBlock || !blockReason.trim()) {
      alert('Please provide a reason for blocking');
      return;
    }

    AMLModel.blockUser(userToBlock.id, blockReason, 'admin-001');
    alert(`User ${userToBlock.name} has been blocked`);
    setShowBlockModal(false);
    setUserToBlock(null);
    setBlockReason('');
  };

  // ## Handle unblock user
  const handleUnblockUser = (userId) => {
    if (window.confirm('Are you sure you want to unblock this user?')) {
      AMLModel.unblockUser(userId);
      alert('User has been unblocked');
    }
  };

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      {/* ## Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">User Verification</h2>
        <p className="text-slate-500 mt-1">Review and verify user accounts for Suppliers and Recipients</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* ## Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Users</p>
          <p className="text-lg font-bold text-slate-900 mt-2">{stats.total}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Pending Review</p>
          <p className="text-lg font-bold text-amber-600 mt-2">{stats.pending}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Verified</p>
          <p className="text-lg font-bold text-emerald-600 mt-2">{stats.verified}</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Rejected</p>
          <p className="text-lg font-bold text-red-600 mt-2">{stats.rejected}</p>
        </div>
      </div>

      {/* Blocked Users Alert */}
      {stats.blocked > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ban className="text-red-600" size={20} />
              <div>
                <p className="font-semibold text-red-800">Blocked Users: {stats.blocked}</p>
                <p className="text-sm text-red-700">Some users have been blocked due to AML/KYC concerns</p>
              </div>
            </div>
            <Button
              variant="outline"
              icon={ShieldCheck}
              onClick={() => window.location.href = '/dashboard/aml-review'}
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              Review AML Flags
            </Button>
          </div>
        </div>
      )}

      {/* ## Role Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Suppliers</span>
            <span className="text-lg font-bold text-emerald-600">{stats.suppliers}</span>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Recipients</span>
            <span className="text-lg font-bold text-yellow-600">{stats.recipients}</span>
          </div>
        </div>
      </div>

      {/* ## Search and Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            label="Search Users"
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or Ghana Card..."
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">
            Verification Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="w-48">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">
            User Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="supplier">Suppliers</option>
            <option value="recipient">Recipients</option>
            <option value="ngo">NGOs</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
      </div>

      {/* ## Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={24} />
            Loading users...
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ghana Card
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Business Reg
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Mail size={12} />
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        user.role === 'supplier' ? 'bg-emerald-100 text-emerald-700' : user.role === 'recipient' ? 'bg-yellow-100 text-yellow-700' : user.role === 'ngo' ? 'bg-teal-100 text-teal-700' : user.role === 'corporate' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role === 'supplier' ? 'Supplier' : user.role === 'recipient' ? 'Recipient' : user.role === 'ngo' ? 'NGO' : user.role === 'corporate' ? 'Corporate' : user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-mono">{user.ghanaCard || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-mono">
                        {user.businessReg || (user.role === 'supplier' ? 'Not provided' : 'N/A')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={user.verificationStatus} />
                        {isUserBlocked(user) && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200 flex items-center gap-1">
                            <Ban size={12} />
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={FileText}
                          onClick={() => handleViewDetails(user)}
                          className="text-xs px-2 py-1"
                        >
                          View
                        </Button>
                        {isUserBlocked(user) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Unlock}
                            onClick={() => handleUnblockUser(user.id)}
                            className="text-xs px-2 py-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          >
                            Unblock
                          </Button>
                        ) : (
                          <>
                            {user.verificationStatus === 'Pending' && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={actionLoading === user.id ? Loader2 : CheckCircle}
                                  onClick={() => handleVerifyUser(user.id)}
                                  className="text-xs px-2 py-1"
                                  disabled={!!actionLoading}
                                >
                                  {actionLoading === user.id ? 'Verifying...' : 'Verify'}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  icon={actionLoading === user.id ? Loader2 : XCircle}
                                  onClick={() => handleRejectUser(user.id)}
                                  className="text-xs px-2 py-1"
                                  disabled={!!actionLoading}
                                >
                                  {actionLoading === user.id ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Ban}
                              onClick={() => handleBlockUser(user)}
                              className="text-xs px-2 py-1 border-red-500 text-red-600 hover:bg-red-50"
                            >
                              Block
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* ## User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-bold text-slate-800">User Details</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-6">
              {/* ## Basic Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Users size={18} />
                  Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Full Name</p>
                    <p className="text-sm font-medium text-slate-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                      <Mail size={14} />
                      {selectedUser.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Role</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedUser.role === 'supplier' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedUser.role === 'supplier' ? 'Supplier' : 'Recipient'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Verification Status</p>
                    <StatusBadge status={selectedUser.verificationStatus} />
                  </div>
                </div>
              </div>

              {/* ## Identification */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} />
                  Identification
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ghana Card Number</p>
                    <p className="text-sm font-medium text-slate-900 font-mono">{selectedUser.ghanaCard || 'Not provided'}</p>
                  </div>
                  {selectedUser.role === 'supplier' && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Business Registration</p>
                      <p className="text-sm font-medium text-slate-900 font-mono">{selectedUser.businessReg || 'Not provided'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ## Uploaded Documents */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Uploaded Documents
                </h4>
                {docsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-slate-500">
                    <Loader2 className="animate-spin" size={18} />
                    Loading documents...
                  </div>
                ) : userDocuments.length === 0 ? (
                  <div className="py-4 space-y-2">
                    <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        navigate('/dashboard/verification-center');
                      }}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                    >
                      Check Verification Center for all uploads →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white rounded border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="text-slate-400 shrink-0" size={16} />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-slate-700 block truncate">
                              {doc.document_type || doc.file_name || 'Document'}
                            </span>
                            {doc.file_name && (
                              <span className="text-xs text-slate-500 truncate block">{doc.file_name}</span>
                            )}
                            {doc.verification_status && (
                              <span className="inline-block mt-1">
                                <StatusBadge status={doc.verification_status} />
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={ExternalLink}
                          onClick={() => handleViewDocument(doc)}
                          className="shrink-0"
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ## Document Preview (inline, below Uploaded Documents) */}
              {viewedDocumentPreview && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-800">
                      {viewedDocumentPreview.doc.document_type || viewedDocumentPreview.doc.file_name || 'Document'}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeDocumentPreview}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="bg-white rounded border border-slate-200 overflow-hidden max-h-96 flex justify-center">
                    {viewedDocumentPreview.mime.startsWith('image/') ? (
                      <img
                        src={viewedDocumentPreview.url}
                        alt={viewedDocumentPreview.doc.file_name || 'Document'}
                        className="max-w-full max-h-96 object-contain"
                      />
                    ) : (
                      <iframe
                        src={viewedDocumentPreview.url}
                        title={viewedDocumentPreview.doc.file_name || 'Document'}
                        className="w-full h-96 border-0"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ## Action Buttons */}
              <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
                {selectedUser.verificationStatus === 'Pending' && (
                  <>
                    <Button
                      variant="outline"
                      icon={XCircle}
                      onClick={() => {
                        handleRejectUser(selectedUser.id);
                        setSelectedUser(null);
                      }}
                    >
                      Reject User
                    </Button>
                    <Button
                      variant="primary"
                      icon={CheckCircle}
                      onClick={() => {
                        handleVerifyUser(selectedUser.id);
                        setSelectedUser(null);
                      }}
                    >
                      Verify User
                    </Button>
                  </>
                )}
                {!isUserBlocked(selectedUser) ? (
                  <Button
                    variant="outline"
                    icon={Ban}
                    onClick={() => {
                      handleBlockUser(selectedUser);
                      setSelectedUser(null);
                    }}
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    Block User
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    icon={Unlock}
                    onClick={() => {
                      handleUnblockUser(selectedUser.id);
                      setSelectedUser(null);
                    }}
                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  >
                    Unblock User
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Block User</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {userToBlock?.name} ({userToBlock?.email})
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowBlockModal(false)}>
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Reason for Blocking *
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Provide a detailed reason for blocking this user (e.g., AML concerns, suspicious activity, KYC failure)..."
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Blocking a user will prevent them from making any transactions
                  or accessing the platform. This action can be reversed later.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowBlockModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  icon={Ban}
                  onClick={confirmBlockUser}
                  disabled={!blockReason.trim()}
                >
                  Block User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerification;
