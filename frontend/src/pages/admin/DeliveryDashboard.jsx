// ## Delivery Dashboard Component
// ## Timeline view of delivery status updates using DeliveryRoutes, Logistics, and Live Trips
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Navigation, Package, Radio, ChevronRight } from 'lucide-react';
import { deliveryRouteApi, logisticApi, tripApi } from '../../services/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LiveMapTracker } from '../../components/logistics/LiveMapTracker';
import { RouteMapView } from '../../components/logistics/RouteMapView';
import { formatGHC } from '../../utils/currency';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [deliveryRoutes, setDeliveryRoutes] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('routes'); // 'routes' | 'trips'
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesData, logisticsData, tripsData] = await Promise.all([
        deliveryRouteApi.getAll(),
        logisticApi.getAll(),
        tripApi.getAll().catch(() => []),
      ]);
      setDeliveryRoutes(Array.isArray(routesData) ? routesData : []);
      setLogistics(Array.isArray(logisticsData) ? logisticsData : []);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error) {
      console.error('Error loading delivery data:', error);
      setDeliveryRoutes([]);
      setLogistics([]);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // ## Poll for updates every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ## Auto-refresh when deliveries, allocations, or trips are created
  useAutoRefresh(loadData, ['delivery', 'allocation', 'trip'], []);

  // Ensure deliveryRoutes is an array before filtering
  const filteredRoutes = Array.isArray(deliveryRoutes) ? deliveryRoutes.filter((route) => {
    const matchesSearch =
      (route.route_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (route.destination_city || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const getRouteLogistics = (routeId) => {
    return Array.isArray(logistics) ? logistics.filter(log => log && log.delivery_route_id === routeId) : [];
  };

  /** Route scheduled_date is date-only; avoid implying a false time. */
  const formatDateOnly = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * In Transit must not fall back to created_at (same as "Booked") and must not use a
   * last_location_update that parses before booking (common date-only / UTC midnight issue).
   */
  const getInTransitTimestamp = (logistic) => {
    const created = new Date(logistic.created_at).getTime();
    const updated = new Date(logistic.updated_at).getTime();
    if (logistic.last_location_update) {
      const last = new Date(logistic.last_location_update).getTime();
      if (Number.isFinite(last) && last >= created) {
        return logistic.last_location_update;
      }
    }
    if (Number.isFinite(updated) && updated >= created) {
      return logistic.updated_at;
    }
    return logistic.updated_at;
  };

  const getStatusTimeline = (logistic, route) => {
    const timeline = [];

    if (route?.scheduled_date) {
      timeline.push({
        status: 'Scheduled delivery',
        date: route.scheduled_date,
        dateOnly: true,
        icon: Calendar,
        color: 'bg-blue-100 text-blue-700',
      });
    }

    timeline.push({
      status: 'Booked',
      date: logistic.created_at,
      dateOnly: false,
      icon: Package,
      color: 'bg-slate-100 text-slate-700',
    });

    if (logistic.status === 'In Transit' || logistic.status === 'Delivered') {
      timeline.push({
        status: 'In Transit',
        date: getInTransitTimestamp(logistic),
        dateOnly: false,
        icon: Truck,
        color: 'bg-amber-100 text-amber-700',
      });
    }

    if (logistic.status === 'Delivered') {
      timeline.push({
        status: 'Delivered',
        date: logistic.updated_at,
        dateOnly: false,
        icon: CheckCircle,
        color: 'bg-emerald-100 text-emerald-700',
      });
    }

    if (logistic.status === 'Delayed') {
      timeline.push({
        status: 'Delayed',
        date: logistic.updated_at,
        dateOnly: false,
        icon: AlertCircle,
        color: 'bg-red-100 text-red-700',
      });
    }

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return timeline;
  };

  if (loading && (!Array.isArray(deliveryRoutes) || deliveryRoutes.length === 0)) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading delivery data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Delivery Dashboard</h2>
          <p className="text-slate-600 mt-1">Delivery routes, logistics, and live trip tracking with verification.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/logistics')}>
            Fleet Management
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/trips')}>
            All Trips
          </Button>
          <Button onClick={loadData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs: Delivery Routes | Live Trips */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => { setActiveTab('routes'); setSelectedTrip(null); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === 'routes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Delivery Routes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trips')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === 'trips'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Live Trips
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Routes</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{Array.isArray(deliveryRoutes) ? deliveryRoutes.length : 0}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Scheduled</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {Array.isArray(deliveryRoutes) ? deliveryRoutes.filter(r => r && r.status === 'Scheduled').length : 0}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">In Transit</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {Array.isArray(deliveryRoutes) ? deliveryRoutes.filter(r => r && r.status === 'In Transit').length : 0}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Delivered</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {Array.isArray(deliveryRoutes) ? deliveryRoutes.filter(r => r && r.status === 'Delivered').length : 0}
          </p>
        </div>
      </div>

      {/* Live Trips Stats (when on trips tab) */}
      {activeTab === 'trips' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600">Active Trips</p>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {trips.filter(t => ['pending', 'started', 'arrived'].includes(t.status)).length}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-slate-600">Completed</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">
              {trips.filter(t => t.status === 'completed').length}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filter (routes tab only) */}
      {activeTab === 'routes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search routes..."
                className="pl-10"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Live Trips: List + Map */}
      {activeTab === 'trips' && (
        <div className="space-y-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-slate-800 mb-3">Trips</h3>
              {trips.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                  <Radio className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">No trips yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        selectedTrip?.id === trip.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">
                            {trip.request?.title || `Trip #${trip.id}`}
                          </p>
                          <p className="text-sm text-slate-500">
                            Driver: {trip.driver?.name || '—'} • {trip.status}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-3">Live Map</h3>
              {selectedTrip ? (
                <div className="space-y-2">
                  <LiveMapTracker tripId={selectedTrip.id} trip={selectedTrip} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/trips/${selectedTrip.id}`)}
                  >
                    View Trip Details
                  </Button>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl h-[400px] flex items-center justify-center border border-slate-200">
                  <p className="text-slate-500">Select a trip to view live location</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Routes with Timeline (routes tab only) */}
      {activeTab === 'routes' && (
      <div className="space-y-6">
        {filteredRoutes.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <Truck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No delivery routes found</p>
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const routeLogistics = getRouteLogistics(route.id);
            
            return (
              <div
                key={route.id}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">{route.route_name}</h3>
                      <StatusBadge status={route.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{route.destination_city}, {route.destination_region}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Scheduled {formatDateOnly(route.scheduled_date)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
                  >
                    {selectedRoute?.id === route.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Route Map - Uber/Bolt style when View Details expanded */}
                {selectedRoute?.id === route.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <RouteMapView
                      route={route}
                      logistics={route.logistics || routeLogistics}
                      trip={trips.find((t) => t.delivery_route_id === route.id)}
                      routeName={route.route_name}
                    />
                  </div>
                )}

                {/* Timeline for each package */}
                {routeLogistics.length > 0 && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">
                      Packages ({routeLogistics.length})
                    </h4>
                    {routeLogistics.map((logistic) => {
                      const timeline = getStatusTimeline(logistic, route);
                      
                      return (
                        <div
                          key={logistic.id}
                          className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-mono text-sm font-semibold text-slate-900">
                                {logistic.tracking_number}
                              </p>
                              <p className="text-xs text-slate-500">
                                Allocation ID: {logistic.allocation_id}
                              </p>
                            </div>
                            <StatusBadge status={logistic.status} />
                          </div>

                          {/* Timeline */}
                          <div className="relative">
                            <div className="flex items-center gap-4">
                              {timeline.map((step, idx) => {
                                const StepIcon = step.icon;
                                const isLast = idx === timeline.length - 1;
                                
                                return (
                                  <React.Fragment key={idx}>
                                    <div className="flex items-center gap-2">
                                      <div className={`p-2 rounded-lg ${step.color}`}>
                                        <StepIcon size={16} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-slate-800">{step.status}</p>
                                        <p className="text-xs text-slate-500">
                                          {step.dateOnly ? formatDateOnly(step.date) : formatDate(step.date)}
                                        </p>
                                      </div>
                                    </div>
                                    {!isLast && (
                                      <div className="flex-1 h-0.5 bg-slate-300" />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>

                          {/* Location Updates */}
                          {logistic.location_updates && logistic.location_updates.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-2">Recent Locations:</p>
                              <div className="space-y-1">
                                {logistic.location_updates.slice(-3).reverse().map((update, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                                    <Navigation size={12} />
                                    <span>
                                      {update.latitude.toFixed(4)}, {update.longitude.toFixed(4)}
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span>{formatDate(update.timestamp)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
