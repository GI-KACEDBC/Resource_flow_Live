// ## Ghana SVG Heat Map Component
// ## Interactive SVG-based map showing regional request urgency with clickable regions
// ## Uses updated Ghana map with 16 regions (ghana-svg-map, kwameboame/untamedthinking)
// ## Uses urgency weights: Critical 2.0, High 1.5, Medium 1.0, Low 0.5
import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, TrendingUp, Activity, Package, X, Warehouse } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import { useNavigate } from 'react-router-dom';
import { RegionalRequestModel } from '../../models/RegionalRequestModel';
import { WarehouseModel } from '../../models/WarehouseModel';
import { normalizeRegionName } from '../../utils/regionNormalizer';
import { requestApi } from '../../services/api';
import { regionPaths, GHANA_MAP_VIEWBOX } from '../../data/ghanaMapPaths';

// Urgency weights for heat intensity scaling (Task 2)
const URGENCY_WEIGHTS = {
  critical: 2.0,
  high: 1.5,
  medium: 1.0,
  low: 0.5,
};

const { width: MAP_WIDTH, height: MAP_HEIGHT } = GHANA_MAP_VIEWBOX;

// ## Get heat color with urgency-weighted intensity (Task 2)
const getHeatColorWithWeight = (urgencyScore, urgencyWeightedHeat = 0) => {
  const baseScore = urgencyScore ?? 0;
  const weighted = urgencyWeightedHeat > 0 ? Math.min(100, baseScore * (urgencyWeightedHeat / Math.max(1, baseScore))) : baseScore;
  const score = Math.max(baseScore, weighted);
  if (score >= 80) return '#EF4444'; // Red - Critical
  if (score >= 60) return '#F59E0B'; // Amber - High
  if (score >= 40) return '#EAB308'; // Yellow - Medium
  if (score >= 20) return '#84CC16'; // Green - Low-Medium
  return '#3B82F6'; // Blue - Low
};

