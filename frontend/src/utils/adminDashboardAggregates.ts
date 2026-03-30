import type { AuditTrail, Donation, Financial } from '../types/backend';

/** Confirmed pipeline: excludes Pending (e.g. unpaid monetary) and Rejected. */
export const DONATION_RECEIVED_STATUSES: Donation['status'][] = ['Verified', 'Allocated', 'Delivered'];

/** Ledger rows that represent cash received (donation rows with donation_id are counted on the donation side). */
export const FINANCIAL_INFLOW_TYPES: Financial['transaction_type'][] = [
  'Donation',
  'Project Funding',
  'General Support',
];

export function isDonationReceivedForDashboard(d: Donation): boolean {
  return DONATION_RECEIVED_STATUSES.includes(d.status);
}

/** Completed Paystack / cash rows that count as inflows (for ledger sums and deduplication). */
export function isCompletedLedgerInflow(f: Financial): boolean {
  return f.status === 'Completed' && FINANCIAL_INFLOW_TYPES.includes(f.transaction_type);
}

/**
 * Distinct receipt events matching {@link computeDonationsReceivedGhs} (donation lines + orphan ledger rows).
 */
export function countReceivedPipelineEvents(donations: Donation[], financials: Financial[]): number {
  let n = 0;
  for (const d of donations) {
    if (donationCountsAsReceived(d, financials)) n++;
  }
  for (const f of financials) {
    if (isCompletedLedgerInflow(f) && (f.donation_id == null || Number(f.donation_id) === 0)) {
      n++;
    }
  }
  return n;
}

/** Monetary row still Pending but Paystack (or admin) already recorded a completed ledger line. */
export function isMonetaryDonationPaidInLedger(d: Donation, financials: Financial[]): boolean {
  if (d.type !== 'Monetary' || d.status !== 'Pending') return false;
  return financials.some(
    (f) => Number(f.donation_id) === Number(d.id) && isCompletedLedgerInflow(f)
  );
}

export function donationCountsAsReceived(d: Donation, financials: Financial[]): boolean {
  if (d.status === 'Rejected') return false;
  if (isDonationReceivedForDashboard(d)) return true;
  return isMonetaryDonationPaidInLedger(d, financials);
}

/**
 * Full line value in GH₵: Monetary = pledged/received amount; Goods/Services = unit price × quantity.
 */
export function donationTotalValueGhs(d: Donation): number {
  if (d.type === 'Monetary') {
    return Math.max(0, Number(d.quantity) || 0);
  }
  const qty = Number(d.quantity) || 0;
  const unit = Number(d.audited_price ?? d.market_price ?? d.value ?? 0);
  return Number.isFinite(unit) && unit >= 0 ? unit * qty : 0;
}

/** Prefer date_received when set; otherwise created_at (for period charts). */
export function donationReceiptTimestamp(d: Donation): Date {
  return new Date(d.date_received || d.created_at);
}

function effectiveReceiptDateForReceived(d: Donation, financials: Financial[]): Date {
  if (isDonationReceivedForDashboard(d)) return donationReceiptTimestamp(d);
  if (isMonetaryDonationPaidInLedger(d, financials)) {
    const f = financials.find(
      (x) => Number(x.donation_id) === Number(d.id) && isCompletedLedgerInflow(x)
    );
    if (f) return new Date(f.transaction_date);
  }
  return donationReceiptTimestamp(d);
}

export function donationReceivedInPeriod(d: Donation, start: Date, end: Date): boolean {
  if (!isDonationReceivedForDashboard(d)) return false;
  const t = donationReceiptTimestamp(d);
  if (Number.isNaN(t.getTime())) return false;
  return t >= start && t <= end;
}

/**
 * Donations (verified or paid-in-ledger) plus orphan ledger inflows (no donation_id), e.g. Project Funding.
 * Avoids double-counting: rows with donation_id are represented by the donation amount once.
 */
