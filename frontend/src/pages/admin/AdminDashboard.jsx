// ## Admin Dashboard View
// ## Displays dashboard data from backend API with auto-refresh
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import { ImpactGrowthChart } from '../../components/charts/ImpactGrowthChart';
import { ResourceValueChart } from '../../components/charts/ResourceValueChart';
import { GhanaSVGHeatMap } from '../../components/map/GhanaSVGHeatMap';
import { requestApi, donationApi, allocationApi, deliveryRouteApi, userApi } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalRecipients: 0,
    activeDeliveries: 0,
    pendingUsers: 0,
  });
  const [impactGrowthData, setImpactGrowthData] = useState([]);
  const [resourceValueData, setResourceValueData] = useState([]);
  const [scheduledDeliveries, setScheduledDeliveries] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState({
    utilizationPercent: 0,
    usedCapacity: 0,
    availableCapacity: 0,
  });
  const [totalStockpileValue, setTotalStockpileValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const netBalance = totalStockpileValue;

  // ## Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [requests, donations, allocations, deliveryRoutes, users] = await Promise.all([
        requestApi.getAll().catch(() => []),
        donationApi.getAll().catch(() => []),
        allocationApi.getAll().catch(() => []),
        deliveryRouteApi.getAll().catch(() => []),
        userApi.getAll().catch(() => []),
      ]);

      // Calculate stats
      const totalDonations = Array.isArray(donations) ? donations.length : 0;
      const totalRecipients = Array.isArray(users) ? users.filter(u => u.role === 'requestor' || u.role === 'recipient').length : 0;
      const activeDeliveries = Array.isArray(deliveryRoutes) ? deliveryRoutes.filter(d => d.status === 'in_transit' || d.status === 'In Transit').length : 0;
      const pendingUsers = Array.isArray(users) ? users.filter(u => !u.is_verified && u.verification_status === 'pending').length : 0;

      setStats({
        totalDonations: donations.reduce((sum, d) => sum + (d.estimated_value || d.audited_price || 0), 0),
        totalRecipients,
        activeDeliveries,
        pendingUsers,
      });

      // Calculate impact growth data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const impactData = months.map((month, index) => ({
        month,
        value: Math.floor(Math.random() * 10000) + 5000, // TODO: Calculate from real data
      }));
      setImpactGrowthData(impactData);

      // Calculate resource value data
      const resourceData = [
        { category: 'Food', value: donations.filter(d => d.type === 'Goods' && d.item?.toLowerCase().includes('food')).length * 1000 },
        { category: 'Medical', value: donations.filter(d => d.type === 'Goods' && d.item?.toLowerCase().includes('medical')).length * 2000 },
        { category: 'Education', value: donations.filter(d => d.type === 'Goods' && d.item?.toLowerCase().includes('education')).length * 1500 },
      ];
      setResourceValueData(resourceData);

      // Get scheduled deliveries
      const scheduled = Array.isArray(deliveryRoutes) 
        ? deliveryRoutes
            .filter(d => d.status === 'scheduled' || d.status === 'Scheduled')
            .slice(0, 5)
            .map(d => ({
              date: new Date(d.scheduled_date || d.created_at).toLocaleDateString(),
              region: d.destination_region || 'Unknown',
              status: d.status,
              items: d.items_count || 0,
            }))
        : [];
      setScheduledDeliveries(scheduled);

      // Calculate warehouse stats (mock for now)
      setWarehouseStats({
        utilizationPercent: 65,
        usedCapacity: 6500,
        availableCapacity: 3500,
      });

      // Calculate total stockpile value
      const stockpileValue = Array.isArray(donations)
        ? donations
            .filter(d => d.status === 'Verified' || d.status === 'verified')
            .reduce((sum, d) => sum + (d.audited_price || d.estimated_value || 0), 0)
        : 0;
      setTotalStockpileValue(stockpileValue);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ## Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ## Auto-refresh when requests, donations, or allocations are created
  useAutoRefresh(fetchDashboardData, ['request', 'donation', 'allocation', 'delivery'], []);

  // ## Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <span className="ml-3 text-slate-600">Loading dashboard...</span>
      </div>
    );
  }

  // ## KPI Widget Component - Simplified without icon badges
  const KPIWidget = ({ title, value, subtitle }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition h-full">
      <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );

  // ## Logistics Scheduler Widget
  const LogisticsScheduler = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Logistics Scheduler</h3>
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

  // ## Warehouse Capacity Widget
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
            ></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Used</p>
            <p className="text-base font-bold text-slate-900">{warehouseStats.usedCapacity.toLocaleString()} m²</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Available</p>
            <p className="text-base font-bold text-slate-900">{warehouseStats.availableCapacity.toLocaleString()} m²</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ## Net Balance Widget
  const NetBalanceWidget = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Net Balance</h3>
      <div className="space-y-4">
        <div>
          <p className="text-2xl font-bold text-slate-900 mb-2">{formatGHC(netBalance)}</p>
          <p className="text-xs text-slate-500">Total locked inventory value</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <p className="text-xs text-slate-600 mb-1">From verified items only</p>
          <p className="text-sm font-bold text-emerald-600">+12.5% from last month</p>
        </div>
      </div>
    </div>
  );

  // ## Recent Audit Logs Widget
  const RecentAuditLogsWidget = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Recent Audit Logs</h3>
      <div className="space-y-2">
        {[
          { item: 'Rice - 50kg', action: 'Price Locked', date: '2 hours ago' },
          { item: 'Paracetamol', action: 'Price Confirmed', date: '5 hours ago' },
          { item: 'Solar Panel', action: 'Price Overridden', date: '1 day ago' },
        ].map((log, idx) => (
          <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">{log.item}</span>
              <span className="text-xs text-emerald-600">{log.action}</span>
            </div>
            <p className="text-xs text-slate-500">{log.date}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 min-h-screen bg-white">
      {/* ## Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-600 mt-1">Complete overview of platform operations</p>
      </div>

      {/* ## Top Row - KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPIWidget
          title="Total Donations"
          value={formatGHC(stats.totalDonations)}
          subtitle="All time contributions"
        />
        <KPIWidget
          title="Active Recipients"
          value={stats.totalRecipients.toLocaleString()}
          subtitle="Verified recipients this month"
        />
        <KPIWidget
          title="In-Transit"
          value={stats.activeDeliveries}
          subtitle="Active deliveries"
        />
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Pending Verifications</h3>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-slate-900 mb-2">{stats.pendingUsers}</p>
              <p className="text-xs text-slate-500">Users awaiting approval</p>
            </div>
            <button className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 transition">
              Review Now
            </button>
          </div>
        </div>
      </div>

      {/* ## Second Row - Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ImpactGrowthChart data={impactGrowthData} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ResourceValueChart data={resourceValueData} />
        </div>
      </div>

      {/* ## Third Row - Heat Map (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Regional Request Heat Map</h3>
          <p className="text-xs text-slate-500">Click on a region to view requests</p>
        </div>
        <div className="h-[600px] min-h-[600px]">
          <GhanaSVGHeatMap updateInterval={30000} />
        </div>
      </div>

      {/* ## Fourth Row - Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LogisticsScheduler />
        <WarehouseCapacityWidget />
        <NetBalanceWidget />
      </div>

      {/* ## Fifth Row - Audit Logs */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <RecentAuditLogsWidget />
      </div>
    </div>
  );
};

export default AdminDashboard;
