// ## Admin Audit Review Modal
// ## Review request details, recipient info, and attachments before approving
import React, { useState, useEffect } from 'react';
import { X, FileText, Download, User, MapPin, Package, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { requestApi, verificationDocumentApi } from '../../services/api';

const AuditReviewModal = ({ isOpen, onClose, request, onApproved }) => {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [approving, setApproving] = useState(false);

  const recipient = request?.user;
  const recipientId = recipient?.id ?? request?.user_id;

  useEffect(() => {
    if (!isOpen || !recipientId) return;
    setLoadingDocs(true);
    verificationDocumentApi
      .getAll({ user_id: recipientId })
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]))
      .finally(() => setLoadingDocs(false));
  }, [isOpen, recipientId]);

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
    } catch (err) {
      alert(err?.message || 'Failed to download document.');
    }
  };

  const handleApprove = async () => {
    if (!request?.id) return;
    try {
      setApproving(true);
      await requestApi.audit(request.id);
      onApproved?.();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const supportingDocs = request?.supporting_documents ?? [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">Review & Approve Request</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Request Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Package size={16} />
              Request Details
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium text-slate-900">{request?.title}</p>
              <p className="text-slate-600">{request?.description}</p>
              <div className="flex flex-wrap gap-4 pt-2">
                {request?.region && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin size={14} />
                    {request.region}
                  </span>
                )}
                {request?.aid_type && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {request.aid_type}
                  </span>
                )}
                {request?.urgency_level && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    Urgency: {request.urgency_level}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recipient Info */}
          {recipient && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User size={16} />
                Recipient
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-slate-900">{recipient.name}</p>
                {recipient.email && <p className="text-slate-600">{recipient.email}</p>}
                {recipient.phone && <p className="text-slate-600">{recipient.phone}</p>}
              </div>
            </div>
          )}

          {/* Verification Documents (Ghana Card, etc.) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Recipient Documents
            </h3>
            {loadingDocs ? (
              <div className="flex items-center gap-2 py-4 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 bg-slate-50 rounded-lg px-4">
                No verification documents on file for this recipient.
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{doc.document_type}</p>
                        <p className="text-xs text-slate-500">{doc.file_name}</p>
                        {doc.verification_status && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                              doc.verification_status === 'Verified'
                                ? 'bg-emerald-100 text-emerald-700'
                                : doc.verification_status === 'Rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {doc.verification_status}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Download}
                      onClick={() => handleDownload(doc)}
                      className="text-xs"
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supporting Documents (request attachments) */}
          {supportingDocs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Request Attachments</h3>
              <div className="space-y-2">
                {supportingDocs.map((path, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-slate-400" />
                      <p className="text-sm text-slate-700">{path || `Attachment ${i + 1}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={approving}
            icon={approving ? Loader2 : ShieldCheck}
            className={`bg-emerald-600 hover:bg-emerald-700 ${approving ? '[&_svg]:animate-spin' : ''}`}
          >
            {approving ? 'Approving...' : 'Approve Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditReviewModal;
