import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useCustomerDebts } from '../hooks/useCustomerDebts'
import { useCustomers } from '../hooks/useCustomers'
import { useInvoices } from '../hooks/useInvoices'
import { useOperatingExpenses } from '../hooks/useOperatingExpenses'
import { useSupplierPayments } from '../hooks/useSupplierPayments'
import { ITEM_TYPES, type InvoiceLineItem } from '../types/invoice'
import { todayIso } from '../utils/id'
import { formatVnd } from '../utils/money'

interface SourceTotals { quantity: number; revenue: number; chinaCost: number; tienCuu: number }

function sourceTotals(items: InvoiceLineItem[]): SourceTotals {
  return items.reduce((total, item) => ({ quantity: total.quantity + item.quantity, revenue: total.revenue + item.subtotal, chinaCost: total.chinaCost + (item.chinaCostVnd || 0) * item.quantity, tienCuu: total.tienCuu + (item.itemOperatingCost || 0) * item.quantity }), { quantity: 0, revenue: 0, chinaCost: 0, tienCuu: 0 })
}

function SourceTable({ title, items, showMetrics }: { title: string; items: InvoiceLineItem[]; showMetrics: boolean }) {
  const total = sourceTotals(items)
  return <section className="form-card source-stats"><div className="form-card-heading"><h2>{title}</h2><strong>{showMetrics ? `${total.quantity} đôi` : '•••'}</strong></div>
    <div className="source-summary"><span>Doanh thu <strong>{showMetrics ? formatVnd(total.revenue) : '•••'}</strong></span><span>Tiền cửu <strong>{showMetrics ? formatVnd(total.tienCuu) : '•••'}</strong></span></div>
    <div className="type-stat-head"><span>Loại hàng</span><span>SL</span><span>Tiền cửu</span></div>
    {ITEM_TYPES.map(type => { const sameType = items.filter(item => item.itemType === type); const row = sourceTotals(sameType); return <div className="type-stat-row" key={type}><strong>{type.toUpperCase()}</strong><span>{showMetrics ? `${row.quantity} đôi` : '•••'}</span><span>{showMetrics ? formatVnd(row.tienCuu) : '•••'}</span></div> })}
  </section>
}

