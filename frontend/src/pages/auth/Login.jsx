import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, KeyRound, X, ShieldAlert } from 'lucide-react';

const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changeEmail, setChangeEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const { login, changeExpiredPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('password_expired') === '1') {
      setShowChangePassword(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.requiresPasswordChange) {
        setShowChangePassword(true);
        setChangeEmail(result.email || email);
        setCurrentPassword(password);
        setError('');
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeExpiredPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== newPasswordConfirm) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await changeExpiredPassword(changeEmail, currentPassword, newPassword, newPasswordConfirm);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to change password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.current_password?.[0] || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset (generic message for security - does not reveal if email exists)
  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Please enter your email address');
      return;
    }
    setResetMessage(`If an account exists for ${resetEmail}, you will receive password reset instructions.`);
    setTimeout(() => {
      setShowPasswordReset(false);
      setResetEmail('');
      setResetMessage('');
    }, 3000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900">
      {/* Video Background Container - fallback gradient if video missing */}
      <div className="absolute inset-0 z-0">
        {/* Video Background (optional - may not exist) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: 'none' }}
          onLoadedData={(e) => { e.target.style.display = 'block'; }}
          onError={(e) => { e.target.style.display = 'none'; }}
        >
          <source src="/videos/adomi.mp4" type="video/mp4" />
        </video>
        
        {/* Green Glass Overlay - always visible */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/70 via-emerald-800/60 to-slate-900/80"></div>
        
        {/* Additional green tint for glass effect */}
        <div className="absolute inset-0 bg-emerald-500/10"></div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4">
              <LogIn className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-slate-800">Welcome Back</h2>
            <p className="text-slate-600">Login to ResourceFlow</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="your.email@resourceflow.gh"
                  className="w-full pl-12 pr-4 py-3 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(true);
                    setResetEmail(email);
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 text-lg font-bold"
              icon={LogIn}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-center text-slate-600">
              Don't have an account?{' '}
              <a href="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                Register
              </a>
            </p>
            <p className="text-sm text-center text-slate-500 mt-2">
              <a href="/home" className="hover:text-emerald-600 hover:underline">
                ← Back to Home
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Change Expired Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ShieldAlert className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Password Expired</h3>
                  <p className="text-sm text-slate-500">Passwords must be changed every 30 days. Enter a new password to continue.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setChangeEmail('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setNewPasswordConfirm('');
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangeExpiredPassword} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Email</label>
                <input
                  type="email"
                  value={changeEmail}
                  onChange={(e) => setChangeEmail(e.target.value)}
                  className="w-full pl-4 py-2 border rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-4 py-2 border rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-4 py-2 border rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Confirm New Password</label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-4 py-2 border rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  minLength={8}
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password & Login'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <KeyRound className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
                  <p className="text-sm text-slate-500">Enter your email to receive reset instructions</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasswordReset(false);
                  setResetEmail('');
                  setResetMessage('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setResetMessage('');
                    }}
                    placeholder="your.email@resourceflow.gh"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                  />
                </div>
              </div>

              {resetMessage && (
                <div className={`p-3 rounded-lg ${
                  resetMessage.includes('sent') 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="text-sm">{resetMessage}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetEmail('');
                    setResetMessage('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  icon={KeyRound}
                  className="flex-1"
                >
                  Send Reset Link
                </Button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Remember your password?{' '}
                <button
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetEmail('');
                    setResetMessage('');
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  Back to Login
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
