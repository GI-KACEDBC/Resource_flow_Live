import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Truck, MapPin } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import { ImpactGrowthChart } from '../../components/charts/ImpactGrowthChart';
import { ResourceValueChart } from '../../components/charts/ResourceValueChart';
import { GhanaSVGHeatMap } from '../../components/map/GhanaSVGHeatMap';
import { useAdminDashboardMetrics } from '../../hooks/useAdminDashboardMetrics';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, fetchDashboardData } = useAdminDashboardMetrics();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useAutoRefresh(fetchDashboardData, ['request', 'donation', 'allocation', 'delivery'], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading dashboard...</span>
      </div>
    );
  }

  const {
    stats,
    impactGrowthData,
    resourceValueData,
    scheduledDeliveries,
    warehouseStats,
    totalStockpileValue,
    netBalanceChangePercent,
    recentAuditLogs,
  } = data;

  const netBalance = totalStockpileValue;

  const KPIWidget = ({ title, value, subtitle }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition h-full">
      <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );

  const LogisticsScheduler = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Logistics Scheduler</h3>
        <button
          type="button"
          onClick={() => navigate('/dashboard/delivery-dashboard')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <MapPin size={14} />
          View Map
        </button>
      </div>
      <div className="space-y-3">
        {scheduledDeliveries.map((delivery, idx) => (
          <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">{delivery.date}</span>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {delivery.status}
              </span>
            </div>
            <p className="text-xs text-slate-600">{delivery.region}</p>
            <p className="text-xs text-slate-500 mt-1">{delivery.items} items scheduled</p>
          </div>
        ))}
      </div>
    </div>
  );

  const WarehouseCapacityWidget = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Warehouse Capacity</h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600">Utilization</span>
            <span className="text-xs font-bold text-slate-900">{warehouseStats.utilizationPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${warehouseStats.utilizationPercent}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Used</p>
            <p className="text-base font-bold text-slate-900">{warehouseStats.usedCapacity.toLocaleString()} units</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Available</p>
            <p className="text-base font-bold text-slate-900">{warehouseStats.availableCapacity.toLocaleString()} units</p>
          </div>
        </div>
      </div>
    </div>
  );

  const NetBalanceWidget = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Net Balance</h3>
      <div className="space-y-4">
        <div>
          <p className="text-2xl font-bold text-slate-900 mb-2">{formatGHC(netBalance)}</p>
          <p className="text-xs text-slate-500">Locked portion of allocated lines (audited unit price)</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <p className="text-xs text-slate-600 mb-1">Month-over-month (verified value)</p>
          <p className="text-sm font-bold text-emerald-600">
            {netBalanceChangePercent === null
              ? 'Not enough history'
              : `${netBalanceChangePercent >= 0 ? '+' : ''}${netBalanceChangePercent}% vs prior month`}
          </p>
        </div>
      </div>
    </div>
  );

  const RecentAuditLogsWidget = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Recent Audit Logs</h3>
      <div className="space-y-2">
        {recentAuditLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No audit entries yet.</p>
        ) : (
          recentAuditLogs.map((log, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">{log.item}</span>
                <span className="text-xs text-emerald-600">{log.action}</span>
              </div>
              <p className="text-xs text-slate-500">{log.date}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 min-h-screen bg-white">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-600 mt-1">
          Complete overview — donations received includes verified stock and cash not yet allocated; allocated value is
          what has been matched to requests.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KPIWidget
          title="Donations received (GH₵)"
          value={formatGHC(stats.totalReceivedDonationsGhs)}
          subtitle="Donation records + ledger inflows (e.g. project funding); monetary pending counts after Paystack"
        />
        <KPIWidget
          title="Allocated value (GH₵)"
          value={formatGHC(stats.totalDonations)}
          subtitle="Goods & services at unit prices + monetary allocations"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPIWidget
          title="Active Recipients"
          value={stats.totalRecipients.toLocaleString()}
          subtitle="Registered recipients / requestors"
        />
        <button
          type="button"
          onClick={() => navigate('/dashboard/delivery-dashboard')}
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition h-full w-full text-left"
        >
          <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">In-Transit</p>
          <p className="text-2xl font-bold text-slate-900">{stats.activeDeliveries}</p>
          <p className="text-xs text-slate-500 mt-1">Active deliveries · View map</p>
        </button>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Pending Verifications</h3>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-slate-900 mb-2">{stats.pendingUsers}</p>
              <p className="text-xs text-slate-500">User accounts awaiting KYC / approval (not donations)</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/verify-users')}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 transition"
            >
              Review users
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/inventory')}
              className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              Pending donations → Inventory
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ImpactGrowthChart data={impactGrowthData} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ResourceValueChart data={resourceValueData} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Regional Request Heat Map</h3>
            <p className="text-xs text-slate-500">Click on a region to view requests</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/delivery-dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 transition"
          >
            <Truck size={18} />
            Delivery Dashboard & Map
          </button>
        </div>
        <div className="h-[600px] min-h-[600px]">
          <GhanaSVGHeatMap updateInterval={30000} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LogisticsScheduler />
        <WarehouseCapacityWidget />
        <NetBalanceWidget />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <RecentAuditLogsWidget />
      </div>
    </div>
  );
};

export default AdminDashboard;
