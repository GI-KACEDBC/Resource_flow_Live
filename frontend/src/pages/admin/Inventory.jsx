// ## Inventory Management Component
// ## Admin confirms receipt before items appear in inventory. Auditor then authorizes prices.
import React, { useState, useMemo, useEffect } from 'react';
import { Package, Search, MapPin, User, AlertTriangle, CheckCircle, Clock, Lock, Coins, Loader2, Truck, Banknote } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatGHC } from '../../utils/currency';
import { donationApi, fetchSanctumCsrfCookie } from '../../services/api';

// Map donation to display format
const mapDonationToItem = (d) => ({
  id: d.id,
  itemName: d.item || '—',
  specification: d.description || d.unit || '—',
  category: d.type || 'Goods',
  brand: '—',
  batchNumber: null,
  quantity: d.quantity || 0,
  unit: d.unit || 'units',
  colocation: {
    facility: d.warehouse?.name || d.colocation_facility || '—',
    subLocation: d.colocation_sub_location || '—',
  },
  donorInfo: {
    name: d.user?.name || '—',
    supplierId: d.user_id ? `user-${d.user_id}` : '—',
  },
  status: d.status === 'Verified' ? 'Available' : d.status === 'Allocated' ? 'Reserved' : d.status === 'Delivered' ? 'Disbursed' : 'Unavailable',
  expiryDate: d.expiry_date,
  priceStatus: d.price_status || 'Estimated',
  marketPrice: d.market_price,
  auditedPrice: d.audited_price,
  value: d.audited_price || d.value,
});

