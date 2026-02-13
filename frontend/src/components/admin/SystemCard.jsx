import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const SystemCard = ({
  title,
  alertCount = 0,
  icon: Icon,
  status = 'healthy',
}) => {
  const statusConfig = {
    healthy: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-200',
      text: 'text-emerald-600',
      statusText: 'All Systems Operational',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-200',
      text: 'text-amber-600',
      statusText: 'Minor Issues Detected',
      icon: AlertCircle,
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-200',
      text: 'text-red-600',
      statusText: 'System Errors',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-blue-50/60 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-blue-200/50 hover:shadow-xl hover:border-blue-300/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
          <p className="text-lg font-bold text-slate-900">{config.statusText}</p>
          {alertCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">{alertCount} pending notifications</p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${config.bg} ${config.border} ${config.text} bg-white/50 backdrop-blur-sm`}>
          <Icon size={24} />
        </div>
      </div>
      {alertCount > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-blue-200/50">
          <StatusIcon size={16} className={config.text} />
          <span className="text-xs text-slate-600">Pending notifications</span>
        </div>
      )}
    </div>
  );
};
