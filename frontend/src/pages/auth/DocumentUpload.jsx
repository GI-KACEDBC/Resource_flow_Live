import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FileUpload } from '../../components/ui/FileUpload';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import GhanaCardVerificationBanner from '../../components/verification/GhanaCardVerificationBanner';
import { ghanaCardApi, verificationDocumentApi } from '../../services/api';

const DocumentUpload = () => {
  const { user, role, isVerified } = useAuth();
  const navigate = useNavigate();
  const [ghanaCardFile, setGhanaCardFile] = useState(null);
  const [businessRegFile, setBusinessRegFile] = useState(null);
  const [ghanaCardNumber, setGhanaCardNumber] = useState(user?.ghanaCard || '');
  const [businessRegNumber, setBusinessRegNumber] = useState(
    user?.businessReg || ''
  );
  const [consentGiven, setConsentGiven] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isSupplier = role === 'supplier';

  const getNameParts = () => {
    const name = (user?.name || '').trim();
    const parts = name ? name.split(/\s+/).filter(Boolean) : [];
    return {
      firstname: parts[0] || '',
      lastname: parts.slice(1).join(' ') || parts[0] || '',
    };
  };

  const handleVerifyGhanaCard = async () => {
    if (!ghanaCardNumber?.trim()) {
      setVerificationResult({ type: 'error', message: 'Please enter your Ghana Card number first.' });
      return;
    }
    const { firstname, lastname } = getNameParts();
    if (!firstname || !lastname) {
      setVerificationResult({ type: 'error', message: 'Your profile name is required for verification. Please update your profile with your legal first and last name.' });
      return;
    }
    if (!consentGiven) {
      setVerificationResult({ type: 'error', message: 'Please confirm your consent for Ghana Card verification.' });
      return;
    }
    setVerifying(true);
    setVerificationResult(null);
    try {
      const result = await ghanaCardApi.verify({
        id_number: ghanaCardNumber.trim(),
        firstname,
        lastname,
        consent_given: true,
      });
      if (result.verified) {
        setVerificationResult({ type: 'verified', message: 'Ghana Card verified successfully. You may proceed to upload your document.' });
      } else if (result.name_mismatch) {
        setVerificationResult({ type: 'name_mismatch', message: result.error || 'The name on your Ghana Card does not match your profile name.' });
      } else if (result.error_code === 'INVALID_FORMAT' || result.error_code === 'NOT_FOUND') {
        setVerificationResult({ type: 'invalid_id', message: result.error || 'Invalid Ghana Card or not found in NIA database.' });
      } else {
        setVerificationResult({ type: 'error', message: result.error || 'Verification failed. Please try again.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please try again.';
      setVerificationResult({ type: 'error', message: msg });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent default HTML5 validation for hidden file inputs
    e.stopPropagation();
    
    setSubmitting(true);

    // Validate required documents
    if (!ghanaCardFile) {
      alert('Please upload your Ghana Card document.');
      setSubmitting(false);
      return;
    }

    if (!ghanaCardNumber) {
      alert('Please provide your Ghana Card number.');
      setSubmitting(false);
      return;
    }

    if (!consentGiven) {
      alert('Please confirm your consent for Ghana Card verification (required under Ghana Data Protection Act).');
      setSubmitting(false);
      return;
    }

    if (isSupplier && !businessRegFile) {
      alert('Please upload your Business Registration document.');
      setSubmitting(false);
      return;
    }

    if (isSupplier && !businessRegNumber) {
      alert('Please provide your Business Registration number.');
      setSubmitting(false);
      return;
    }

    try {
      const { firstname, lastname } = getNameParts();
      if (ghanaCardFile) {
        await verificationDocumentApi.upload(
          ghanaCardFile,
          'Ghana Card',
          ghanaCardNumber,
          { firstname, lastname, consent_given: true }
        );
      }

      if (isSupplier && businessRegFile) {
        await verificationDocumentApi.upload(
          businessRegFile,
          'Business Registration',
          businessRegNumber
        );
      }

      setSuccess(true);
      setTimeout(() => {
        // Set flag to trigger refresh in VerificationCenter
        localStorage.setItem('verification_created', Date.now().toString());
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error uploading documents:', error);
      const errData = error.response?.data;
      if (errData?.error_code === 'NAME_MISMATCH') {
        setVerificationResult({ type: 'name_mismatch', message: errData.message || 'The name on your Ghana Card does not match.' });
      } else if (errData?.error_code === 'INVALID_FORMAT' || errData?.error_code === 'NOT_FOUND') {
        setVerificationResult({ type: 'invalid_id', message: errData.message || 'Invalid Ghana Card or not found.' });
      } else {
        setVerificationResult({ type: 'error', message: errData?.message || 'Failed to upload documents. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white min-h-screen">
      <Button
        variant="outline"
        icon={ArrowLeft}
        onClick={() => navigate('/dashboard')}
        className="mb-6"
      >
        Back to Dashboard
      </Button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <ShieldCheck className="text-emerald-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Upload Verification Documents</h2>
            <p className="text-slate-500 text-sm mt-1">
              Submit your identification documents for account verification
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-slate-600">Account Status:</span>
          <StatusBadge status={isVerified ? 'Verified' : 'Pending'} />
          {!isVerified && (
            <span className="text-xs text-amber-600">
              Your account is pending verification. Upload documents to complete verification.
            </span>
          )}
        </div>

        {success ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Documents Submitted Successfully!
            </h3>
            <p className="text-slate-600 mb-6">
              Your documents have been uploaded and are under review. You will be notified once
              your account is verified.
            </p>
            <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Ghana Card Section */}
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="text-blue-600" size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Ghana Card</h3>
                <span className="text-xs text-red-500 ml-2">Required</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-2 block">
                    Ghana Card Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ghanaCardNumber}
                      onChange={(e) => {
                        setGhanaCardNumber(e.target.value);
                        setVerificationResult(null);
                      }}
                      placeholder="GHA-000000000-0"
                      className="flex-1 border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyGhanaCard}
                      disabled={verifying || !ghanaCardNumber?.trim()}
                      icon={verifying ? Loader2 : ShieldCheck}
                      className="shrink-0"
                    >
                      {verifying ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Format: GHA-XXXXXXXXX-X (e.g. GHA-700000000-0)</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600">
                    I consent to the verification of my Ghana Card against the National Identification Authority (NIA) database, as required under the Ghana Data Protection Act.
                  </span>
                </label>

                {verificationResult && (
                  <GhanaCardVerificationBanner
                    type={verificationResult.type}
                    message={verificationResult.message}
                    onDismiss={() => setVerificationResult(null)}
                  />
                )}

                <FileUpload
                  label="Ghana Card Document"
                  name="ghanaCardFile"
                  accept="image/*,.pdf"
                  required
                  value={ghanaCardFile}
                  onChange={setGhanaCardFile}
                  maxSizeMB={5}
                  description="Upload a clear photo or scan of your Ghana Card. Include both sides if applicable."
                />
              </div>
            </div>

            {/* Business Registration Section (Supplier Only) */}
            {isSupplier && (
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="text-purple-600" size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Business Registration
                  </h3>
                  <span className="text-xs text-red-500 ml-2">Required</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Business Registration Number
                    </label>
                    <input
                      type="text"
                      value={businessRegNumber}
                      onChange={(e) => setBusinessRegNumber(e.target.value)}
                      placeholder="BN-2024-0000"
                      className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      // Validation handled in handleSubmit
                    />
                  </div>

                  <FileUpload
                    label="Business Registration Certificate"
                    name="businessRegFile"
                    accept="image/*,.pdf"
                    required={false}
                    value={businessRegFile}
                    onChange={setBusinessRegFile}
                    maxSizeMB={5}
                    description="Upload a clear copy of your Business Registration Certificate issued by the Registrar General's Department."
                  />
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-2">Document Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700">
                    <li>Documents must be clear and legible</li>
                    <li>Accepted formats: JPG, PNG, PDF (max 5MB each)</li>
                    <li>Ensure all text and numbers are visible</li>
                    <li>Documents will be reviewed within 24-48 hours</li>
                    <li>You will receive a notification once verification is complete</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting}
                icon={submitting ? undefined : ShieldCheck}
              >
                {submitting ? 'Uploading Documents...' : 'Submit Documents for Verification'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
