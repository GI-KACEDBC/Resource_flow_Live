import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/FileUpload';
import { ShieldCheck, FileText, Loader2, Camera } from 'lucide-react';
import GhanaCardVerificationBanner from '../../components/verification/GhanaCardVerificationBanner';
import GhanaCardCapture from '../../components/verification/GhanaCardCapture';
import { authApi, ghanaCardApi, verificationDocumentApi } from '../../services/api';

const Register = () => {
  const [role, setRole] = useState('donor_individual');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    organization: '',
    phone: '',
    ghanaCard: '',
    businessReg: '',
    address: '',
  });
  const [ghanaCardFile, setGhanaCardFile] = useState(null);
  const [businessRegFile, setBusinessRegFile] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [useCapture, setUseCapture] = useState(false);
  const [ghanaCardVerifiedViaCapture, setGhanaCardVerifiedViaCapture] = useState(false);
  const [captureVerificationResult, setCaptureVerificationResult] = useState(null);
  const [skipVerification, setSkipVerification] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleVerifyGhanaCard = async () => {
    if (!formData.ghanaCard?.trim()) {
      setVerificationResult({ type: 'error', message: 'Please enter your Ghana Card number first.' });
      return;
    }
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setVerificationResult({ type: 'error', message: 'Please enter your first and last name.' });
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
        id_number: formData.ghanaCard.trim(),
        firstname: formData.firstName.trim(),
        lastname: formData.lastName.trim(),
        consent_given: true,
      });
      if (result.verified) {
        setVerificationResult({ type: 'verified', message: 'Ghana Card verified successfully. You may proceed to upload your document.' });
      } else if (result.name_mismatch) {
        setVerificationResult({ type: 'name_mismatch', message: result.error || 'The name on your Ghana Card does not match the name you provided.' });
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
    e.stopPropagation();

    if (role !== 'angel_donor' && !skipVerification) {
      if (!ghanaCardVerifiedViaCapture && !ghanaCardFile) {
        alert('Please upload your Ghana Card document or complete the camera capture verification. Or click "Continue without verification" below to complete registration and verify later.');
        return;
      }
      if (!ghanaCardVerifiedViaCapture && !formData.ghanaCard?.trim()) {
        alert('Please provide your Ghana Card number.');
        return;
      }
      if (!consentGiven) {
        alert('Please confirm your consent for Ghana Card verification (required under Ghana Data Protection Act).');
        return;
      }
    }
    if (role === 'ngo' && !formData.organization?.trim()) {
      alert('Please enter your NGO / Organization name.');
      return;
    }
    if (role === 'ngo' && !skipVerification && !businessRegFile) {
      alert('Please upload your NGO Registration (RG) document. Or click "Continue without verification" to complete registration and upload later.');
      return;
    }
    if (role === 'donor_institution' && !formData.organization?.trim()) {
      alert('Please enter your organization / company name.');
      return;
    }
    if (formData.password !== formData.passwordConfirmation) {
      alert('Password and confirmation do not match.');
      return;
    }
    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const registerData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
        role,
        organization: formData.organization || '',
        phone: formData.phone || '',
      };

      const registerResult = await authApi.register(registerData);
      authApi.setToken(registerResult.token);
      if (registerResult.token) {
        localStorage.setItem('auth_token', registerResult.token);
      }

      if (role !== 'angel_donor' && !skipVerification && ghanaCardVerifiedViaCapture && captureVerificationResult) {
        await ghanaCardApi.storeQoreIdResult({
          customer_reference: captureVerificationResult.request_id || `reg_${Date.now()}`,
          workflow_id: captureVerificationResult.request_id,
          status: 'verified',
          national_id: captureVerificationResult.national_id,
          firstname: formData.firstName.trim(),
          lastname: formData.lastName.trim(),
        });
      } else if (role !== 'angel_donor' && !skipVerification && ghanaCardFile) {
        await verificationDocumentApi.upload(
          ghanaCardFile,
          'Ghana Card',
          formData.ghanaCard,
          {
            firstname: formData.firstName.trim(),
            lastname: formData.lastName.trim(),
            consent_given: true,
          }
        );
      }

      if ((role === 'ngo' || role === 'donor_institution') && businessRegFile && !skipVerification) {
        await verificationDocumentApi.upload(
          businessRegFile,
          role === 'ngo' ? 'NGO Registration (RG)' : 'Business Registration',
          formData.businessReg
        );
      }

      // Login user
      const loginResult = await login(formData.email, formData.password);
      
      if (loginResult.success) {
        alert(role === 'angel_donor'
          ? 'Registration successful! You can donate up to GH₵5,000 per donation. No ID verification required.'
          : skipVerification
            ? 'Registration successful! Complete verification from your dashboard to make requests or donations.'
            : 'Registration successful! Your documents are being reviewed. You will be notified once verified.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errData = error.response?.data;
      if (errData?.error_code === 'NAME_MISMATCH') {
        setVerificationResult({ type: 'name_mismatch', message: errData.message || 'The name on your Ghana Card does not match.' });
      } else if (errData?.error_code === 'INVALID_FORMAT' || errData?.error_code === 'NOT_FOUND') {
        setVerificationResult({ type: 'invalid_id', message: errData.message || 'Invalid Ghana Card or not found.' });
      } else {
        alert(errData?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full mx-auto p-8 bg-white shadow-lg rounded-xl">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Create ResourceFlow Account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-semibold text-slate-700 mb-2">Account Type</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'ngo'}
                  onChange={() => setRole('ngo')}
                  className="text-emerald-600"
                />
                <span className="font-medium">NGO</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'donor_institution'}
                  onChange={() => setRole('donor_institution')}
                  className="text-emerald-600"
                />
                <span className="font-medium">Donor (Institution)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'donor_individual'}
                  onChange={() => setRole('donor_individual')}
                  className="text-emerald-600"
                />
                <span className="font-medium">Donor (Individual)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'requestor'}
                  onChange={() => setRole('requestor')}
                  className="text-emerald-600"
                />
                <span className="font-medium">Recipient / Requestor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'angel_donor'}
                  onChange={() => setRole('angel_donor')}
                  className="text-emerald-600"
                />
                <span className="font-medium">Angel Donor</span>
              </label>
            </div>
            {role === 'ngo' && (
              <p className="text-xs text-slate-600 mt-2">
                NGOs receive assistance from Donors. Create fundable projects and get support from Donor/Institutions.
              </p>
            )}
            {role === 'donor_institution' && (
              <p className="text-xs text-slate-600 mt-2">
                Corporate donors fund NGO projects. Find and support NGOs through the platform.
              </p>
            )}
            {role === 'angel_donor' && (
              <p className="text-xs text-slate-600 mt-2">
                Quick sign-up, no ID verification. Donations capped at GH₵5,000 per donation.
              </p>
            )}
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              className="border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              className="border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
          {(role === 'ngo' || role === 'donor_institution') && (
            <div className="w-full">
              <input
                type="text"
                name="organization"
                placeholder={role === 'ngo' ? 'NGO / Organization Name *' : 'Organization / Company Name *'}
                value={formData.organization}
                onChange={handleChange}
                className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                {role === 'ngo' ? 'Required for NGO accounts' : 'Required for institutional donor accounts'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              minLength={8}
            />
            <input
              type="password"
              name="passwordConfirmation"
              placeholder="Confirm Password"
              value={formData.passwordConfirmation}
              onChange={handleChange}
              className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              minLength={8}
            />
          </div>

          {/* Document Upload Section - not required for Angel Donors */}
          {role !== 'angel_donor' && (
          <div className="border-t border-slate-200 pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="text-emerald-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Verification Documents</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Please upload clear copies of your identification documents. These will be reviewed
              by our admin team for account verification.
            </p>

            {/* Ghana Card Number and Upload */}
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">
                  Ghana Card Number (Required)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="ghanaCard"
                    placeholder="GHA-000000000-0"
                    value={formData.ghanaCard}
                    onChange={(e) => {
                      handleChange(e);
                      setVerificationResult(null);
                    }}
                    className="flex-1 border p-2 rounded border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyGhanaCard}
                    disabled={verifying || !formData.ghanaCard?.trim()}
                    icon={verifying ? Loader2 : ShieldCheck}
                    className="shrink-0"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Format: GHA-XXXXXXXXX-X</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-600">
                  I consent to the verification of my Ghana Card against the NIA database (Ghana Data Protection Act).
                </span>
              </label>
              {verificationResult && (
                <GhanaCardVerificationBanner
                  type={verificationResult.type}
                  message={verificationResult.message}
                  onDismiss={() => setVerificationResult(null)}
                />
              )}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={!useCapture ? 'primary' : 'outline'}
                  onClick={() => setUseCapture(false)}
                  icon={ShieldCheck}
                >
                  Upload Document
                </Button>
                <Button
                  type="button"
                  variant={useCapture ? 'primary' : 'outline'}
                  onClick={() => setUseCapture(true)}
                  icon={Camera}
                >
                  Capture with Camera
                </Button>
              </div>
              {ghanaCardVerifiedViaCapture ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <span className="text-emerald-600 font-medium">✓ Ghana Card verified via camera capture.</span>
                </div>
              ) : useCapture ? (
                <GhanaCardCapture
                  firstname={formData.firstName}
                  lastname={formData.lastName}
                  consentGiven={consentGiven}
                  onVerified={(result) => {
                    setGhanaCardVerifiedViaCapture(true);
                    setCaptureVerificationResult(result);
                    setVerificationResult({ type: 'verified', message: 'Ghana Card verified via camera capture.' });
                  }}
                  onError={() => setVerificationResult(null)}
                  disabled={submitting}
                />
              ) : (
                <FileUpload
                  label="Ghana Card Document"
                  name="ghanaCardFile"
                  accept="image/*,.pdf"
                  required={false}
                  value={ghanaCardFile}
                  onChange={setGhanaCardFile}
                  maxSizeMB={5}
                  description="Upload a clear photo or scan of your Ghana Card (front and back if applicable)"
                />
              )}
            </div>

            {/* Skip verification option */}
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 mb-2">
                Having trouble with camera or upload? You can complete registration now and verify later from your dashboard.
              </p>
              <button
                type="button"
                onClick={() => setSkipVerification(!skipVerification)}
                className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
              >
                {skipVerification ? '✓ I\'ll verify now (require documents)' : 'Continue without verification — I\'ll verify later'}
              </button>
              {skipVerification && (
                <p className="text-xs text-amber-700 mt-2">
                  You will not be able to make requests or donations until verification is complete.
                </p>
              )}
            </div>

            {/* NGO: Registration (RG) - Required */}
            {role === 'ngo' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">
                    NGO Registration Number (RG) *
                  </label>
                  <input
                    type="text"
                    name="businessReg"
                    placeholder="Enter RG Number"
                    value={formData.businessReg}
                    onChange={handleChange}
                    className="w-full border p-2 rounded border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <FileUpload
                  label="NGO Registration Document (RG) *"
                  name="businessRegFile"
                  accept="image/*,.pdf"
                  required={false}
                  value={businessRegFile}
                  onChange={setBusinessRegFile}
                  maxSizeMB={5}
                  description="Upload a clear copy of your NGO Registration Certificate from Registrar General"
                />
              </div>
            )}

            {/* Donor (Institution): Business Registration - Optional */}
            {role === 'donor_institution' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">
                    Business Registration Number (BN)
                  </label>
                  <input
                    type="text"
                    name="businessReg"
                    placeholder="Enter BN Number (optional)"
                    value={formData.businessReg}
                    onChange={handleChange}
                    className="w-full border p-2 rounded border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <FileUpload
                  label="Business Registration Document"
                  name="businessRegFile"
                  accept="image/*,.pdf"
                  required={false}
                  value={businessRegFile}
                  onChange={setBusinessRegFile}
                  maxSizeMB={5}
                  description="Upload a clear copy of your Business Registration Certificate (optional)"
                />
              </div>
            )}
          </div>
          )}

          {/* Address Details */}
          <textarea
            name="address"
            placeholder={role === 'requestor' ? 'Delivery Address' : role === 'ngo' ? 'NGO / Office Address' : 'Business Address'}
            value={formData.address}
            onChange={handleChange}
            className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            required
          />

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Registration'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-center text-slate-500">
          {role === 'angel_donor' ? (
            <>Angel donors can donate immediately. No verification required. Donations capped at GH₵5,000.</>
          ) : (
            <>Your account will remain in <strong>Pending Verification</strong> until an admin reviews your documents.</>
          )}
        </p>

        <p className="mt-2 text-sm text-center text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
