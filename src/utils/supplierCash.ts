import type { Invoice, Payment, SupplierPayment } from '../types/invoice'

export function calculateSupplierCash(invoices: Invoice[], receipts: Payment[], payouts: SupplierPayment[], investment: number, operatingExpenses = 0) {
  const active = invoices.filter(invoice => !invoice.deletedAt && invoice.status !== 'bombed')
  const ids = new Set(active.map(invoice => invoice.invoiceId))
  const eligible = receipts.filter(payment => !payment.deletedAt && ids.has(payment.invoiceId) && (payment.paymentMethod === 'cod' || payment.paymentMethod === 'transfer'))
  const cod = eligible.filter(payment => payment.paymentMethod === 'cod').reduce((sum, payment) => sum + payment.amount, 0)
  const transfer = eligible.filter(payment => payment.paymentMethod === 'transfer').reduce((sum, payment) => sum + payment.amount, 0)
  const totalProfit = active.reduce((sum, invoice) => sum + (invoice.profit ?? invoice.subtotal - (invoice.chinaCostTotal || 0) - (invoice.operatingCostTotal || 0) - (invoice.itemOperatingCostTotal || 0)), 0) - operatingExpenses
  const reservedProfit = Math.max(0, Math.round(totalProfit))
  const supplierPaid = payouts.filter(payment => payment.kind !== 'investment').reduce((sum, payment) => sum + payment.amount, 0)
  const balance = cod + transfer - reservedProfit - investment - supplierPaid
  return { cod, transfer, reservedProfit, supplierPaid, balance, availableCash: Math.max(0, balance) }
}
