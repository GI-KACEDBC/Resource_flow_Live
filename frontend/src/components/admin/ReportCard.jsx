import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';

export const ReportCard = ({ title, date, icon: Icon }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/dashboard/reports')}
      className="bg-blue-50/60 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-blue-200/50 hover:shadow-xl hover:border-blue-300/50 transition-all duration-200 text-left group w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
          <p className="text-xl font-bold text-slate-900">{date}</p>
        </div>
        <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-200 text-blue-600 bg-white/50 backdrop-blur-sm group-hover:scale-110 transition-transform">
          <Icon size={24} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600 group-hover:text-slate-900 transition">
        <Download size={16} />
        <span>View Reports</span>
      </div>
    </button>
  );
};
