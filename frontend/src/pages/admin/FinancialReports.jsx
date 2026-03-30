// ## Financial Reports Component
// ## Comprehensive financial reporting from donations + warehouses API
import React, { useMemo, useState, useEffect } from 'react';
import { Package, Download, Filter, Loader2 } from 'lucide-react';
import { formatGHC } from '../../utils/currency';
import { allocationApi, warehouseApi } from '../../services/api';
import {
  allocationLineForReport,
  isActiveAllocationForCashValue,
  reportLineUnitPrice,
} from '../../utils/allocatedFinancials';
import { downloadCsv } from '../../utils/exportCsv';
import { ResourceValueChart } from '../../components/charts/ResourceValueChart';
import { Button } from '../../components/ui/Button';

// Derive category from donation item name
const deriveCategory = (item) => {
  if (!item) return 'Other';
  const lower = String(item).toLowerCase();
  if (lower.includes('rice') || lower.includes('maize') || lower.includes('food') || lower.includes('oil') || lower.includes('grain')) return 'Food';
  if (lower.includes('medicine') || lower.includes('medical') || lower.includes('paracetamol') || lower.includes('antibiotic')) return 'Medicine';
  if (lower.includes('equipment') || lower.includes('pump') || lower.includes('solar')) return 'Equipment';
  return 'Other';
};

