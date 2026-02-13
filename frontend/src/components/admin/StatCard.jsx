import React from 'react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  subtitle,
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-200 text-blue-600',
    emerald: 'bg-emerald-500/10 border-emerald-200 text-emerald-600',
    purple: 'bg-purple-500/10 border-purple-200 text-purple-600',
    amber: 'bg-amber-500/10 border-amber-200 text-amber-600',
    red: 'bg-red-500/10 border-red-200 text-red-600',
  };

  return (
    <div className="bg-blue-50/60 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-blue-200/50 hover:shadow-xl hover:border-blue-300/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-600 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colorClasses[color]} bg-white/50 backdrop-blur-sm`}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
};