const Inventory = () => {
  const [donations, setDonations] = useState([]);
  const [pendingReceipt, setPendingReceipt] = useState([]);
  /** Monetary donations still Pending (e.g. awaiting Paystack) — excluded from goods-only receipt flow */
  const [pendingMonetary, setPendingMonetary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [adminPaystackRefs, setAdminPaystackRefs] = useState({});
  const [verifyingPaystackId, setVerifyingPaystackId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [confirmed, pending, statusPending] = await Promise.all([
        donationApi.getAll({ receipt_confirmed: true }),
        donationApi.getAll({ receipt_confirmed: false }),
        donationApi.getAll({ status: 'Pending' }),
      ]);
      const goods = (d) => d.type === 'Goods';
      setDonations(Array.isArray(confirmed) ? confirmed.filter(goods) : []);
      setPendingReceipt(Array.isArray(pending) ? pending.filter(goods) : []);
      setPendingMonetary(
        Array.isArray(statusPending)
          ? statusPending.filter((d) => d && d.type === 'Monetary' && d.status === 'Pending')
          : []
      );
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory.');
      setDonations([]);
      setPendingReceipt([]);
      setPendingMonetary([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdminVerifyPaystack = async (donationId) => {
    const ref = (adminPaystackRefs[donationId] || '').trim();
    if (!ref) {
      alert('Paste the Paystack transaction reference (from Paystack dashboard).');
      return;
    }
    try {
      setVerifyingPaystackId(donationId);
      await fetchSanctumCsrfCookie();
      await donationApi.verifyMonetaryAsAdmin(donationId, ref);
      await fetchData();
      setAdminPaystackRefs((prev) => ({ ...prev, [donationId]: '' }));
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Verification failed.');
    } finally {
      setVerifyingPaystackId(null);
    }
  };

  const handleConfirmReceipt = async (donationId) => {
    try {
      setConfirmingId(donationId);
      await donationApi.confirmReceipt(donationId);
      await fetchData();
    } catch (err) {
      console.error('Error confirming receipt:', err);
      alert(err?.response?.data?.message || 'Failed to confirm receipt.');
    } finally {
      setConfirmingId(null);
    }
  };

  const inventory = useMemo(() => donations.map(mapDonationToItem), [donations]);

  const stockHealth = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => {
      if (item.priceStatus === 'Locked' && item.value) {
        return sum + item.value * item.quantity;
      }
      return sum;
    }, 0);
    const availableItems = inventory.filter((i) => i.status === 'Available').length;
    const reservedItems = inventory.filter((i) => i.status === 'Reserved').length;
    const disbursedItems = inventory.filter((i) => i.status === 'Disbursed').length;
    const today = new Date();
    const lowStockAlerts = inventory.filter((i) => i.quantity < 50 && i.status === 'Available').length;
    const nearExpiryItems = inventory.filter((i) => {
      if (!i.expiryDate) return false;
      const expiry = new Date(i.expiryDate);
      const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 90 && days > 0 && i.status === 'Available';
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

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    const q = searchQuery.toLowerCase();
    return inventory.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        (i.colocation?.facility || '').toLowerCase().includes(q) ||
        (i.colocation?.subLocation || '').toLowerCase().includes(q) ||
        (i.donorInfo?.name || '').toLowerCase().includes(q)
    );
  }, [inventory, searchQuery]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
        <p className="text-slate-500 mt-1">
          Cash donations awaiting payment appear below. For goods, confirm physical receipt before stock is counted; auditors
          then lock prices.
        </p>
      </div>

      {/* Pending monetary — not part of goods receipt; shown so admins see stuck or unpaid Paystack flows */}
      {pendingMonetary.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-blue-200 bg-blue-100/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Banknote size={18} />
              Pending monetary donations ({pendingMonetary.length})
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Paste the Paystack reference from your dashboard; the server checks the amount matches this donation (GHS).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-100/50 border-b border-blue-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Donor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Paystack reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {pendingMonetary.map((d) => (
                  <tr key={d.id} className="hover:bg-blue-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{d.item}</div>
                      <div className="text-sm text-slate-500">{d.description || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{d.user?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatGHC(Number(d.quantity))}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded">Pending</span>
                    </td>
                    <td className="px-6 py-4 min-w-[200px]">
                      <Input
                        type="text"
                        placeholder="e.g. T1234567890"
                        value={adminPaystackRefs[d.id] ?? ''}
                        onChange={(e) =>
                          setAdminPaystackRefs((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Button
                        size="sm"
                        icon={CheckCircle}
                        onClick={() => handleAdminVerifyPaystack(d.id)}
                        disabled={verifyingPaystackId === d.id}
                      >
                        {verifyingPaystackId === d.id ? 'Verifying…' : 'Verify'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Receipt - Admin must confirm before item is added to inventory */}
      {pendingReceipt.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-amber-200 bg-amber-100/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Truck size={18} />
              Pending Receipt Confirmation ({pendingReceipt.length})
            </h3>
            <p className="text-sm text-slate-600 mt-1">Confirm physical receipt to add these items to inventory for Auditor price review.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-100/50 border-b border-amber-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Donor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200">
                {pendingReceipt.map((d) => (
                  <tr key={d.id} className="hover:bg-amber-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{d.item}</div>
                      <div className="text-sm text-slate-500">{d.description || d.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{d.user?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{d.quantity} {d.unit}</td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        icon={CheckCircle}
                        onClick={() => handleConfirmReceipt(d.id)}
                        disabled={confirmingId === d.id}
                      >
                        {confirmingId === d.id ? 'Confirming...' : 'Confirm Receipt'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                            <div className="text-sm font-medium text-slate-900">{item.colocation?.facility || '—'}</div>
                            <div className="text-xs text-slate-500">{item.colocation?.subLocation || '—'}</div>
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
                          {(item.priceStatus === 'Locked' && (item.auditedPrice || item.value)) && (
                            <div className="text-sm font-bold text-emerald-600">
                              Audited: {formatGHC(item.auditedPrice || item.value)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {item.priceStatus === 'Locked' && (item.value || item.auditedPrice)
                            ? formatGHC((item.value || item.auditedPrice) * item.quantity)
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