const FinancialReports = () => {
  const [allocations, setAllocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // ## Fetch donations and warehouses from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [allocationsData, warehousesData] = await Promise.all([
          allocationApi.getAll().catch(() => []),
          warehouseApi.getAll(),
        ]);
        setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      } catch (err) {
        console.error('Error fetching financial data:', err);
        setError('Failed to load financial data.');
        setAllocations([]);
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /** Goods, services, and monetary (GHS) allocations — same scope as dashboard cash-equivalent totals. */
  const activeAllocations = useMemo(
    () => allocations.filter(isActiveAllocationForCashValue),
    [allocations]
  );

  /** Apply category filter to all allocation-based metrics and the detail table. */
  const scopedAllocations = useMemo(() => {
    if (selectedCategory === 'All') return activeAllocations;
    return activeAllocations.filter((a) => deriveCategory(a.donation?.item) === selectedCategory);
  }, [activeAllocations, selectedCategory]);

  const financialMetrics = useMemo(() => {
    let totalLockedValue = 0;
    let totalEstimatedValue = 0;
    const valueByCategory = {};

    scopedAllocations.forEach((a) => {
      const { locked, estimated } = allocationLineForReport(a);
      totalLockedValue += locked;
      totalEstimatedValue += estimated;
      const d = a.donation;
      if (!d) return;
      const category = deriveCategory(d.item);
      if (!valueByCategory[category]) {
        valueByCategory[category] = { locked: 0, estimated: 0, total: 0 };
      }
      valueByCategory[category].locked += locked;
      valueByCategory[category].estimated += estimated;
      valueByCategory[category].total += locked + estimated;
    });

    const valueByStatus = {
      Locked: 0,
      'Pending Review': 0,
      Estimated: 0,
    };
    const itemsByStatus = { Locked: 0, 'Pending Review': 0, Estimated: 0 };

    scopedAllocations.forEach((a) => {
      const d = a.donation;
      if (!d) return;
      const { locked, estimated } = allocationLineForReport(a);
      const ps = d.price_status;
      if (ps === 'Locked') {
        valueByStatus.Locked += locked + estimated;
        itemsByStatus.Locked += 1;
      } else if (ps === 'Pending Review') {
        valueByStatus['Pending Review'] += locked + estimated;
        itemsByStatus['Pending Review'] += 1;
      } else if (ps === 'Estimated') {
        valueByStatus.Estimated += locked + estimated;
        itemsByStatus.Estimated += 1;
      }
    });

    const valueByWarehouse = warehouses.map((w) => {
      const warehouseAllocations = scopedAllocations.filter(
        (a) =>
          a.donation &&
          (a.donation.warehouse?.name === w.name || a.donation.colocation_facility === w.name)
      );
      let lockedValue = 0;
      let estimatedValue = 0;
      warehouseAllocations.forEach((a) => {
        const { locked, estimated } = allocationLineForReport(a);
        lockedValue += locked;
        estimatedValue += estimated;
      });
      return {
        name: w.name,
        region: w.region || '',
        lockedValue,
        estimatedValue,
        totalValue: lockedValue + estimatedValue,
        itemCount: warehouseAllocations.length,
      };
    });

    return {
      totalLockedValue,
      totalEstimatedValue,
      totalValue: totalLockedValue + totalEstimatedValue,
      valueByCategory,
      valueByStatus,
      valueByWarehouse,
      itemsByStatus,
    };
  }, [scopedAllocations, warehouses]);

  // ## Prepare chart data
  const chartData = useMemo(() => {
    return Object.entries(financialMetrics.valueByCategory).map(([category, values]) => ({
      category,
      value: values.total,
      locked: values.locked,
      estimated: values.estimated,
    }));
  }, [financialMetrics.valueByCategory]);

  const filteredWarehouses = useMemo(() => {
    const rows = financialMetrics.valueByWarehouse;
    if (selectedCategory === 'All') return rows;
    return rows.filter((wh) => wh.totalValue > 0 || wh.itemCount > 0);
  }, [financialMetrics.valueByWarehouse, selectedCategory]);

  // ## Export financial report as CSV
  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const rows = [];

    // Summary metrics
    rows.push(['Financial Report Summary', date]);
    rows.push([]);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Locked Value', formatGHC(financialMetrics.totalLockedValue)]);
    rows.push(['Total Estimated Value', formatGHC(financialMetrics.totalEstimatedValue)]);
    rows.push(['Total Asset Value', formatGHC(financialMetrics.totalValue)]);
    rows.push([
      'Verification Rate',
      `${scopedAllocations.length > 0 ? safePercent((financialMetrics.itemsByStatus.Locked / scopedAllocations.length) * 100) : 0}%`,
    ]);
    rows.push([]);

    // Value by status
    rows.push(['Value by Status']);
    rows.push(['Locked', formatGHC(financialMetrics.valueByStatus.Locked)]);
    rows.push(['Pending Review', formatGHC(financialMetrics.valueByStatus['Pending Review'])]);
    rows.push(['Estimated', formatGHC(financialMetrics.valueByStatus.Estimated)]);
    rows.push([]);

    // Value by category
    rows.push(['Value by Category', 'Locked', 'Estimated', 'Total']);
    Object.entries(financialMetrics.valueByCategory).forEach(([cat, vals]) => {
      rows.push([cat, formatGHC(vals.locked), formatGHC(vals.estimated), formatGHC(vals.total)]);
    });
    rows.push([]);

    // Value by warehouse
    rows.push(['Warehouse', 'Region', 'Locked Value', 'Estimated Value', 'Total Value', 'Items']);
    filteredWarehouses
      .sort((a, b) => b.totalValue - a.totalValue)
      .forEach((wh) => {
        rows.push([wh.name, wh.region, formatGHC(wh.lockedValue), formatGHC(wh.estimatedValue), formatGHC(wh.totalValue), `${wh.itemCount} items`]);
      });

    rows.push([]);
    rows.push(['ALLOCATION LINES (allocated quantity × unit price — not full donation stock)']);
    rows.push([
      'Allocation ID',
      'Date allocated',
      'Donation item',
      'Donor',
      'Aid request',
      'Qty allocated',
      'Unit',
      'Unit price GHS',
      'Locked GHS',
      'Estimated GHS',
      'Line total GHS',
      'Price status',
      'Allocation status',
      'Category',
    ]);
    scopedAllocations.forEach((a) => {
      const d = a.donation;
      if (!d) return;
      const { locked, estimated } = allocationLineForReport(a);
      const lineTotal = locked + estimated;
      const unit = reportLineUnitPrice(a, lineTotal);
      const donor = a.donation?.user?.name || a.donation?.user?.email || '';
      rows.push([
        String(a.id),
        String((a.allocated_date || a.created_at || '').slice(0, 10)),
        d.item || '',
        donor,
        a.request?.title || '',
        String(a.quantity_allocated ?? ''),
        d.unit || '',
        unit.toFixed(2),
        locked.toFixed(2),
        estimated.toFixed(2),
        lineTotal.toFixed(2),
        d.price_status || '',
        a.status || '',
        deriveCategory(d.item),
      ]);
    });
    rows.push([]);
    rows.push(['Lines in export', String(scopedAllocations.length)]);
    rows.push(['Total allocated value GHS (sum of line totals)', financialMetrics.totalValue.toFixed(2)]);

    downloadCsv(`financial-report-${date}`, rows);
  };

  // Capped percentage helper (never exceeds 100)
  const safePercent = (value) => Math.min(Math.round(value || 0), 100);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen overflow-y-auto pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Reports</h2>
          <p className="text-slate-600 mt-1">
            Allocated goods, services, and cash (GHS) — line values use allocated quantity × unit price (or GHS amount for
            monetary donations), not full donation stock.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Categories</option>
              <option value="Food">Food</option>
              <option value="Medicine">Medicine</option>
              <option value="Equipment">Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Button icon={Download} onClick={handleExport}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total Locked Value</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatGHC(financialMetrics.totalLockedValue)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Estimated Value</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {formatGHC(financialMetrics.totalEstimatedValue)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Total allocated value (received)</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatGHC(financialMetrics.totalValue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sum of allocation line values in current filter</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">Verification Rate</p>
          <p className="text-xl font-bold text-purple-600 mt-1">
            {scopedAllocations.length > 0
              ? safePercent((financialMetrics.itemsByStatus.Locked / scopedAllocations.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Allocation lines — full view */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800">Allocations</h3>
            <p className="text-sm text-slate-600 mt-1">
              {scopedAllocations.length} line{scopedAllocations.length === 1 ? '' : 's'} · Total{' '}
              <span className="font-semibold text-slate-800">{formatGHC(financialMetrics.totalValue)}</span> received
              (allocated qty × unit price per donation)
            </p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Donor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Request</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Unit GHS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Locked</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Est.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Line total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scopedAllocations.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-slate-500">
                    No allocations match the current filter.
                  </td>
                </tr>
              ) : (
                [...scopedAllocations]
                  .filter((a) => a.donation)
                  .sort(
                    (a, b) =>
                      new Date(b.allocated_date || b.created_at).getTime() -
                      new Date(a.allocated_date || a.created_at).getTime()
                  )
                  .map((a) => {
                    const d = a.donation;
                    const { locked, estimated } = allocationLineForReport(a);
                    const lineTotal = locked + estimated;
                    const unit = reportLineUnitPrice(a, lineTotal);
                    const donor = d.user?.name || d.user?.email || '—';
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{a.id}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {new Date(a.allocated_date || a.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-2 text-slate-900 max-w-[200px]">{d.item}</td>
                        <td className="px-4 py-2 text-slate-600 max-w-[140px] truncate" title={donor}>
                          {donor}
                        </td>
                        <td className="px-4 py-2 text-slate-600 max-w-[160px] truncate" title={a.request?.title}>
                          {a.request?.title || '—'}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{Number(a.quantity_allocated).toLocaleString('en-GH')}</td>
                        <td className="px-4 py-2 text-slate-600">{d.unit || '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatGHC(unit)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700 tabular-nums">{formatGHC(locked)}</td>
                        <td className="px-4 py-2 text-right text-amber-700 tabular-nums">{formatGHC(estimated)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                          {formatGHC(lineTotal)}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{d.price_status}</td>
                        <td className="px-4 py-2 text-slate-600">{a.status}</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Value by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-700 font-semibold">Locked Assets</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatGHC(financialMetrics.valueByStatus.Locked)}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700 font-semibold">Pending Review</p>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {formatGHC(financialMetrics.valueByStatus['Pending Review'])}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700 font-semibold">Estimated</p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {formatGHC(financialMetrics.valueByStatus.Estimated)}
          </p>
        </div>
      </div>

      {/* Chart - Value by Category */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Asset Value by Category</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-600">Locked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-slate-600">Estimated</span>
            </div>
          </div>
        </div>
        <ResourceValueChart data={chartData} />
      </div>

      {/* Value by Warehouse */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Asset Value by Warehouse</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Locked Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Estimated Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Items
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No warehouse data found</p>
                  </td>
                </tr>
              ) : (
                filteredWarehouses
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .map((warehouse) => (
                    <tr key={warehouse.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{warehouse.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{warehouse.region}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatGHC(warehouse.lockedValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-amber-600">
                          {formatGHC(warehouse.estimatedValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900">
                          {formatGHC(warehouse.totalValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{warehouse.itemCount} items</span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h4 className="text-base font-bold text-slate-800 mb-4">Financial Health Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Verification Coverage</span>
              <span className="text-sm font-bold text-slate-900">
                {activeAllocations.length > 0
                  ? safePercent((financialMetrics.itemsByStatus.Locked / activeAllocations.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Locked vs Estimated Ratio</span>
              <span className="text-sm font-bold text-slate-900">
                {financialMetrics.totalEstimatedValue > 0
                  ? safePercent((financialMetrics.totalLockedValue / financialMetrics.totalEstimatedValue) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Average Item Value</span>
              <span className="text-sm font-bold text-slate-900">
                {scopedAllocations.length > 0
                  ? formatGHC(financialMetrics.totalValue / scopedAllocations.length)
                  : formatGHC(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h4 className="text-base font-bold text-slate-800 mb-4">Audit Alerts</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {financialMetrics.itemsByStatus['Pending Review']} items pending audit
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Estimated value: {formatGHC(financialMetrics.valueByStatus['Pending Review'])}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {financialMetrics.itemsByStatus.Estimated} items with auto-pricing
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Estimated value: {formatGHC(financialMetrics.valueByStatus.Estimated)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
