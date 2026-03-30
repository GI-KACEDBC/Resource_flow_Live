import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import {
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { loadImpactFinancialData } from '../../utils/impactDashboardFinancials';
import {
  resolveDashboardPeriodWindow,
  isActiveAllocationForCashValue,
  allocationInPeriod,
  allocationCashEquivalentValue,
} from '../../utils/allocatedFinancials';
import {
  deriveCategoryFromItemName,
  computeDonationsReceivedGhs,
} from '../../utils/adminDashboardAggregates';

const PERIOD_MAP = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

const RANGE_LABELS = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };

const ImpactDashboard = () => {
  const [financials, setFinancials] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  const loadFinancialDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const period = PERIOD_MAP[timeRange] || 'month';

      const {
        financials: financialsData,
        statistics: statsData,
        allocations: allocationsData,
        donations: donationsData,
      } = await loadImpactFinancialData(period);

      setFinancials(Array.isArray(financialsData) ? financialsData : []);
      setStatistics(statsData);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setDonations(Array.isArray(donationsData) ? donationsData : []);
    } catch {
      setFinancials([]);
      setAllocations([]);
      setDonations([]);
      setStatistics({
        total_donations: 0,
        total_allocations: 0,
        total_expenses: 0,
        total_value: 0,
        series: [],
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadFinancialDashboard();
  }, [loadFinancialDashboard]);

  useAutoRefresh(loadFinancialDashboard, ['donation', 'allocation', 'financial'], []);

  const chartDataArray = React.useMemo(() => {
    if (statistics?.series && statistics.series.length > 0) {
      return statistics.series.map((s) => ({
        date: s.label,
        Donation: s.Donation,
        Allocation: s.Allocation,
        Expense: s.Expense,
      }));
    }
    const fd = Array.isArray(financials) ? financials : [];
    const byDate = fd
      .filter((f) => f && f.status === 'Completed')
      .reduce((acc, financial) => {
        const date = new Date(financial.transaction_date).toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric',
        });
        if (!acc[date]) {
          acc[date] = { date, Donation: 0, Allocation: 0, Expense: 0 };
        }
        let t = financial.transaction_type;
        if (t === 'Project Funding' || t === 'General Support') {
          t = 'Donation';
        }
        if (t === 'Donation' || t === 'Allocation' || t === 'Expense') {
          acc[date][t] += financial.amount;
        }
        return acc;
      }, {});
    return Object.values(byDate).slice(-30);
  }, [statistics, financials]);

  const allocatedGoodsInPeriod = useMemo(() => {
    const period = PERIOD_MAP[timeRange] || 'month';
    const { start, end } = resolveDashboardPeriodWindow(period);
    return allocations
      .filter((a) => isActiveAllocationForCashValue(a) && allocationInPeriod(a, start, end))
      .reduce((s, a) => s + allocationCashEquivalentValue(a), 0);
  }, [allocations, timeRange]);

  const donationsReceivedInPeriod = useMemo(() => {
    const period = PERIOD_MAP[timeRange] || 'month';
    const { start, end } = resolveDashboardPeriodWindow(period);
    const fd = Array.isArray(financials) ? financials : [];
    const dn = Array.isArray(donations) ? donations : [];
    return computeDonationsReceivedGhs(dn, fd, { start, end });
  }, [donations, financials, timeRange]);

  const pieData = useMemo(() => {
    const period = PERIOD_MAP[timeRange] || 'month';
    const { start, end } = resolveDashboardPeriodWindow(period);
    const rows = allocations.filter(
      (a) => isActiveAllocationForCashValue(a) && allocationInPeriod(a, start, end)
    );
    const byCat = {};
    rows.forEach((a) => {
      const c = deriveCategoryFromItemName(a.donation?.item);
      byCat[c] = (byCat[c] || 0) + allocationCashEquivalentValue(a);
    });
    return Object.entries(byCat)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [allocations, timeRange]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Impact Dashboard</h2>
          <p className="text-slate-600 mt-1">
            Allocations in GH₵ (goods/services at unit prices, monetary as cash). Ledger shows completed cash
            movements including donations, project funding, and general support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['day', 'week', 'month', 'year'].map((range) => (
            <button
              type="button"
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeRange === range ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {RANGE_LABELS[range] || range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-violet-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Donations received (GH₵)</p>
          <p className="text-xl font-bold text-violet-800 mt-1">{formatGHC(donationsReceivedInPeriod)}</p>
          <p className="text-xs text-slate-500 mt-1">
            Donation rows + ledger (incl. project funding); pending monetary counts once Paystack is recorded
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Allocated value (GH₵)</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatGHC(allocatedGoodsInPeriod)}</p>
          <p className="text-xs text-slate-500 mt-1">Goods, services & monetary in period</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Cash inflows (ledger)</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatGHC(statistics?.total_donations || 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Donations, project funding & general support</p>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Ledger allocation entries</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatGHC(statistics?.total_allocations || 0)}</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Expenses (ledger)</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{formatGHC(statistics?.total_expenses || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-800 mb-1">Cash ledger flow</h3>
          <p className="text-xs text-slate-500 mb-4">Completed ledger rows in the selected window (not goods allocation value)</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartDataArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatGHC(value)} />
              <Legend />
              <Line type="monotone" dataKey="Donation" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Allocation" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="Expense" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-slate-800 mb-1">Allocated value by category (GH₵)</h3>
          <p className="text-xs text-slate-500 mb-4">Period matches top selector</p>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-500 py-16 text-center">No allocated value in this period.</p>
          ) : (
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
          )}
        </div>
      </div>

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
              {Array.isArray(financials) ? (
                financials.slice(0, 10).map((financial) => (
                  <tr key={financial.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(financial.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        {financial.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatGHC(financial.amount)}</td>
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
                    <td className="px-6 py-4 text-sm text-slate-600">{financial.description || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
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
