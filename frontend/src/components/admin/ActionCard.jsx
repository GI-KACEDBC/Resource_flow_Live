import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const ActionCard = ({
  title,
  count,
  link,
  icon: Icon,
  color = 'blue',
}) => {
  const navigate = useNavigate();

  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-200 text-blue-600 hover:bg-blue-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-200 text-emerald-600 hover:bg-emerald-500/20',
    purple: 'bg-purple-500/10 border-purple-200 text-purple-600 hover:bg-purple-500/20',
    amber: 'bg-amber-500/10 border-amber-200 text-amber-600 hover:bg-amber-500/20',
  };

  return (
    <button
      onClick={() => navigate(link)}
      className="bg-blue-50/60 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-blue-200/50 hover:shadow-xl hover:border-blue-300/50 transition-all duration-200 text-left group w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
          <p className="text-4xl font-bold text-slate-900">{count}</p>
        </div>
        <div className={`p-3 rounded-xl border ${colorClasses[color]} bg-white/50 backdrop-blur-sm group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600 group-hover:text-slate-900 transition">
        <span>View Details</span>
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};
