import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useCustomers } from '../hooks/useCustomers'
import { useInvoices } from '../hooks/useInvoices'
import { formatVnd } from '../utils/money'
import { DeleteCustomerConfirmModal } from '../components/DeleteCustomerConfirmModal'
import { useCustomerDebts } from '../hooks/useCustomerDebts'

interface Props { onOpenCustomer: (id: string) => void }

export function CustomersPage({ onOpenCustomer }: Props) {
  const { customers, deleteCustomer } = useCustomers()
  const { invoices } = useInvoices()
  const { debts } = useCustomerDebts()
  const [query, setQuery] = useState('')
  const [showQuantity, setShowQuantity] = useState(true)
  const [customerIdToDelete, setCustomerIdToDelete] = useState<string | null>(null)
  const rows = useMemo(() => customers.map(customer => {
    const mine = invoices.filter(invoice => invoice.customerId === customer.customerId && invoice.status !== 'bombed')
    const quantity = mine.reduce((sum, invoice) => sum + invoice.items.reduce((s, item) => s + item.quantity, 0), 0)
    const subtotal = mine.reduce((sum, invoice) => sum + invoice.subtotal, 0)
    const paid = mine.reduce((sum, invoice) => sum + invoice.deposit + invoice.paid, 0)
    const allInvoices = invoices.filter(invoice => invoice.customerId === customer.customerId)
    const manualDebt = debts.filter(debt => debt.customerId === customer.customerId).reduce((sum, debt) => sum + debt.remaining, 0)
    return { customer, invoices: mine.length, allInvoiceCount: allInvoices.length, quantity, subtotal, paid, remaining: Math.max(0, subtotal - paid) + manualDebt, manualDebt }
  }).filter(row => `${row.customer.name} ${row.customer.address}`.toLowerCase().includes(query.toLowerCase())), [customers, invoices, debts, query])
  const customerToDelete = customers.find(customer => customer.customerId === customerIdToDelete)
  const removeCustomer = () => { if (!customerToDelete) return; const invoiceCount = invoices.filter(invoice => invoice.customerId === customerToDelete.customerId).length; const debtCount = debts.filter(debt => debt.customerId === customerToDelete.customerId && debt.remaining > 0).length; if (invoiceCount === 0 && debtCount === 0) deleteCustomer(customerToDelete.customerId); setCustomerIdToDelete(null) }
  return <>
    <PageHeader title="Khách hàng" subtitle="Danh sách và công nợ thực tế" />
    <label className="search-field"><span>Tìm khách hàng</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên hoặc địa chỉ" /></label>
    <button className="visibility-button" onClick={() => setShowQuantity(!showQuantity)}>{showQuantity ? 'Ẩn số đôi đã lấy' : 'Hiện số đôi đã lấy'}</button>
    <div className="customer-list">{rows.map(row => <div className="customer-list-row" key={row.customer.customerId}><button className="customer-card" onClick={() => onOpenCustomer(row.customer.customerId)}>
      <div><strong>{row.customer.name}</strong><span>{row.customer.address || 'Chưa có địa chỉ'}</span></div>
      <span className={row.remaining ? 'debt' : 'settled'}>{row.remaining ? `Nợ ${formatVnd(row.remaining)}` : 'Đã thanh toán đủ'}</span>
      <small>{row.allInvoiceCount} hóa đơn{row.allInvoiceCount !== row.invoices ? ' (gồm hóa đơn bom)' : ''} · {showQuantity ? `${row.quantity} đôi` : '••• đôi'} · Đã thu {formatVnd(row.paid)}{row.manualDebt > 0 ? ' · Có ghi nợ' : ''}</small>
    </button><button className="icon-btn danger customer-delete-button" onClick={() => setCustomerIdToDelete(row.customer.customerId)} aria-label={`Xóa khách hàng ${row.customer.name}`}>Xóa</button></div>)}</div>
    {!rows.length && <div className="empty-state large"><strong>Chưa có khách hàng</strong><p>Khách hàng xuất hiện sau khi lưu hóa đơn đầu tiên.</p></div>}
    {customerToDelete && <DeleteCustomerConfirmModal customer={customerToDelete} invoiceCount={invoices.filter(invoice => invoice.customerId === customerToDelete.customerId).length} debtCount={debts.filter(debt => debt.customerId === customerToDelete.customerId && debt.remaining > 0).length} onCancel={() => setCustomerIdToDelete(null)} onConfirm={removeCustomer} />}
  </>
}
