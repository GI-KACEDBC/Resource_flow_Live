// ## National Resource Value Chart Component
// ## Bar chart displaying value of verified and audited donations in GH₵
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatGHC } from '../../utils/currency';

// ## Custom tooltip formatter to display GH₵
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 text-white p-3 rounded-lg border border-white/10 shadow-xl">
        <p className="text-sm font-bold mb-1">{payload[0].payload.category}</p>
        <p className="text-xs text-emerald-400">
          Value: {formatGHC(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// ## Resource Value Chart Component
export const ResourceValueChart = ({ data }) => {
  return (
    <div className="h-[300px] w-full">
      <h3 className="text-slate-800 text-sm font-bold mb-4 uppercase tracking-wider">Total Resource Value (GH₵)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis 
            dataKey="category" 
            stroke="#64748b" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#64748b' }}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#64748b' }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="#4299E1" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