export function StatisticsPage() {
  const { invoices } = useInvoices(); const { customers } = useCustomers(); const { expenses } = useOperatingExpenses(); const { debts } = useCustomerDebts(); const { payments: supplierPayments } = useSupplierPayments()
  const [period, setPeriod] = useState('all'); const [fromDate, setFromDate] = useState(todayIso()); const [toDate, setToDate] = useState(todayIso()); const [showMetrics, setShowMetrics] = useState(true)
  const filtered = useMemo(() => { const now = new Date(); const start = new Date(now); if (period === 'today') start.setHours(0, 0, 0, 0); if (period === 'week') start.setDate(now.getDate() - 6); if (period === 'month') start.setDate(1); const active = invoices.filter(invoice => invoice.status !== 'bombed'); if (period === 'custom') return active.filter(invoice => invoice.invoiceDate >= fromDate && invoice.invoiceDate <= toDate); return period === 'all' ? active : active.filter(invoice => new Date(invoice.invoiceDate) >= start) }, [invoices, period, fromDate, toDate])
  const filteredExpenses = useMemo(() => { const now = new Date(); const start = new Date(now); if (period === 'today') start.setHours(0, 0, 0, 0); if (period === 'week') start.setDate(now.getDate() - 6); if (period === 'month') start.setDate(1); if (period === 'custom') return expenses.filter(expense => expense.expenseDate >= fromDate && expense.expenseDate <= toDate); return period === 'all' ? expenses : expenses.filter(expense => new Date(expense.expenseDate) >= start) }, [expenses, period, fromDate, toDate])
  const allItems = useMemo(() => filtered.flatMap(invoice => invoice.items), [filtered]); const newItems = useMemo(() => allItems.filter(item => !item.fromInventory), [allItems]); const inventoryItems = useMemo(() => allItems.filter(item => item.fromInventory), [allItems])
  const totals = useMemo(() => { const all = sourceTotals(allItems); const invoiceCosts = filtered.reduce((sum, invoice) => sum + (invoice.operatingCostTotal || 0), 0); const extraCosts = filteredExpenses.reduce((sum, expense) => sum + expense.total, 0); const manualDebt = debts.reduce((sum, debt) => sum + debt.remaining, 0); const invoiceProfit = (invoice: typeof filtered[number]) => invoice.profit ?? invoice.subtotal - (invoice.chinaCostTotal || 0) - (invoice.operatingCostTotal || 0) - (invoice.itemOperatingCostTotal || 0); const remaining = filtered.reduce((sum, invoice) => sum + invoice.remaining, 0) + manualDebt; const profit = filtered.reduce((sum, invoice) => sum + invoiceProfit(invoice), 0) - extraCosts; const supplierPaid = supplierPayments.reduce((sum, payment) => sum + payment.amount, 0); return { ...all, operatingCosts: invoiceCosts + extraCosts, paid: filtered.reduce((sum, invoice) => sum + invoice.deposit + invoice.paid, 0), remaining, profit, supplierPaid, availableCash: Math.max(0, profit - supplierPaid) } }, [allItems, filtered, filteredExpenses, debts, supplierPayments])
  const metrics = [['Hóa đơn', String(filtered.length)], ['Khách hàng', String(customers.length)], ['Tổng số đôi', String(totals.quantity)], ['Doanh thu', formatVnd(totals.revenue)], ['Tiền gốc TQ', formatVnd(totals.chinaCost)], ['Tiền cửu', formatVnd(totals.tienCuu)], ['Chi phí vận hành', formatVnd(totals.operatingCosts)], ['Lợi nhuận', formatVnd(totals.profit)], ['Đã trả NCC TQ', formatVnd(totals.supplierPaid)], ['Tiền mặt khả dụng', formatVnd(totals.availableCash)], ['Đã thu', formatVnd(totals.paid)], ['Còn nợ', formatVnd(totals.remaining)]]
  return <><PageHeader title="Thống kê" subtitle="Tổng hợp hàng mới, hàng tồn và chi phí" />
    <div className="period-selector">{[['today', 'Hôm nay'], ['week', '7 ngày'], ['month', 'Tháng này'], ['custom', 'Tùy chọn'], ['all', 'Tất cả']].map(([id, label]) => <button key={id} className={period === id ? 'selected' : ''} onClick={() => setPeriod(id)}>{label}</button>)}</div>
    {period === 'custom' && <section className="date-range-card"><label><span>Từ ngày</span><input type="date" value={fromDate} max={toDate} onChange={event => setFromDate(event.target.value)} /></label><label><span>Đến ngày</span><input type="date" value={toDate} min={fromDate} onChange={event => setToDate(event.target.value)} /></label></section>}
    <button className="visibility-button statistics-visibility" onClick={() => setShowMetrics(!showMetrics)}>{showMetrics ? 'Ẩn các số liệu' : 'Hiện các số liệu'}</button>
    <div className="metric-grid">{metrics.map(([label, value]) => <article className={`metric-card ${label === 'Lợi nhuận thực tế' ? 'actual-profit-card' : label === 'Tiền mặt khả dụng' ? 'cash-available-card' : ''}`} key={label}><span>{label}</span><strong>{showMetrics || label === 'Còn nợ' ? value : '•••'}</strong></article>)}</div>
    <SourceTable title="Thống kê Hàng mới" items={newItems} showMetrics={showMetrics} />
    <SourceTable title="Thống kê Hàng tồn" items={inventoryItems} showMetrics={showMetrics} />
    <SourceTable title="Tổng hợp Hàng mới + Hàng tồn" items={allItems} showMetrics={showMetrics} />
  </>
}
