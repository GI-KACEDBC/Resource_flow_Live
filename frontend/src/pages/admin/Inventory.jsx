// ## Inventory Management Component
// ## Displays granular inventory table with traceability and pricing information
import React, { useState, useMemo } from 'react';
import { Package, Search, MapPin, User, Calendar, AlertTriangle, TrendingUp, CheckCircle, Clock, Lock, Coins } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatGHC } from '../../utils/currency';
import { WarehouseModel } from '../../models/WarehouseModel';

const Inventory = () => {
  // ## Inventory items state - get from Model
  const [inventory, setInventory] = useState(WarehouseModel.getAllInventory());
  // ## Search query state for filtering
  const [searchQuery, setSearchQuery] = useState('');

  // ## Calculate stock health metrics
  // ## Only uses locked prices for financial reporting accuracy
  const stockHealth = useMemo(() => {
    const totalItems = inventory.length;
    // ## Sum only locked prices for financial reporting
    const totalValue = inventory.reduce((sum, item) => {
      if (item.priceStatus === 'Locked' && item.value) {
        return sum + (item.value * item.quantity);
      }
      return sum;
    }, 0);
    // ## Count items by status
    const availableItems = inventory.filter(item => item.status === 'Available').length;
    const reservedItems = inventory.filter(item => item.status === 'Reserved').length;
    const disbursedItems = inventory.filter(item => item.status === 'Disbursed').length;
    const unavailableItems = inventory.filter(item => item.status === 'Unavailable').length;
    
    // ## Low stock alert: items with quantity less than 50 (only available items)
    const lowStockAlerts = inventory.filter(item => item.quantity < 50 && item.status === 'Available').length;
    
    // ## Near expiry items: items expiring within 90 days (only available items)
    const today = new Date();
    const nearExpiryItems = inventory.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      // ## Calculate days until expiry
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 90 && daysUntilExpiry > 0 && item.status === 'Available';
    }).length;

    return {
      totalItems,
      totalValue,
      lowStockAlerts,
      nearExpiryItems,
      availableItems,
      reservedItems,
      disbursedItems,
    };
  }, [inventory]);

  // ## Filter inventory items based on search query
  const filteredInventory = useMemo(() => {
    // ## Return all items if search is empty
    if (!searchQuery.trim()) return inventory;
    
    // ## Search across multiple fields
    const query = searchQuery.toLowerCase();
    return inventory.filter(item => 
      item.itemName.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      item.batchNumber?.toLowerCase().includes(query) ||
      item.colocation.facility.toLowerCase().includes(query) ||
      item.colocation.subLocation.toLowerCase().includes(query) ||
      item.donorInfo.name.toLowerCase().includes(query)
    );
  }, [inventory, searchQuery]);

  // ## Calculate days until expiry date
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    // ## Calculate difference in days
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // ## Get color-coded expiry status for visual indicators
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { color: 'text-slate-500', label: 'N/A' };
    
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return { color: 'text-slate-500', label: 'N/A' };
    
    // ## Color code by urgency: expired, critical (30 days), warning (90 days), safe
    if (days < 0) return { color: 'text-red-600', label: 'Expired' };
    if (days <= 30) return { color: 'text-red-600', label: `${days} days` };
    if (days <= 90) return { color: 'text-amber-600', label: `${days} days` };
    return { color: 'text-emerald-600', label: `${days} days` };
  };

  // ## Get color styling for inventory status badges
  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-700';
      case 'Reserved':
        return 'bg-amber-100 text-amber-700';
      case 'Disbursed':
        return 'bg-slate-100 text-slate-700';
      case 'Unavailable':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // ## Get price status badge component with icon
  const getPriceStatusBadge = (priceStatus) => {
    switch (priceStatus) {
      case 'Estimated':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
            <Coins className="w-3 h-3" />
            Estimated
          </span>
        );
      case 'Pending Review':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case 'Locked':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Inventory Management</h2>
        <p className="text-slate-500 mt-1">Track physical donations from verification to disbursement</p>
      </div>

      {/* Stock Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-600">Total Items</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stockHealth.totalItems}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-600">Total Value</p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {formatGHC(stockHealth.totalValue)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-600">Low Stock Alerts</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stockHealth.lowStockAlerts}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-600">Near Expiry Items</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stockHealth.nearExpiryItems}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by Brand, Item, Colocation, or Donor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Resource & Specification
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Brand & Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Colocation
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Donor Traceability
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Aging/Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Price Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Market / Audited Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No inventory items found</p>
                    {searchQuery && (
                      <p className="text-sm mt-1">Try adjusting your search query</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const expiryStatus = getExpiryStatus(item.expiryDate);
                  const isLowStock = item.quantity < 50 && item.status === 'Available';
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-slate-900">{item.itemName}</div>
                          <div className="text-sm text-slate-500">{item.specification}</div>
                          <div className="text-xs text-slate-400 mt-1 capitalize">{item.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-slate-900">{item.brand}</div>
                          {item.batchNumber && (
                            <div className="text-sm text-slate-500">Batch: {item.batchNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.quantity.toLocaleString()}
                          </span>
                          <span className="text-sm text-slate-500">{item.unit}</span>
                          {isLowStock && (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.colocation.facility}</div>
                            <div className="text-xs text-slate-500">{item.colocation.subLocation}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.donorInfo.name}</div>
                            <div className="text-xs text-slate-500">ID: {item.donorInfo.supplierId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.expiryDate ? (
                          <div>
                            <div className={`text-sm font-medium ${expiryStatus.color}`}>
                              {expiryStatus.label}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(item.expiryDate).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriceStatusBadge(item.priceStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {item.marketPrice && (
                            <div className="text-sm text-slate-500 italic">
                              Market: {formatGHC(item.marketPrice)}
                            </div>
                          )}
                          {item.priceStatus === 'Locked' && item.auditedPrice && (
                            <div className="text-sm font-bold text-emerald-600">
                              Audited: {formatGHC(item.auditedPrice)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {item.priceStatus === 'Locked' && item.value
                            ? formatGHC(item.value * item.quantity)
                            : item.marketPrice
                            ? formatGHC(item.marketPrice * item.quantity)
                            : 'N/A'}
                        </div>
                        {item.priceStatus !== 'Locked' && (
                          <div className="text-xs text-slate-400 italic">(Estimated)</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>Available Items</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{stockHealth.availableItems}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Clock className="w-4 h-4" />
            <span>Reserved Items</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{stockHealth.reservedItems}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Package className="w-4 h-4" />
            <span>Disbursed Items</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{stockHealth.disbursedItems}</p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
