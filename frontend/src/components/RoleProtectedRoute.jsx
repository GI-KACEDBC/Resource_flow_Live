import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Requires authentication and an allowed role. Wrong role redirects to `/dashboard` so we do not
 * leak whether a protected route exists (vs returning 403 in the SPA).
 */
export const RoleProtectedRoute = ({
  children,
  allowedRoles,
  requiresVerification = false,
  requiresSuperAdmin = false,
}) => {
  const { role, isAuthenticated, loading, isVerified, user } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  if (!allowedRoles || !role || !allowedRoles.includes(role)) {
    console.warn(`Access denied: Role '${role}' not in allowed roles:`, allowedRoles);
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresSuperAdmin && !user?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresVerification && !isVerified && ['ngo', 'donor_institution', 'donor_individual', 'recipient'].includes(role)) {
    return <Navigate to="/verification-wait" replace />;
  }

  return <>{children}</>;
};
