import type { Customer, Invoice, Payment } from '../types/invoice'

const makeItem = (id: string, productName: string, quantity: number, originalPrice: number, rate: number, surcharge: number) => {
  const unitPrice = Math.round((originalPrice * rate + surcharge) / 1000) * 1000
  return { id, itemId: id, productName, quantity, itemType: 'te' as const, priceMode: 'ndt' as const, originalPrice, fromInventory: false, exchangeRate: rate, surcharge, chinaAmount: originalPrice, chinaCostVnd: originalPrice * rate, itemOperatingCost: 5000, unitPrice, subtotal: unitPrice * quantity }
}

export function seedDemoDataFromQuery() {
  if (import.meta.env.MODE === 'production') return
  if (typeof window === 'undefined' || !window.location.search.includes('reset-demo=1')) return
  const now = new Date().toISOString(); const date = new Date().toISOString().slice(0, 10)
  const customers: Customer[] = [
    { customerId: 'demo-kh-01', name: 'Nguyễn Văn An', address: 'Hà Nội', createdAt: now, updatedAt: now },
    { customerId: 'demo-kh-02', name: 'Trần Thị Bình', address: 'TP. Hồ Chí Minh', createdAt: now, updatedAt: now },
  ]
  const firstItems = [makeItem('demo-item-01', 'Mã TE-01', 8, 20, 3900, 14000)]
  // This invoice represents a customer cancellation. Its 20 pairs are the stock shown in Hàng tồn.
  const secondItems = [makeItem('demo-item-02', 'Mã TE-02', 12, 25, 3900, 14000), makeItem('demo-item-03', 'Mã NL-05', 8, 18, 3900, 14000)]
  const thirdItems = [makeItem('demo-item-04', 'Mã TE-03', 6, 28, 4000, 14000)]
  const createInvoice = (invoiceId: string, customerId: string, customerName: string, customerAddress: string, items: Invoice['items'], costs: Invoice['operatingCosts'], deposit: number, paid: number): Invoice => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0); const chinaCostTotal = items.reduce((sum, item) => sum + item.chinaCostVnd * item.quantity, 0); const operatingCostTotal = Object.values(costs).reduce((sum, value) => sum + value, 0); const itemOperatingCostTotal = items.reduce((sum, item) => sum + item.itemOperatingCost * item.quantity, 0)
    return { invoiceId, customerId, customerName, customerAddress, paymentMethod: 'transfer', invoiceDate: date, items, subtotal, deposit, paid, remaining: subtotal - deposit - paid, operatingCosts: costs, operatingCostTotal, itemOperatingCostTotal, chinaCostTotal, profit: subtotal - chinaCostTotal - operatingCostTotal - itemOperatingCostTotal, status: 'active', createdAt: now }
  }
  const cancelledInvoice = createInvoice('HD-DEMO-002', 'demo-kh-02', 'Trần Thị Bình', 'TP. Hồ Chí Minh', secondItems, { packing: 15000, tape: 3000, loading: 10000, shipping: 20000, cancelledGoods: 0 }, 0, 0)
  cancelledInvoice.status = 'bombed'
  cancelledInvoice.bombedAt = now
  cancelledInvoice.remaining = 0
  const invoices: Invoice[] = [
    createInvoice('HD-DEMO-001', 'demo-kh-01', 'Nguyễn Văn An', 'Hà Nội', firstItems, { packing: 10000, tape: 2000, loading: 5000, shipping: 5000, cancelledGoods: 0 }, 100000, 636000),
    cancelledInvoice,
    createInvoice('HD-DEMO-003', 'demo-kh-01', 'Nguyễn Văn An', 'Hà Nội', thirdItems, { packing: 20000, tape: 5000, loading: 15000, shipping: 30000, cancelledGoods: 0 }, 200000, 0),
  ]
  const payments: Payment[] = invoices.filter(invoice => invoice.deposit > 0).map((invoice, index) => ({ paymentId: `demo-pay-${index}`, customerId: invoice.customerId!, invoiceId: invoice.invoiceId, amount: invoice.deposit, paymentDate: date, paymentMethod: 'transfer', note: 'Đặt cọc mẫu', createdAt: now, kind: 'deposit' }))
  payments.push({ paymentId: 'demo-pay-extra', customerId: 'demo-kh-01', invoiceId: 'HD-DEMO-001', amount: 636000, paymentDate: date, paymentMethod: 'transfer', note: 'Thanh toán đủ hóa đơn mẫu', createdAt: now, kind: 'payment' })
  localStorage.setItem('hoa-don-customers', JSON.stringify(customers)); localStorage.setItem('hoa-don-invoices', JSON.stringify(invoices)); localStorage.setItem('hoa-don-payments', JSON.stringify(payments)); localStorage.setItem('hoa-don-operating-expenses', JSON.stringify([])); localStorage.setItem('hoa-don-settings', JSON.stringify({ exchangeRate: 3900, surcharges: { te: 14000, nl: 14000, bte: 14000, bnl: 14000, blo: 14000 }, itemOperatingCosts: { te: 5000, nl: 7000, bte: 6000, bnl: 8000, blo: 10000 }, apiUrl: '' }))
  window.history.replaceState({}, '', window.location.pathname)
}
