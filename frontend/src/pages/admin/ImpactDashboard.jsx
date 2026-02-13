// ## Impact Dashboard Component
// ## Financials visualization showing total value of aid distributed
import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { financialApi } from '../../services/api';
import { formatGHC } from '../../utils/currency';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const ImpactDashboard = () => {
  const [financials, setFinancials] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load financials first
      let financialsData = [];
      try {
        financialsData = await financialApi.getAll();
      } catch (error) {
        console.error('Error loading financials:', error);
      }
      
      // Load statistics separately (optional - don't fail if it errors)
      let statsData = null;
      try {
        statsData = await financialApi.getStatistics();
      } catch (error) {
        console.warn('Error loading statistics (non-critical):', error);
        // Calculate statistics from financials data if API fails
        if (Array.isArray(financialsData) && financialsData.length > 0) {
          statsData = {
            total_donations: financialsData
              .filter(f => f.transaction_type === 'Donation' && f.status === 'Completed')
              .reduce((sum, f) => sum + (f.amount || 0), 0),
            total_allocations: financialsData
              .filter(f => f.transaction_type === 'Allocation' && f.status === 'Completed')
              .reduce((sum, f) => sum + (f.amount || 0), 0),
            total_expenses: financialsData
              .filter(f => f.transaction_type === 'Expense' && f.status === 'Completed')
              .reduce((sum, f) => sum + (f.amount || 0), 0),
            total_value: financialsData
              .filter(f => f.status === 'Completed')
              .reduce((sum, f) => sum + (f.amount || 0), 0),
          };
        } else {
          // Default empty stats
          statsData = {
            total_donations: 0,
            total_allocations: 0,
            total_expenses: 0,
            total_value: 0,
          };
        }
      }
      
      // Ensure financials is always an array
      setFinancials(Array.isArray(financialsData) ? financialsData : []);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading financial data:', error);
      setFinancials([]); // Set to empty array on error
      setStatistics({
        total_donations: 0,
        total_allocations: 0,
        total_expenses: 0,
        total_value: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  // ## Auto-refresh when financials, donations, or allocations are created
  useAutoRefresh(loadData, ['donation', 'allocation', 'financial'], []);

  // ## Prepare chart data - ensure financials is an array
  const chartData = Array.isArray(financials) ? financials
    .filter(f => f && f.status === 'Completed')
    .reduce((acc, financial) => {
      const date = new Date(financial.transaction_date).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
      if (!acc[date]) {
        acc[date] = { date, Donation: 0, Allocation: 0, Expense: 0 };
      }
      if (financial.transaction_type === 'Donation' || financial.transaction_type === 'Allocation') {
        acc[date][financial.transaction_type] += financial.amount;
      }
      return acc;
    }, {}) : {};

  const chartDataArray = Object.values(chartData).slice(-30); // Last 30 days

  const pieData = [
    { name: 'Donations', value: statistics?.total_donations || 0 },
    { name: 'Allocations', value: statistics?.total_allocations || 0 },
    { name: 'Expenses', value: statistics?.total_expenses || 0 },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-400 animate-pulse mb-4" />
          <p className="text-slate-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Impact Dashboard</h2>
          <p className="text-slate-600 mt-1">Financial overview of aid distribution and impact</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Value</p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {formatGHC(statistics?.total_value || 0)}
          </p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Donations</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatGHC(statistics?.total_donations || 0)}
          </p>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Allocations</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatGHC(statistics?.total_allocations || 0)}
          </p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Expenses</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {formatGHC(statistics?.total_expenses || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Transaction Flow Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Transaction Flow</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartDataArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatGHC(value)} />
              <Legend />
              <Line type="monotone" dataKey="Donation" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Allocation" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Financial Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatGHC(value)} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.isArray(financials) ? financials.slice(0, 10).map((financial) => (
                <tr key={financial.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {new Date(financial.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      {financial.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {formatGHC(financial.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        financial.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : financial.status === 'Pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {financial.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {financial.description || '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No financial data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImpactDashboard;
