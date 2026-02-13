import React from 'react';

export const StatusCard = ({
  title,
  status,
  icon: Icon,
  color = 'blue',
  details,
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-200 text-blue-600',
    emerald: 'bg-emerald-500/10 border-emerald-200 text-emerald-600',
    amber: 'bg-amber-500/10 border-amber-200 text-amber-600',
    red: 'bg-red-500/10 border-red-200 text-red-600',
  };

  return (
    <div className="bg-blue-50/60 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-blue-200/50 hover:shadow-xl hover:border-blue-300/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{status}</p>
        </div>
        <div className={`p-3 rounded-xl border ${colorClasses[color]} bg-white/50 backdrop-blur-sm`}>
          <Icon size={24} />
        </div>
      </div>
      {details && details.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-blue-200/50">
          {details.map((detail, idx) => (
            <p key={idx} className="text-xs text-slate-600">{detail}</p>
          ))}
        </div>
      )}
    </div>
  );
};
