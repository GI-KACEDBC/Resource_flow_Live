// ## Main Layout Component
// ## Provides sidebar navigation and top navbar for authenticated users
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Package,
  Map,
  FileBarChart,
  Bell,
  UserCircle,
  Truck,
  LogOut,
  ShieldCheck,
  Warehouse,
  Boxes,
  Lock,
  Heart,
  DollarSign,
  ShieldAlert,
  History,
  TrendingUp,
  FileText,
  Flag,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../shared/StatusBadge';

const Layout = () => {
  // ## Get authentication state and user data
  const { role, isVerified, user, logout } = useAuth();
  // ## Navigation and location hooks for routing
  const navigate = useNavigate();
  const location = useLocation();
  // ## State for logout confirmation dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ## Handle logout with confirmation
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // ## Confirm logout action
  const confirmLogout = () => {
    logout();
    navigate('/home');
    setShowLogoutConfirm(false);
  };

  // ## Cancel logout
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // ## Navigation menu configuration for each role
  const navigation = {
    admin: [
      { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Verifications', icon: UserCheck, path: '/dashboard/verify-users' },
      { name: 'Verification Center', icon: FileText, path: '/dashboard/verification-center' },
      { name: 'Flagged Requests', icon: Flag, path: '/dashboard/flagged-requests' },
      { name: 'AML/KYC Review', icon: ShieldAlert, path: '/dashboard/aml-review' },
      { name: 'Allocations', icon: Package, path: '/dashboard/allocate' },
      { name: 'Warehouses', icon: Warehouse, path: '/dashboard/warehouses' },
      { name: 'Warehouse Assignment', icon: Package, path: '/dashboard/warehouse-assignment' },
      { name: 'Inventory', icon: Boxes, path: '/dashboard/inventory' },
      { name: 'Logistics', icon: Map, path: '/dashboard/logistics' },
      { name: 'Delivery Dashboard', icon: Truck, path: '/dashboard/delivery-dashboard' },
      { name: 'Impact Dashboard', icon: TrendingUp, path: '/dashboard/impact' },
      { name: 'Transparency Log', icon: History, path: '/dashboard/transparency-log' },
      { name: 'User Management', icon: Users, path: '/dashboard/user-management' },
      { name: 'Reporting', icon: FileBarChart, path: '/dashboard/reports' },
    ],
    supplier: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Donate', icon: Package, path: '/dashboard/donate', requiresVerification: true },
      { name: 'Available Requests', icon: TrendingUp, path: '/dashboard/available-requests' },
      { name: 'Fund Projects', icon: Heart, path: '/dashboard/projects' },
      { name: 'Documents', icon: ShieldCheck, path: '/dashboard/documents' },
    ],
    recipient: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Request', icon: Package, path: '/dashboard/request', requiresVerification: true },
      { name: 'Documents', icon: ShieldCheck, path: '/dashboard/documents' },
    ],
    auditor: [
      { name: 'Valuation Queue', icon: Lock, path: '/dashboard/valuation' },
      { name: 'NGO Verification', icon: UserCheck, path: '/dashboard/ngo-verification' },
      { name: 'Monetary Transfers', icon: DollarSign, path: '/dashboard/transfers' },
      { name: 'Audit Logs', icon: FileBarChart, path: '/dashboard/audit-logs' },
    ],
    ngo: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Create Request', icon: Package, path: '/dashboard/request', requiresVerification: true },
      { name: 'My Projects', icon: Package, path: '/dashboard/projects' },
      { name: 'Partnerships', icon: Heart, path: '/dashboard/partnerships' },
      { name: 'Documents', icon: ShieldCheck, path: '/dashboard/documents' },
    ],
    corporate: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Available Requests', icon: TrendingUp, path: '/dashboard/available-requests' },
      { name: 'Find NGOs', icon: TrendingUp, path: '/dashboard/matchmaking' },
      { name: 'Impact Dashboard', icon: TrendingUp, path: '/dashboard/impact' },
      { name: 'My Partnerships', icon: Heart, path: '/dashboard/partnerships' },
      { name: 'Projects', icon: Package, path: '/dashboard/projects' },
    ],
    field_agent: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Upload Proof', icon: FileText, path: '/dashboard/upload-proof' },
      { name: 'My Proofs', icon: FileText, path: '/dashboard/proofs' },
    ],
    driver: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Logistics', icon: Map, path: '/dashboard/logistics' },
      { name: 'Delivery Dashboard', icon: Truck, path: '/dashboard/delivery-dashboard' },
    ],
    supervisor: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Logistics', icon: Map, path: '/dashboard/logistics' },
      { name: 'Delivery Dashboard', icon: Truck, path: '/dashboard/delivery-dashboard' },
      { name: 'Team', icon: Users, path: '/dashboard/team' },
    ],
    special: [
      { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ],
  };

  // ## Handle navigation link clicks
  const handleNavClick = (path) => {
    try {
      // Only navigate if path is valid
      if (path && path.startsWith('/')) {
        navigate(path);
      } else {
        console.warn('Invalid navigation path:', path);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Don't logout on navigation errors, just log them
    }
  };

  // ## Role-based sidebar color themes with translucent glass effects
  const sidebarStyles = {
    admin: {
      bg: 'bg-blue-900/80 backdrop-blur-md', // ## Translucent Deep Blue
      hover: 'hover:bg-blue-800/90',
      active: 'bg-blue-800/90',
      border: 'border-blue-800/50',
      text: 'text-white',
      logoBg: 'bg-blue-500/80 backdrop-blur-sm',
    },
    supplier: {
      bg: 'bg-emerald-800/80 backdrop-blur-md', // ## Translucent Success Green
      hover: 'hover:bg-emerald-700/90',
      active: 'bg-emerald-700/90',
      border: 'border-emerald-700/50',
      text: 'text-white',
      logoBg: 'bg-emerald-500/80 backdrop-blur-sm',
    },
    recipient: {
      bg: 'bg-amber-400/80 backdrop-blur-md', // ## Translucent Warm Yellow
      hover: 'hover:bg-amber-300/90',
      active: 'bg-amber-300/90',
      border: 'border-amber-300/50',
      text: 'text-slate-900',
      logoBg: 'bg-amber-600/80 backdrop-blur-sm',
    },
    auditor: {
      bg: 'bg-slate-800/80 backdrop-blur-md', // ## Translucent Deep Charcoal
      hover: 'hover:bg-slate-700/90',
      active: 'bg-slate-700/90',
      border: 'border-slate-600/50',
      text: 'text-slate-200',
      logoBg: 'bg-slate-500/80 backdrop-blur-sm',
    },
    ngo: {
      bg: 'bg-teal-800/80 backdrop-blur-md',
      hover: 'hover:bg-teal-700/90',
      active: 'bg-teal-700/90',
      border: 'border-teal-700/50',
      text: 'text-white',
      logoBg: 'bg-teal-500/80 backdrop-blur-sm',
    },
    corporate: {
      bg: 'bg-indigo-800/80 backdrop-blur-md',
      hover: 'hover:bg-indigo-700/90',
      active: 'bg-indigo-700/90',
      border: 'border-indigo-700/50',
      text: 'text-white',
      logoBg: 'bg-indigo-500/80 backdrop-blur-sm',
    },
    driver: {
      bg: 'bg-sky-800/80 backdrop-blur-md',
      hover: 'hover:bg-sky-700/90',
      active: 'bg-sky-700/90',
      border: 'border-sky-700/50',
      text: 'text-white',
      logoBg: 'bg-sky-500/80 backdrop-blur-sm',
    },
    supervisor: {
      bg: 'bg-violet-800/80 backdrop-blur-md',
      hover: 'hover:bg-violet-700/90',
      active: 'bg-violet-700/90',
      border: 'border-violet-700/50',
      text: 'text-white',
      logoBg: 'bg-violet-500/80 backdrop-blur-sm',
    },
    special: {
      bg: 'bg-slate-700/80 backdrop-blur-md',
      hover: 'hover:bg-slate-600/90',
      active: 'bg-slate-600/90',
      border: 'border-slate-600/50',
      text: 'text-white',
      logoBg: 'bg-slate-500/80 backdrop-blur-sm',
    },
  };

  const currentStyle = sidebarStyles[role] || sidebarStyles.admin;

  return (
    <div className="flex h-screen font-sans bg-white">
      {/* Sidebar with Role-based Styling - flex column, full height */}
      <aside className={`w-64 h-screen flex flex-col px-4 overflow-hidden ${currentStyle.bg} ${currentStyle.text} sidebar-seamless shrink-0`}>
        {/* Logo - fixed at top */}
        <div className="py-6 shrink-0">
          <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
            <div className={`w-8 h-8 ${currentStyle.logoBg} rounded-lg flex items-center justify-center ${role === 'recipient' ? 'text-slate-900' : 'text-white'} font-bold`}>
              R
            </div>
            ResourceFlow
          </h1>
        </div>

        {/* Nav - takes remaining space, scrolls if needed */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-2 space-y-1">
          {/* Role is already mapped in useAuth (donor->supplier, requestor->recipient) */}
          {(navigation[role] || [])
            .filter((item) => {
              // User Management: Super Admin only – Admin cannot create users
              if (item.path === '/dashboard/user-management' && role === 'admin' && !user?.is_super_admin) {
                return false;
              }
              return true;
            })
            .map((item) => {
            // Check if current path matches (handles both exact and nested paths)
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            // Hide or disable items that require verification if user is not verified
            const requiresVerification = item.requiresVerification;
            const isDisabled = requiresVerification && !isVerified;
            
            if (isDisabled && !isVerified) {
              return null; // Hide the link if verification is required and user is not verified
            }
            
            return (
              <button
                key={item.name}
                onClick={() => !isDisabled && handleNavClick(item.path)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isDisabled
                    ? `${currentStyle.text} opacity-40 cursor-not-allowed`
                    : isActive
                    ? `${currentStyle.active} ${currentStyle.text}`
                    : `${currentStyle.text} opacity-80 ${currentStyle.hover} hover:opacity-100`
                }`}
                title={isDisabled ? 'Verification required' : ''}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Current Role - pushed to bottom via mt-auto, respects sidebar width */}
        {role !== 'auditor' && (
          <div className={`mt-auto shrink-0 py-4 border-t ${currentStyle.border}`}>
            <div className={`w-full ${currentStyle.active} p-3 rounded-lg flex flex-col gap-2`}>
              <span className="text-[10px] uppercase text-slate-500 font-bold text-center block">
                Current Role
              </span>
              <div className={`w-full ${role === 'recipient' ? 'bg-amber-600 text-slate-900' : 'bg-slate-700 text-white'} text-xs p-2 rounded border-none font-semibold capitalize text-center`}>
                {role || 'Unknown'}
              </div>
              <p className="text-[10px] text-slate-400 text-center break-words">
                Role is set by your account
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar - Glassmorphic */}
        <header className="h-16 glass-container border-b border-white/10 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            {role !== 'auditor' && (
              <StatusBadge
                status={isVerified ? 'Verified' : 'Pending'}
                size="sm"
                variant="dark"
              />
            )}
          </div>

            <div className="flex items-center gap-6">
            {role !== 'auditor' && (
              <div className="relative cursor-pointer text-white/70 hover:text-white">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/profile')}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-white">
                    {user?.name || 'Demo User'}
                  </p>
                  <p className="text-[10px] text-white/60 capitalize">{role} Account</p>
                </div>
                <UserCircle size={32} className="text-white/70" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-lg transition border border-red-400/30 hover:border-red-400/50"
                title="Logout"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content - White background */}
        <section className="flex-1 overflow-y-auto bg-white">
          <Outlet />
        </section>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <LogOut className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Confirm Logout</h3>
                <p className="text-sm text-slate-500">Are you sure you want to logout?</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              You will be redirected to the home page. You can log back in anytime.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
