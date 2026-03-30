import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((userData) => {
    if (!userData) {
      setUser(null);
      setRole(null);
      setIsVerified(false);
      return;
    }
    setUser(userData);
    let frontendRole = userData.role;
    if (userData.role === 'requestor') frontendRole = 'recipient';
    setRole(frontendRole || null);
    setIsVerified(userData.is_verified || false);
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await authApi.getMe();
    applyUser(userData);
    return userData;
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;
    const restoreSessionFromSanctum = async () => {
      try {
        const userData = await authApi.getMe();
        if (!cancelled) applyUser(userData);
      } catch {
        if (!cancelled) applyUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSessionFromSanctum();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password });

      if (response.user) {
        applyUser(response.user);
        let frontendRole = response.user.role;
        if (response.user.role === 'requestor') frontendRole = 'recipient';
        return { success: true, role: frontendRole };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      if (error.response?.data?.error_code === 'PASSWORD_EXPIRED') {
        return {
          success: false,
          requiresPasswordChange: true,
          email: error.response.data.email,
          error: error.response.data.message || 'Your password has expired. Please change it.',
        };
      }

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
      await authApi.logout();
    } catch {
      // Continue clearing local state even if the API call fails.
    } finally {
      applyUser(null);
    }
  };

  const switchRole = () => {};

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
    if (response.user) {
      applyUser(response.user);
      let frontendRole = response.user.role;
      if (response.user.role === 'requestor') frontendRole = 'recipient';
      return { success: true, role: frontendRole };
    }
    return { success: false, error: 'Failed to change password' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isVerified,
        login,
        logout,
        changeExpiredPassword,
        refreshUser,
        switchRole,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
