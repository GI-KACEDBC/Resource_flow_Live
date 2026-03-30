import type { Allocation, Donation } from '../types/backend';

export function isActiveGoodsAllocation(a: Allocation): boolean {
  if (!a || a.status === 'Cancelled') return false;
  const d = a.donation;
  if (!d || d.type !== 'Goods') return false;
  return (a.quantity_allocated ?? 0) > 0;
}

/** Goods, Monetary (GHS), or Services — excludes cancelled; used for dashboard GHS totals. */
export function isActiveAllocationForCashValue(a: Allocation): boolean {
  if (!a || a.status === 'Cancelled' || !a.donation) return false;
  if ((a.quantity_allocated ?? 0) <= 0) return false;
  const t = a.donation.type;
  return t === 'Goods' || t === 'Monetary' || t === 'Services';
}

/** Unit price per stock unit (bag, box, etc.) — `audited_price` / `market_price` / `value` must NOT be a line total. */
export function donationUnitPrice(d: Donation): number {
  const u = d.audited_price ?? d.market_price ?? d.value ?? 0;
  const n = Number(u);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Unit GHS for report table/CSV: per stock unit for goods/services; 1 GHS per GHS for Monetary lines. */
export function reportLineUnitPrice(a: Allocation, lineTotal: number): number {
  const d = a.donation;
  if (!d) return 0;
  const qty = Number(a.quantity_allocated) || 0;
  if (d.type === 'Monetary') return qty > 0 ? lineTotal / qty : 0;
  return donationUnitPrice(d);
}

/** Line value: allocated quantity × unit price (audited > market > value). */
export function allocationGoodsValue(a: Allocation): number {
  if (!isActiveGoodsAllocation(a)) return 0;
  const qty = Number(a.quantity_allocated) || 0;
  return donationUnitPrice(a.donation!) * qty;
}

/**
 * GHS equivalent for dashboards: goods/services = qty × unit price; Monetary = allocated amount (already GHS).
 */
export function allocationCashEquivalentValue(a: Allocation): number {
  if (!isActiveAllocationForCashValue(a)) return 0;
  const d = a.donation!;
  if (d.type === 'Monetary') {
    return Math.max(0, Number(a.quantity_allocated) || 0);
  }
  const qty = Number(a.quantity_allocated) || 0;
  return donationUnitPrice(d) * qty;
}

/** Locked vs estimated split — matches Financial Reports rules, scaled by allocated quantity only. */
export function allocationLineForReport(a: Allocation): { locked: number; estimated: number } {
  if (!a || a.status === 'Cancelled' || !a.donation) return { locked: 0, estimated: 0 };
  const d = a.donation;
  const qty = Number(a.quantity_allocated) || 0;
  if (qty <= 0) return { locked: 0, estimated: 0 };

  if (d.type === 'Monetary') {
    return { locked: qty, estimated: 0 };
  }
  if (d.type !== 'Goods' && d.type !== 'Services') {
    return { locked: 0, estimated: 0 };
  }
  if (d.price_status === 'Locked' && (d.audited_price ?? d.value)) {
    const unit = Number(d.audited_price ?? d.value ?? 0);
    return { locked: Number.isFinite(unit) ? unit * qty : 0, estimated: 0 };
  }
  const unit = Number(d.market_price ?? d.audited_price ?? d.value ?? 0);
  return { locked: 0, estimated: Number.isFinite(unit) ? unit * qty : 0 };
}

/** Rolling window aligned with backend `FinancialController::resolvePeriodWindow`. */
export function resolveDashboardPeriodWindow(period: 'day' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setDate(start.getDate() - 364);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
    default:
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

export function allocationInPeriod(a: Allocation, start: Date, end: Date): boolean {
  const raw = a.allocated_date || a.created_at;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}

export function buildImpactGrowthSeriesFromAllocations(
  allocations: Allocation[],
  monthsBack: number
): Array<{ month: string; value: number }> {
  const active = allocations.filter(isActiveAllocationForCashValue);
  const now = new Date();
  const out: Array<{ month: string; value: number }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = monthStart.toLocaleString('en-US', { month: 'short' });
    const monthSum = active.reduce((sum, a) => {
      const t = new Date(a.allocated_date || a.created_at);
      if (t >= monthStart && t <= monthEnd) {
        return sum + allocationCashEquivalentValue(a);
      }
      return sum;
    }, 0);
    out.push({ month: label, value: Math.round(monthSum) });
  }
  return out;
}
