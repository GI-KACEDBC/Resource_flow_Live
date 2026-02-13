// ## Protected Route Component
// ## Wraps routes that require authentication and role-based access
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, user, loading, role, isVerified } = useAuth();

  // ## Show loading spinner while authentication is being checked
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

  // ## Redirect unauthenticated users to home page
  if (!isAuthenticated || !user) {
    return <Navigate to="/home" replace />;
  }

  // ## Check if user's role is in the allowed roles list (guard against null role)
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  // ## Redirect unverified supplier/recipient to verification-wait first.
  // ## Exception: allow through if already ON verification-wait (avoid redirect loop), or if they chose "Go to Dashboard"/"Reupload".
  const isOnVerificationWait = location.pathname === '/verification-wait';
  if (!isVerified && ['supplier', 'recipient', 'ngo', 'donor'].includes(role)) {
    const allowFromVerificationWait = sessionStorage.getItem('allowUnverifiedDashboard');
    if (!allowFromVerificationWait && !isOnVerificationWait) {
      return <Navigate to="/verification-wait" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