export function computeDonationsReceivedGhs(
  donations: Donation[],
  financials: Financial[],
  period?: { start: Date; end: Date }
): number {
  const start = period?.start;
  const end = period?.end;

  let total = 0;

  for (const d of donations) {
    if (!donationCountsAsReceived(d, financials)) continue;
    const t = effectiveReceiptDateForReceived(d, financials);
    if (Number.isNaN(t.getTime())) continue;
    if (start && end && (t < start || t > end)) continue;
    total += donationTotalValueGhs(d);
  }

  for (const f of financials) {
    if (!isCompletedLedgerInflow(f)) continue;
    if (f.donation_id != null && Number(f.donation_id) > 0) continue;
    const tx = new Date(f.transaction_date);
    if (Number.isNaN(tx.getTime())) continue;
    if (start && end && (tx < start || tx > end)) continue;
    total += Number(f.amount) || 0;
  }

  return total;
}

/** Map free-text item names into dashboard resource categories (donation goods only). */
export function deriveCategoryFromItemName(item: string | undefined): string {
  if (!item) return 'Other';
  const lower = String(item).toLowerCase();
  if (lower.includes('food') || lower.includes('rice') || lower.includes('maize') || lower.includes('oil')) return 'Food';
  if (lower.includes('medical') || lower.includes('medicine') || lower.includes('paracetamol')) return 'Medical';
  if (lower.includes('education') || lower.includes('book')) return 'Education';
  if (lower.includes('equipment') || lower.includes('pump') || lower.includes('solar')) return 'Equipment';
  return 'Other';
}

/** Full donation line value: unit price × donation quantity (prices are per unit, not extended totals). */
export function donationLineValue(donation: Donation): number {
  if (donation.type === 'Monetary') {
    return Math.max(0, Number(donation.quantity) || 0);
  }
  const unitPrice = donation.audited_price ?? donation.market_price ?? donation.value ?? 0;
  const lineTotal = Number(unitPrice) * (donation.quantity || 1);
  return Number.isFinite(lineTotal) ? lineTotal : 0;
}

/** Rolling monthly totals for the impact trend chart (donation-based, not ledger). */
export function buildImpactGrowthSeries(
  donations: Donation[],
  monthsBack: number
): Array<{ month: string; value: number }> {
  const now = new Date();
  const out: Array<{ month: string; value: number }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = monthStart.toLocaleString('en-US', { month: 'short' });
    const monthSum = donations.reduce((sum, donation) => {
      const createdAt = new Date(donation.created_at);
      if (createdAt >= monthStart && createdAt <= monthEnd) {
        return sum + donationLineValue(donation);
      }
      return sum;
    }, 0);
    out.push({ month: label, value: Math.round(monthSum) });
  }
  return out;
}

export function computeWarehouseUtilization(warehouses: Array<{ capacity?: unknown; current_occupancy?: unknown }>): {
  utilizationPercent: number;
  usedCapacity: number;
  availableCapacity: number;
} {
  let totalCap = 0;
  let totalOcc = 0;
  warehouses.forEach((w) => {
    totalCap += Number(w.capacity) || 0;
    totalOcc += Number(w.current_occupancy) || 0;
  });
  const utilizationPercent = totalCap > 0 ? Math.min(100, Math.round((totalOcc / totalCap) * 100)) : 0;
  return {
    utilizationPercent,
    usedCapacity: Math.round(totalOcc),
    availableCapacity: Math.max(0, Math.round(totalCap - totalOcc)),
  };
}

export function buildRecentAuditLogRows(audits: AuditTrail[], limit: number): Array<{ item: string; action: string; date: string }> {
  const sorted = [...audits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return sorted.slice(0, limit).map((a) => ({
    item: `${a.model_type || 'Record'} #${a.model_id ?? '—'}`,
    action: a.action || '—',
    date: new Date(a.created_at).toLocaleString(),
  }));
}
