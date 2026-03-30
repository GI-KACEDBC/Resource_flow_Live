import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Requires a logged-in Sanctum session. Role checks are optional (`allowedRoles`).
 * Unverified NGO/donor/recipient users are sent to `/verification-wait` unless the server
 * session has recorded an explicit “continue to dashboard” (avoids spoofable client-only flags).
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, user, loading, role, isVerified } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-300 mx-auto"></div>
          <p className="mt-4 text-emerald-100">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/home" replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  const isOnVerificationWait = location.pathname === '/verification-wait';
  const needsVerificationGate = !isVerified && ['ngo', 'donor_institution', 'donor_individual', 'recipient'].includes(role);
  const serverAllowsDashboard = user.allow_unverified_dashboard_access === true;

  if (needsVerificationGate && !serverAllowsDashboard && !isOnVerificationWait) {
    return <Navigate to="/verification-wait" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
