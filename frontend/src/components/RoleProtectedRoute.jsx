import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RoleProtectedRoute = ({
  children,
  allowedRoles,
  requiresVerification = false,
  requiresSuperAdmin = false,
}) => {
  const { role, isAuthenticated, loading, isVerified, user } = useAuth();

  // Show loading while checking auth
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

  // Redirect unauthenticated users to home
  if (!isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  // If role is not in allowed roles, redirect to dashboard (not logout)
  // This prevents logout on unauthorized access attempts (guard against null role)
  if (!allowedRoles || !role || !allowedRoles.includes(role)) {
    console.warn(`Access denied: Role '${role}' not in allowed roles:`, allowedRoles);
    return <Navigate to="/dashboard" replace />;
  }

  // Super Admin only (e.g. User Management – Admin cannot create users)
  if (requiresSuperAdmin && !user?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Block Request/Donate for unverified supplier/recipient/ngo
  if (requiresVerification && !isVerified && ['supplier', 'recipient', 'ngo', 'donor'].includes(role)) {
    return <Navigate to="/verification-wait" replace />;
  }

  return <>{children}</>;
};