// ## Ghana SVG Heat Map Component
export const GhanaSVGHeatMap = ({
  onRegionClick,
  updateInterval = 30000, // ## Default 30 seconds
}) => {
  // ## State for map data from API (verified, active, non-self-dealing)
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ## State for selected region
  const [selectedRegion, setSelectedRegion] = useState(null);
  // ## State for hovered region (stored as data region name)
  const [hoveredRegion, setHoveredRegion] = useState(null);
  // ## Navigation hook
  const navigate = useNavigate();

  // ## Region stats from API or fallback to mock
  const regionStats = useMemo(() => {
    if (mapData?.regions) {
      return mapData.regions;
    }
    return RegionalRequestModel.calculateRegionStats();
  }, [mapData]);

  // ## Fetch map data from API (Task 1: verified, active, net need)
  const fetchMapData = async () => {
    try {
      const data = await requestApi.getMapData();
      setMapData(data);
      setError(null);
    } catch (err) {
      console.warn('Map data fetch failed, using fallback:', err);
      setError(err?.message);
      setMapData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, updateInterval);
    return () => clearInterval(interval);
  }, [updateInterval]);

  // ## Handle region click - uses SVG region name, normalizes to data name
  const handleRegionClick = (svgRegionName) => {
    const dataRegionName = normalizeRegionName(svgRegionName);
    const stats = regionStats.find(s => s.region === dataRegionName);
    if (stats) {
      setSelectedRegion(dataRegionName); // ## Store as data region name
      if (onRegionClick) {
        onRegionClick(dataRegionName, stats);
      }
    }
  };

  // ## Handle quick donate
  const handleQuickDonate = (region) => {
    navigate('/dashboard/donate', { state: { prefillRegion: region } });
  };

  // ## Get region stats by data region name
  const getRegionStats = (dataRegionName) => {
    return regionStats.find(s => s.region === dataRegionName);
  };

  // ## Get nearest warehouse for a region
  const getNearestWarehouse = (region) => {
    // ## Get warehouses from Model
    const warehouses = WarehouseModel.getAllWarehouses().filter(wh => wh.region === region || wh.city.includes(region));
    if (warehouses.length > 0) {
      const warehouse = warehouses[0];
      const capacityPercent = warehouse.currentOccupancy && warehouse.capacity 
        ? Math.round((warehouse.currentOccupancy / warehouse.capacity) * 100)
        : 0;
      return {
        name: warehouse.name,
        capacity: `${capacityPercent}% used`,
        available: warehouse.capacity - (warehouse.currentOccupancy || 0),
      };
    }
    return null;
  };

  // ## Calculate total estimated value for a region (API uses estimated_value, mock uses estimatedValue)
  const calculateRegionValue = (stats) => {
    if (!stats?.requests) return 0;
    return stats.requests.reduce((sum, req) => {
      return sum + (req.estimated_value ?? req.estimatedValue ?? 0);
    }, 0);
  };

  // ## Normalize stats for display (API snake_case, mock camelCase)
  const norm = (s, a, b) => (s?.[a] ?? s?.[b] ?? 0);
  const normStats = (stats) => stats ? {
    totalRequests: norm(stats, 'total_requests', 'totalRequests'),
    criticalRequests: norm(stats, 'critical_requests', 'criticalRequests'),
    highUrgencyRequests: norm(stats, 'high_urgency_requests', 'highUrgencyRequests'),
    mediumUrgencyRequests: norm(stats, 'medium_urgency_requests', 'mediumUrgencyRequests'),
    lowUrgencyRequests: norm(stats, 'low_urgency_requests', 'lowUrgencyRequests'),
    urgencyScore: norm(stats, 'urgency_score', 'urgencyScore'),
    requests: stats.requests ?? [],
  } : null;

  if (loading && !mapData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-500">
        <span>Loading heat map data...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {error && (
        <div className="mb-2 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded">
          Using fallback data. {error}
        </div>
      )}
      {/* ## SVG Map Container */}
      <div className="rounded-2xl flex-1 flex flex-col min-h-0">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Heat Map</h3>
            <p className="text-xs text-slate-500 mt-1">Click on a region to view requests</p>
          </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-slate-600">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-slate-600">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-slate-600">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-slate-600">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-dashed border-slate-400 bg-slate-200/50"></div>
              <span className="text-slate-600">Stale/Flagged</span>
            </div>
          </div>
        </div>

        {/* ## SVG Map Container - Loads actual SVG file with interactive overlays */}
        {/* ## Constrained to parent container - uses aspect ratio to maintain proportions */}
        <div className="relative w-full flex-1 bg-slate-50 rounded-lg p-4 overflow-hidden min-h-0" style={{ aspectRatio: `${MAP_WIDTH}/${MAP_HEIGHT}`, maxHeight: '100%' }}>
          {/* ## Container for map image and interactive overlay */}
          <div className="relative w-full h-full" style={{ position: 'relative' }}>
            {/* ## Background map - updated Ghana map with 16 regions */}
            <img
              src="/images/Ghana Map.svg"
              alt="Ghana Map"
              className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
              style={{ 
                pointerEvents: 'none',
                display: 'block'
              }}
            />
            
            {/* ## Interactive Overlay SVG - paths from ghana-svg-map (viewBox 595.28 x 841.89) */}
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="absolute top-0 left-0 w-full h-full"
              style={{ pointerEvents: 'all' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {Object.entries(regionPaths).map(([svgRegionName, regionData]) => {
                const dataRegionName = normalizeRegionName(svgRegionName);
                const stats = getRegionStats(dataRegionName);
                const urgencyScore = stats?.urgency_score ?? stats?.urgencyScore ?? 0;
                const urgencyWeightedHeat = stats?.urgency_weighted_heat ?? 0;
                const hasStaleData = stats?.has_stale_data ?? stats?.flagged_requests > 0;
                const fillColor = hasStaleData ? '#64748B' : getHeatColorWithWeight(urgencyScore, urgencyWeightedHeat);
                const isHovered = hoveredRegion === dataRegionName;
                const isSelected = selectedRegion === dataRegionName;

                return (
                  <path
                    key={svgRegionName}
                    id={svgRegionName}
                    d={regionData.path}
                    fill={fillColor}
                    fillOpacity={isHovered || isSelected ? 0.7 : 0.5}
                    stroke={isSelected ? '#60A5FA' : isHovered ? '#94A3B8' : hasStaleData ? '#94A3B8' : 'transparent'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : hasStaleData ? 1.5 : 0}
                    strokeDasharray={hasStaleData ? '4 2' : 'none'}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredRegion(dataRegionName)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => handleRegionClick(svgRegionName)}
                    style={{
                      filter: isSelected ? 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.6))' : 
                               isHovered ? 'drop-shadow(0 0 4px rgba(148, 163, 184, 0.4))' : 'none',
                    }}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* ## Tooltip for hovered region */}
        {hoveredRegion && !selectedRegion && (() => {
          const raw = getRegionStats(hoveredRegion);
          if (!raw) return null;
          const stats = normStats(raw);
          const regionValue = calculateRegionValue(raw);
          const nearestWarehouse = getNearestWarehouse(hoveredRegion);
          
          return (
            <div className="absolute bg-slate-900/95 backdrop-blur-sm text-white p-4 rounded-lg border border-white/20 shadow-xl z-10"
              style={{ top: '10px', right: '10px', minWidth: '250px' }}>
              <h4 className="font-bold border-b border-white/10 pb-2 mb-3 flex items-center gap-2">
                <MapPin size={16} />
                {raw.region} Region
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Active Requests:</span>
                  <span className="font-mono font-bold text-white">{stats.totalRequests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Net Need:</span>
                  <span className="font-mono font-bold text-white">{raw.net_need ?? 0} {(raw.requests?.[0]?.unit) ?? 'units'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total Value:</span>
                  <span className="font-mono font-bold text-emerald-400">{formatGHC(regionValue)}</span>
                </div>
                <div className={`flex items-center justify-between ${
                  stats.urgencyScore >= 80 ? 'text-red-400' :
                  stats.urgencyScore >= 60 ? 'text-amber-400' :
                  stats.urgencyScore >= 40 ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}>
                  <span>Urgency:</span>
                  <span className="font-bold">{RegionalRequestModel.getUrgencyLabel(stats.urgencyScore)}</span>
                </div>
                {(raw.flagged_requests ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-amber-400 text-xs">
                    <span>Stale data:</span>
                    <span className="font-bold">{raw.flagged_requests} flagged</span>
                  </div>
                )}
                {nearestWarehouse && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <Warehouse size={14} className="text-slate-400" />
                    <div className="flex-1">
                      <p className="text-slate-300 text-[10px]">Nearest Warehouse</p>
                      <p className="text-white font-medium">{nearestWarehouse.name}</p>
                      <p className="text-slate-400 text-[10px]">{nearestWarehouse.capacity}</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleQuickDonate(hoveredRegion)}
                className="mt-3 w-full py-2 bg-emerald-500 hover:bg-emerald-600 rounded text-xs font-black uppercase transition flex items-center justify-center gap-2"
              >
                <TrendingUp size={14} />
                Donate to this Region
              </button>
            </div>
          );
        })()}
      </div>

      {/* ## Modal for selected region */}
      {selectedRegion && (() => {
        const raw = getRegionStats(selectedRegion);
        if (!raw) return null;
        const stats = normStats(raw);
        const regionValue = calculateRegionValue(raw);
        const nearestWarehouse = getNearestWarehouse(selectedRegion);

        // ## Group requests by item type (API: title, quantity_required, unit; mock: item, specification, quantity)
        const requests = raw.requests ?? [];
        const requestsByItem = requests.reduce((acc, req) => {
          const item = req.title ?? req.item ?? 'Request';
          const spec = req.unit ?? req.specification ?? '';
          const key = `${item} - ${spec}`;
          const qty = req.net_need ?? req.quantity_required ?? req.quantity ?? 0;
          const val = req.estimated_value ?? req.estimatedValue ?? 0;
          if (!acc[key]) {
            acc[key] = { ...req, totalQuantity: 0, totalValue: 0, urgency: req.urgency_level ?? req.urgency ?? 'Medium' };
          }
          acc[key].totalQuantity += qty;
          acc[key].totalValue += val;
          return acc;
        }, {});

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 max-w-4xl w-full max-h-[85vh] overflow-hidden">
              {/* ## Modal Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="text-blue-600" size={24} />
                    {raw.region} Region
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {stats.totalRequests} active request{stats.totalRequests !== 1 ? 's' : ''}
                    {raw.net_need > 0 && ` • Net need: ${raw.net_need} ${raw.requests?.[0]?.unit ?? 'units'}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>

              {/* ## Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {/* ## Regional Statistics Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-red-600" size={16} />
                      <p className="text-xs text-red-600 font-medium">Critical</p>
                    </div>
                    <p className="text-xl font-bold text-red-700">{stats.criticalRequests}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-amber-600" size={16} />
                      <p className="text-xs text-amber-600 font-medium">High</p>
                    </div>
                    <p className="text-xl font-bold text-amber-700">{stats.highUrgencyRequests}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <p className="text-xs text-yellow-600 font-medium mb-2">Medium</p>
                    <p className="text-xl font-bold text-yellow-700">{stats.mediumUrgencyRequests}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-2">Low</p>
                    <p className="text-xl font-bold text-blue-700">{stats.lowUrgencyRequests}</p>
                  </div>
                </div>

                {/* ## Financial Summary */}
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-200 mb-6">
                  <p className="text-xs text-slate-600 font-medium mb-1">Total Regional Demand Value</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatGHC(regionValue)}</p>
                </div>

                {/* ## Warehouse Proximity */}
                {nearestWarehouse && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <p className="text-xs text-slate-600 font-medium mb-1">Nearest Warehouse</p>
                    <p className="text-sm font-bold text-slate-900">{nearestWarehouse.name}</p>
                    <p className="text-xs text-slate-500">Capacity: {nearestWarehouse.capacity} • {nearestWarehouse.available.toLocaleString()} m² available</p>
                  </div>
                )}

                {/* ## Regional Demand by Item */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Regional Demand Summary
                  </h4>
                  {Object.keys(requestsByItem).length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No active requests in this region</p>
                  ) : (
                    Object.entries(requestsByItem).map(([itemKey, item]) => (
                      <div
                        key={itemKey}
                        className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package size={16} className="text-slate-400" />
                              <h5 className="font-bold text-slate-900">{itemKey}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.urgency === 'Critical' ? 'bg-red-100 text-red-700' :
                                item.urgency === 'High' ? 'bg-amber-100 text-amber-700' :
                                item.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {item.urgency}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Total Quantity Needed</p>
                                <p className="font-semibold text-slate-900">
                                  {item.totalQuantity.toLocaleString()} {item.unit ?? 'units'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Estimated Value</p>
                                <p className="font-semibold text-emerald-600">
                                  {formatGHC(item.totalValue)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleQuickDonate(selectedRegion)}
                            className="ml-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
                          >
                            <TrendingUp size={16} />
                            Donate
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ## Modal Footer */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleQuickDonate(selectedRegion)}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex items-center gap-2"
                >
                  <TrendingUp size={16} />
                  Quick Donate to {raw.region}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
