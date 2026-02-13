// ## Platform Impact Growth Chart Component
// ## Line chart showing verified suppliers and recipients over time
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ## Impact Growth Chart Component
export const ImpactGrowthChart = ({ data }) => {
  return (
    <div className="h-[300px] w-full">
      <h3 className="text-slate-800 text-sm font-bold mb-4 uppercase tracking-wider">Platform Growth</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#64748b' }}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#64748b' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.9)', 
              border: 'none', 
              borderRadius: '8px', 
              color: '#fff',
              padding: '10px'
            }}
            itemStyle={{ color: '#68D391' }}
            labelStyle={{ color: '#cbd5e1', marginBottom: '5px' }}
          />
          <Legend 
            wrapperStyle={{ color: '#64748b', fontSize: '12px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="suppliers" 
            name="Verified Suppliers"
            stroke="#68D391" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#68D391' }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="recipients" 
            name="Verified Recipients"
            stroke="#F6E05E" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#F6E05E' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
