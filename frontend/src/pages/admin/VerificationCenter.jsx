// ## Verification Center View
// ## Admin interface for reviewing VerificationDocument uploads
import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Download, Search, Filter, User, Calendar, Upload } from 'lucide-react';
import { verificationDocumentApi } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const VerificationCenter = () => {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await verificationDocumentApi.getAll();
      // Ensure documents is always an array
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // ## Auto-refresh when documents are uploaded or verified
  useAutoRefresh(loadDocuments, ['verification'], []);

  // Ensure documents is an array before filtering
  const filteredDocuments = Array.isArray(documents) ? documents.filter((doc) => {
    const matchesSearch = 
      (doc.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.document_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || doc.verification_status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) : [];


  const handleDownload = async (doc) => {
    try {
      const blob = await verificationDocumentApi.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      const message = error?.message || 'Failed to download document. Please try again.';
      alert(message);
    }
  };

  const handleVerify = async (doc, status, reason) => {
    try {
      await verificationDocumentApi.verify(doc.id, {
        verification_status: status,
        rejection_reason: status === 'Rejected' ? reason : undefined,
      });
      // Set flag to trigger refresh in other dashboards
      localStorage.setItem('verification_created', Date.now().toString());
      await loadDocuments();
      setSelectedDocument(null);
      setVerificationStatus('');
      setRejectionReason('');
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Failed to verify document. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleTimestamps = (doc) => {
    const labels = [
      { key: 'requester_submitted_at', label: 'Requester Submitted' },
      { key: 'field_agent_verified_at', label: 'Field Agent Verified' },
      { key: 'admin_reviewed_at', label: 'Admin Reviewed' },
      { key: 'supplier_uploaded_at', label: 'Supplier Uploaded' },
    ];
    return labels
      .filter(({ key }) => doc[key])
      .map(({ key, label }) => ({ label, date: doc[key] }));
  };

  const formatRoleTimestamps = (doc) => {
    const timestamps = getRoleTimestamps(doc);
    if (timestamps.length === 0) return formatDate(doc.created_at);
    return timestamps.map(({ label, date }) => `${label}: ${formatDate(date)}`).join(' · ');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-400 animate-pulse mb-4" />
          <p className="text-slate-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">Verification Center</h2>
        <p className="text-slate-600 mt-1">Review and verify user documents (Ghana Cards, Business Registration, etc.)</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Documents</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{Array.isArray(documents) ? documents.length : 0}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {Array.isArray(documents) ? documents.filter(d => d && d.verification_status === 'Pending').length : 0}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Verified</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {Array.isArray(documents) ? documents.filter(d => d && d.verification_status === 'Verified').length : 0}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Rejected</p>
          <p className="text-xl font-bold text-red-600 mt-1">
            {Array.isArray(documents) ? documents.filter(d => d && d.verification_status === 'Rejected').length : 0}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name or document type..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
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
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Document Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Ghana Card">Ghana Card</option>
              <option value="Business Registration">Business Registration</option>
              <option value="Tax Certificate">Tax Certificate</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No documents found</p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{doc.document_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{doc.user_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{formatFileSize(doc.file_size || 0)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.verification_status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600" title={formatRoleTimestamps(doc)}>
                        {formatRoleTimestamps(doc)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Download}
                          onClick={() => handleDownload(doc)}
                          className="text-xs px-2 py-1"
                        >
                          Download
                        </Button>
                        {doc.verification_status === 'Pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={CheckCircle}
                              onClick={() => handleVerify(doc, 'Verified')}
                              className="text-xs px-2 py-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={XCircle}
                              onClick={() => setSelectedDocument(doc)}
                              className="text-xs px-2 py-1 border-red-500 text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          icon={FileText}
                          onClick={() => setSelectedDocument(doc)}
                          className="text-xs px-2 py-1"
                        >
                          Review
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Review Document</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedDocument.file_name}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDocument(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-4">
              {selectedDocument.document_type === 'Ghana Card' && selectedDocument.qoreid_photo && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">NIA Official Photo (from Ghana Card verification)</p>
                  <p className="text-xs text-slate-500 mb-2">Compare with uploaded document to confirm identity match</p>
                  <img
                    src={selectedDocument.qoreid_photo.startsWith('data:') ? selectedDocument.qoreid_photo : `data:image/jpeg;base64,${selectedDocument.qoreid_photo}`}
                    alt="NIA Ghana Card photo"
                    className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                  />
                  {selectedDocument.qoreid_request_id && (
                    <p className="text-xs text-slate-500 mt-2">QoreID Request: {selectedDocument.qoreid_request_id}</p>
                  )}
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Document Type</p>
                    <p className="font-medium text-slate-900">{selectedDocument.document_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">User ID</p>
                    <p className="font-medium text-slate-900">{selectedDocument.user_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">File Size</p>
                    <p className="font-medium text-slate-900">{formatFileSize(selectedDocument.file_size || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Dates</p>
                    <div className="space-y-1 mt-1">
                      {getRoleTimestamps(selectedDocument).length > 0 ? (
                        getRoleTimestamps(selectedDocument).map(({ label, date }) => (
                          <p key={label} className="font-medium text-slate-900 text-sm">
                            {label}: {formatDate(date)}
                          </p>
                        ))
                      ) : (
                        <p className="font-medium text-slate-900">Uploaded: {formatDate(selectedDocument.created_at)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={() => handleDownload(selectedDocument)}
                  className="w-full"
                >
                  Download Document
                </Button>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Verification Decision *</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Decision --</option>
                  <option value="Verified">Verify Document</option>
                  <option value="Rejected">Reject Document</option>
                </select>
              </div>

              {verificationStatus === 'Rejected' && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Rejection Reason *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Provide a reason for rejection..."
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => {
                  setSelectedDocument(null);
                  setVerificationStatus('');
                  setRejectionReason('');
                }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon={verificationStatus === 'Verified' ? CheckCircle : XCircle}
                  onClick={() => {
                    if (!verificationStatus) return;
                    handleVerify(selectedDocument, verificationStatus, rejectionReason);
                  }}
                  disabled={!verificationStatus || (verificationStatus === 'Rejected' && !rejectionReason.trim())}
                >
                  Submit Decision
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationCenter;
