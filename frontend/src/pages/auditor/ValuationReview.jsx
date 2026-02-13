// ## Valuation Review View
// ## Financial Controller's interface for reviewing and locking inventory prices
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Lock, Unlock, Search, Loader2 } from 'lucide-react';
import { donationApi } from '../../services/api';
import { formatGHC } from '../../utils/currency';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const ValuationReview = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceStatusFilter, setPriceStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [overridePrice, setOverridePrice] = useState('');
  const [allInventory, setAllInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ## Fetch donations from API
  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      const donations = await donationApi.getAll({ status: 'pending' });
      // Transform donations to inventory format for compatibility
      const inventory = Array.isArray(donations) ? donations.map(d => ({
        id: d.id,
        itemName: d.item || 'Unknown Item',
        brand: d.user?.organization || 'Unknown',
        quantity: d.quantity || 0,
        unit: d.unit || 'units',
        marketPrice: d.estimated_value || 0,
        auditedPrice: d.audited_price || null,
        priceStatus: d.price_status || (d.audited_price ? 'Locked' : 'Pending Review'),
        value: d.audited_price || d.estimated_value || 0,
        colocation: {
          facility: d.colocation_facility || 'Unassigned',
          subLocation: d.colocation_sub_location || '',
        },
        status: d.status,
        createdAt: d.created_at,
      })) : [];
      setAllInventory(inventory);
    } catch (error) {
      console.error('Error fetching donations:', error);
      setAllInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  // ## Auto-refresh when donations are created or prices are locked
  useAutoRefresh(fetchDonations, ['donation'], []);
  
  // ## Filter inventory based on search and status
  const filteredInventory = Array.isArray(allInventory) ? allInventory.filter((item) => {
    if (!item) return false;
    const matchesSearch = 
      (item.itemName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.colocation?.facility?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      priceStatusFilter === 'all' || item.priceStatus === priceStatusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  // ## Calculate valuation statistics
  const stats = {
    totalItems: Array.isArray(allInventory) ? allInventory.length : 0,
    pendingReview: Array.isArray(allInventory) ? allInventory.filter(item => item.priceStatus === 'Pending Review' || item.priceStatus === 'pending').length : 0,
    locked: Array.isArray(allInventory) ? allInventory.filter(item => item.priceStatus === 'Locked' || item.priceStatus === 'locked').length : 0,
    estimated: Array.isArray(allInventory) ? allInventory.filter(item => item.priceStatus === 'Estimated' || item.priceStatus === 'estimated').length : 0,
    totalEstimatedValue: Array.isArray(allInventory) ? allInventory.reduce((sum, item) => 
      sum + ((item.marketPrice || 0) * (item.quantity || 0)), 0
    ) : 0,
    totalLockedValue: Array.isArray(allInventory) ? allInventory
      .filter(item => (item.priceStatus === 'Locked' || item.priceStatus === 'locked') && item.value)
      .reduce((sum, item) => sum + ((item.value || 0) * (item.quantity || 0)), 0) : 0,
    discrepancyAlerts: Array.isArray(allInventory) ? allInventory.filter(item => {
      if (!item.marketPrice || !item.auditedPrice) return false;
      const diff = Math.abs(item.auditedPrice - item.marketPrice);
      const percentDiff = (diff / item.marketPrice) * 100;
      return percentDiff > 20;
    }).length : 0,
  };

  // ## Handle price override
  const handleOverridePrice = (itemId) => {
    const price = parseFloat(overridePrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }
    // ## In production, this would call an API via Controller
    console.log(`Overriding price for ${itemId} to ${price}`);
    alert(`Price override submitted for ${itemId}. In production, this would update the database.`);
    setSelectedItem(null);
    setOverridePrice('');
  };

  // ## Handle confirm price
  const handleConfirmPrice = (itemId) => {
    // ## In production, this would call an API via Controller
    console.log(`Confirming market price for ${itemId}`);
    alert(`Price confirmed for ${itemId}. In production, this would lock the price.`);
  };

  // ## Handle lock price
  const handleLockPrice = async (itemId, auditedPrice, auditorNotes = '') => {
    try {
      const { donationApi } = await import('../../services/api');
      await donationApi.lockPrice(itemId, {
        audited_price: auditedPrice,
        auditor_notes: auditorNotes,
      });
      alert(`Price locked successfully! Donation status updated to Verified.`);
      // Reload data if needed
      window.location.reload();
    } catch (error) {
      console.error('Error locking price:', error);
      alert('Failed to lock price. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      {/* ## Header */}
      <div>
        <h2 className="text-base font-bold text-slate-800">Valuation Review</h2>
        <p className="text-slate-500 mt-1">Review and lock inventory item prices for financial reporting</p>
      </div>

      {/* ## Valuation Statistics - 3x3 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Estimated Value</p>
          <p className="text-base font-bold text-slate-900 mt-2">{formatGHC(stats.totalEstimatedValue)}</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Discrepancy Alerts</p>
          <p className="text-base font-bold text-red-600 mt-2">{stats.discrepancyAlerts}</p>
          <p className="text-xs text-slate-500 mt-1">&gt;20% difference</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Locked Assets</p>
          <p className="text-base font-bold text-emerald-600 mt-2">{formatGHC(stats.totalLockedValue)}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.locked} items locked</p>
        </div>
      </div>

      {/* ## Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Pending Review</span>
            <span className="text-base font-bold text-amber-600">{stats.pendingReview}</span>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Estimated</span>
            <span className="text-base font-bold text-blue-600">{stats.estimated}</span>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Locked</span>
            <span className="text-base font-bold text-emerald-600">{stats.locked}</span>
          </div>
        </div>
      </div>

      {/* ## Search and Filter */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            label="Search Items"
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item name, brand, or warehouse..."
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">
            Price Status
          </label>
          <select
            value={priceStatusFilter}
            onChange={(e) => setPriceStatusFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">All Status</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Estimated">Estimated</option>
            <option value="Locked">Locked</option>
          </select>
        </div>
      </div>

      {/* ## Valuation Queue Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Resource & Specification
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Brand & Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Market Suggestion
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Audited Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInventory.map((item) => {
                const hasDiscrepancy = item.marketPrice && item.auditedPrice && 
                  Math.abs(item.auditedPrice - item.marketPrice) / item.marketPrice > 0.2;
                
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.itemName}</p>
                        <p className="text-sm text-slate-500">{item.specification}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Qty: {item.quantity} {item.unit}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{item.brand}</p>
                        {item.batchNumber && (
                          <p className="text-xs text-slate-500">Batch: {item.batchNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatGHC(item.marketPrice || 0)}
                        </p>
                        <p className="text-xs text-slate-500">per {item.unit}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {item.auditedPrice ? (
                          <>
                            <p className={`text-sm font-semibold ${
                              hasDiscrepancy ? 'text-red-600' : 'text-slate-900'
                            }`}>
                              {formatGHC(item.auditedPrice)}
                            </p>
                            {hasDiscrepancy && (
                              <p className="text-xs text-red-500 mt-1">⚠️ Discrepancy</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-400">Not set</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.priceStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.priceStatus !== 'Locked' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setOverridePrice(item.auditedPrice?.toString() || '');
                              }}
                              className="text-xs px-2 py-1"
                            >
                              Override
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={CheckCircle}
                              onClick={() => handleConfirmPrice(item.id)}
                              className="text-xs px-2 py-1"
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Lock}
                              onClick={() => handleLockPrice(item.id)}
                              className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-700"
                            >
                              Lock
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">Locked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ## Override Price Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Override Price: {selectedItem.itemName}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">Market Suggestion:</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatGHC(selectedItem.marketPrice || 0)} per {selectedItem.unit}
                </p>
              </div>
              <Input
                label="Override Price (GH₵)"
                type="number"
                step="0.01"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                placeholder="Enter new price"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedItem(null);
                    setOverridePrice('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleOverridePrice(selectedItem.id)}
                >
                  Save Override
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValuationReview;
