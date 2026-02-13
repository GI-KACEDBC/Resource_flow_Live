// ## Fleet Management Component
// ## Manages logistics, deliveries, and fleet operations
// ## Uses same backend data as Delivery Dashboard (delivery routes + logistics)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Calendar, User, Clock, CheckCircle, AlertCircle, Plus, Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatGHC } from '../../utils/currency';
import { deliveryRouteApi, logisticApi } from '../../services/api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const FleetManagement = () => {
  const navigate = useNavigate();
  const [deliveryRoutes, setDeliveryRoutes] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  // ## Load delivery routes and logistics from API (same data as Delivery Dashboard)
  const loadData = async () => {
    try {
      setLoading(true);
      const [routesData, logisticsData] = await Promise.all([
        deliveryRouteApi.getAll(),
        logisticApi.getAll(),
      ]);
      setDeliveryRoutes(Array.isArray(routesData) ? routesData : []);
      setLogistics(Array.isArray(logisticsData) ? logisticsData : []);
    } catch (error) {
      console.error('Error loading fleet data:', error);
      setDeliveryRoutes([]);
      setLogistics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useAutoRefresh(loadData, ['delivery', 'allocation'], []);

  // ## Get route display status (Delayed comes from logistics)
  const getRouteDisplayStatus = (route) => {
    const routeLogistics = Array.isArray(logistics)
      ? logistics.filter(log => log && log.delivery_route_id === route.id)
      : [];
    const hasDelayed = routeLogistics.some(log => log.status === 'Delayed');
    if (hasDelayed) return 'Delayed';
    return route.status;
  };

  // ## Map routes to table rows with computed values
  const deliveries = deliveryRoutes.map((route) => {
    const routeLogistics = Array.isArray(logistics)
      ? logistics.filter(log => log && log.delivery_route_id === route.id)
      : [];
    const displayStatus = getRouteDisplayStatus(route);
    const totalValue = routeLogistics.reduce((sum, log) => sum + (log.estimated_value || 0), 0);
    return {
      id: route.id,
      route_name: route.route_name,
      recipient: route.destination_city,
      region: route.destination_region,
      address: route.destination_address,
      warehouse: route.warehouse?.name || `Warehouse #${route.warehouse_id}`,
      scheduledDate: route.scheduled_date,
      actualArrivalDate: route.actual_arrival_date,
      status: displayStatus,
      driver: route.driver?.name || '—',
      vehicle: route.vehicle_id || '—',
      estimatedValue: totalValue,
      packageCount: routeLogistics.length,
      logistics: routeLogistics,
    };
  });

  // ## Filter deliveries by status
  const filteredDeliveries = filterStatus === 'All'
    ? deliveries
    : deliveries.filter(d => d.status === filterStatus);

  // ## Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Scheduled':
        return { color: 'bg-blue-100 text-blue-700', icon: Calendar };
      case 'In Transit':
        return { color: 'bg-amber-100 text-amber-700', icon: Truck };
      case 'Delivered':
        return { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle };
      case 'Delayed':
        return { color: 'bg-red-100 text-red-700', icon: AlertCircle };
      default:
        return { color: 'bg-slate-100 text-slate-700', icon: Clock };
    }
  };

  // ## Calculate statistics
  const stats = {
    total: deliveries.length,
    scheduled: deliveries.filter(d => d.status === 'Scheduled').length,
    inTransit: deliveries.filter(d => d.status === 'In Transit').length,
    delivered: deliveries.filter(d => d.status === 'Delivered').length,
    delayed: deliveries.filter(d => d.status === 'Delayed').length,
    totalValue: deliveries.reduce((sum, d) => sum + (d.estimatedValue || 0), 0),
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Fleet Management</h2>
          <p className="text-slate-600 mt-1">Manage logistics, deliveries, and fleet operations. Same data as Delivery Dashboard.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/delivery-dashboard')}>
            Delivery Dashboard
          </Button>
          <Button icon={Plus} onClick={() => navigate('/dashboard/allocate')}>
            Schedule Delivery
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Deliveries</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Scheduled</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{stats.scheduled}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">In Transit</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.inTransit}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Delivered</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.delivered}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Value</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatGHC(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700">Filter by Status:</span>
          <div className="flex gap-2">
            {['All', 'Scheduled', 'In Transit', 'Delivered', 'Delayed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Delivery ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Driver/Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No deliveries found</p>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => {
                  const statusConfig = getStatusConfig(delivery.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-slate-900">{delivery.route_name || `Route #${delivery.id}`}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{delivery.recipient}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {delivery.region}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-slate-700">
                            {delivery.packageCount} {delivery.packageCount === 1 ? 'package' : 'packages'}
                          </div>
                          {delivery.logistics?.slice(0, 2).map((log) => (
                            <div key={log.id} className="text-xs text-slate-500 font-mono">
                              {log.tracking_number}
                            </div>
                          ))}
                          {delivery.packageCount > 2 && (
                            <div className="text-xs text-slate-400">+{delivery.packageCount - 2} more</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-700">{delivery.warehouse}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-slate-700">
                            {new Date(delivery.scheduledDate).toLocaleDateString()}
                          </span>
                        </div>
                        {delivery.actualArrivalDate && (
                          <div className="text-xs text-emerald-600 mt-1">
                            Delivered: {new Date(delivery.actualArrivalDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-700 flex items-center gap-1">
                            <User size={12} />
                            {delivery.driver}
                          </div>
                          <div className="text-slate-500 text-xs mt-1">{delivery.vehicle}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatGHC(delivery.estimatedValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusConfig.color}`}>
                          <StatusIcon size={12} />
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default FleetManagement;
