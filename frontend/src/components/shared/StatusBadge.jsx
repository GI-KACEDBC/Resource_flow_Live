import React from 'react';

export const StatusBadge = ({ status, size = 'md', variant = 'light' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  };

  const statusStylesLight = {
    Pending: 'bg-amber-100 text-amber-700',
    Verified: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
    Open: 'bg-blue-100 text-blue-700',
    Allocated: 'bg-purple-100 text-purple-700',
    Fulfilled: 'bg-emerald-100 text-emerald-700',
    Partially_Fulfilled: 'bg-yellow-100 text-yellow-700',
    Scheduled: 'bg-slate-100 text-slate-700',
    'In Transit': 'bg-blue-100 text-blue-700',
    Delivered: 'bg-emerald-100 text-emerald-700',
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
    Available: 'bg-emerald-100 text-emerald-700',
    Reserved: 'bg-blue-100 text-blue-700',
    Disbursed: 'bg-slate-100 text-slate-700',
    Unavailable: 'bg-red-100 text-red-700',
  };

  const statusStylesDark = {
    Pending: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
    Verified: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    Rejected: 'bg-red-400/20 text-red-300 border border-red-400/30',
    Open: 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
    Allocated: 'bg-purple-400/20 text-purple-300 border border-purple-400/30',
    Fulfilled: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    Partially_Fulfilled: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30',
    Scheduled: 'bg-slate-400/20 text-slate-300 border border-slate-400/30',
    'In Transit': 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
    Delivered: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    Critical: 'bg-red-400/20 text-red-300 border border-red-400/30',
    High: 'bg-orange-400/20 text-orange-300 border border-orange-400/30',
    Medium: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30',
    Low: 'bg-green-400/20 text-green-300 border border-green-400/30',
    Available: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    Reserved: 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
    Disbursed: 'bg-slate-400/20 text-slate-300 border border-slate-400/30',
    Unavailable: 'bg-red-400/20 text-red-300 border border-red-400/30',
  };

  const statusStyles = variant === 'dark' ? statusStylesDark : statusStylesLight;

  return (
    <span
      className={`${sizeClasses[size]} ${statusStyles[status]} rounded-full font-bold uppercase tracking-wider`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
