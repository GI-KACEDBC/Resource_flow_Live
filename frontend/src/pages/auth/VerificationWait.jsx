// ## Verification Wait Page
// ## Displays information for users with pending verification status
import React from 'react';
import { ShieldCheck, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

const VerificationWait = () => {
  // ## Navigation hook for routing
  const navigate = useNavigate();
  // ## Get current user from auth context
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}
    >
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-amber-100 rounded-full">
              <ShieldCheck className="w-12 h-12 text-amber-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verification Pending</h1>
          <p className="text-slate-600">
            Your account is currently under review by our admin team
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li>• Our team will review your submitted documents</li>
                <li>• You'll receive an email notification once verification is complete</li>
                <li>• This process typically takes 1-3 business days</li>
                <li>• You can check your verification status from your dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Name:</span>
              <span className="font-medium text-slate-900">{user?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium text-slate-900">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                Pending Verification
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => {
              sessionStorage.setItem('allowUnverifiedDashboard', '1');
              navigate('/dashboard');
            }}
            className="flex-1"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => {
              sessionStorage.setItem('allowUnverifiedDashboard', '1');
              navigate('/dashboard/documents');
            }}
            className="flex-1"
            icon={ShieldCheck}
          >
            Reupload Documents
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerificationWait;
