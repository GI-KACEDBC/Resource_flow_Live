// ## Delivery Tracking View
// ## Admin interface for tracking deliveries using DeliveryRoutes and Logistics
import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar, Package, Search, Filter, Navigation, Clock, CheckCircle } from 'lucide-react';
import { deliveryRouteApi, logisticApi } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';

const DeliveryTracking = () => {
  const [deliveryRoutes, setDeliveryRoutes] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesData, logisticsData] = await Promise.all([
        deliveryRouteApi.getAll(),
        logisticApi.getAll(),
      ]);
      setDeliveryRoutes(routesData);
      setLogistics(logisticsData);
    } catch (error) {
      console.error('Error loading delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = deliveryRoutes.filter((route) => {
    const matchesSearch = 
      route.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination_region.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getRouteLogistics = (routeId) => {
    return logistics.filter(log => log.delivery_route_id === routeId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold text-slate-800">Delivery Tracking</h2>
          <p className="text-slate-600 mt-1">Track and manage delivery routes and logistics</p>
        </div>
        <Button onClick={loadData}>
          Refresh
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by route name, city, or region..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
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

      {/* Delivery Routes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRoutes.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Truck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No delivery routes found</p>
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const routeLogistics = getRouteLogistics(route.id);
            
            return (
              <div
                key={route.id}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRoute(route)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{route.route_name}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                      <MapPin size={14} />
                      <span>{route.destination_city}, {route.destination_region}</span>
                    </div>
                  </div>
                  <StatusBadge status={route.status} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-slate-600">Scheduled: {formatDate(route.scheduled_date)}</span>
                  </div>
                  {routeLogistics.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package size={14} className="text-slate-400" />
                      <span className="text-slate-600">{routeLogistics.length} package(s)</span>
                    </div>
                  )}
                </div>

                {routeLogistics.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Tracking Numbers:</p>
                    <div className="space-y-1">
                      {routeLogistics.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-700">{log.tracking_number}</span>
                          <StatusBadge status={log.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Route Detail Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedRoute.route_name}</h3>
                <p className="text-sm text-slate-500 mt-1">Route Details</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedRoute(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-6">
              {/* Route Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Route Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Destination</p>
                    <p className="font-medium text-slate-900">{selectedRoute.destination_address}</p>
                    <p className="text-slate-600">{selectedRoute.destination_city}, {selectedRoute.destination_region}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <StatusBadge status={selectedRoute.status} />
                  </div>
                  <div>
                    <p className="text-slate-500">Scheduled Date</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedRoute.scheduled_date)}</p>
                  </div>
                  {selectedRoute.driver_id && (
                    <div>
                      <p className="text-slate-500">Driver ID</p>
                      <p className="font-medium text-slate-900">{selectedRoute.driver_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Logistics Tracking */}
              {getRouteLogistics(selectedRoute.id).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">Packages on Route</h4>
                  <div className="space-y-3">
                    {getRouteLogistics(selectedRoute.id).map((log) => (
                      <div key={log.id} className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-mono text-sm font-semibold text-slate-900">{log.tracking_number}</p>
                            <p className="text-xs text-slate-500">Allocation ID: {log.allocation_id}</p>
                          </div>
                          <StatusBadge status={log.status} />
                        </div>
                        {log.location_updates && log.location_updates.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Location Updates:</p>
                            <div className="space-y-1">
                              {log.location_updates.slice(-3).reverse().map((update, idx) => (
                                <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                                  <Navigation size={12} />
                                  <span>
                                    {update.latitude.toFixed(4)}, {update.longitude.toFixed(4)} - {new Date(update.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryTracking;
