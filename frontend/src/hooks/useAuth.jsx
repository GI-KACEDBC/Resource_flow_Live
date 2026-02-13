// ## Authentication Context and Hook
// ## Manages user authentication state and role-based access
import { useState, useEffect, createContext, useContext } from 'react';
import { authApi } from '../services/api';

// ## Create authentication context
const AuthContext = createContext(undefined);

// ## Auth Provider Component
// ## Wraps application and provides authentication state
export const AuthProvider = ({ children }) => {
  // ## User state management
  const [user, setUser] = useState(null);
  // ## Current user role
  const [role, setRole] = useState(null);
  // ## Verification status
  const [isVerified, setIsVerified] = useState(false);
  // ## Loading state for initial auth check
  const [loading, setLoading] = useState(true);

  // ## Load user data from localStorage on mount and verify with backend
  useEffect(() => {
    let cancelled = false;
    const initializeAuth = async () => {
      try {
        // ## Retrieve stored token and user data
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        
        // ## If we have a token, verify it with the backend (5s timeout in api)
        if (storedToken && storedUser) {
          try {
            const userData = await authApi.getMe();
            if (cancelled) return;
            setUser(userData);
            let frontendRole = userData.role;
            if (userData.role === 'donor') frontendRole = 'supplier';
            if (userData.role === 'requestor') frontendRole = 'recipient';
            setRole(frontendRole || null);
            setIsVerified(userData.is_verified || false);
            localStorage.setItem('auth_user', JSON.stringify(userData));
          } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            sessionStorage.removeItem('allowUnverifiedDashboard');
            setUser(null);
            setRole(null);
            setIsVerified(false);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    initializeAuth();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🚀 Starting login process...');
      console.log('📧 Email:', email);
      console.log('🔑 Password length:', password.length);
      
      // ## Authenticate with Laravel backend
      const response = await authApi.login({ email, password });
      
      if (response.user && response.token) {
        // ## Save token and user data
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        
        // ## Update state
        setUser(response.user);
        // ## Map backend role to frontend role
        // Backend uses 'donor' and 'requestor', frontend uses 'supplier' and 'recipient'
        let frontendRole = response.user.role;
        if (response.user.role === 'donor') frontendRole = 'supplier';
        if (response.user.role === 'requestor') frontendRole = 'recipient';
        setRole(frontendRole || null);
        setIsVerified(response.user.is_verified || false);
        
        // ## Return success with role for navigation
        return { success: true, role: frontendRole };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('Login error:', error);

      // Password expired - show change password form
      if (error.response?.data?.error_code === 'PASSWORD_EXPIRED') {
        return {
          success: false,
          requiresPasswordChange: true,
          email: error.response.data.email,
          error: error.response.data.message || 'Your password has expired. Please change it.',
        };
      }
      
      // ## Extract error message from response
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        errorMessage = errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // ## Call backend logout endpoint
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // ## Continue with logout even if API call fails
    } finally {
      // ## Clear local state and storage
      setUser(null);
      setRole(null);
      setIsVerified(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('allowUnverifiedDashboard');
    }
  };

  // ## Role switching removed - roles are now backend-controlled
  // ## This function is kept for backward compatibility but does nothing
  const switchRole = () => {
    // No-op: Roles are determined by the backend database
    // This function exists to prevent errors if called, but does not change the role
  };

  // ## Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white">
        <div className="text-center">
          <div className="animate-pulse text-lg font-medium">Loading...</div>
          <p className="text-sm text-emerald-200/80 mt-2">Checking authentication</p>
        </div>
      </div>
    );
  }

  const changeExpiredPassword = async (email, currentPassword, newPassword, newPasswordConfirmation) => {
    const response = await authApi.changeExpiredPassword({
      email,
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: newPasswordConfirmation,
    });
    if (response.user && response.token) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      setUser(response.user);
      let frontendRole = response.user.role;
      if (response.user.role === 'donor') frontendRole = 'supplier';
      if (response.user.role === 'requestor') frontendRole = 'recipient';
      setRole(frontendRole || null);
      setIsVerified(response.user.is_verified || false);
      return { success: true, role: frontendRole };
    }
    return { success: false, error: 'Failed to change password' };
  };

  // ## Provide authentication context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isVerified,
        login,
        logout,
        changeExpiredPassword,
        switchRole,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ## useAuth Hook
// ## Provides access to authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  // ## Ensure hook is used within AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
