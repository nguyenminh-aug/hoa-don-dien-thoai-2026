import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { InvoiceCustomerSection } from '../components/InvoiceCustomerSection'
import { InvoiceItemEditor } from '../components/InvoiceItemEditor'
import { InvoiceTotalsSection } from '../components/InvoiceTotalsSection'
import { PageHeader } from '../components/PageHeader'
import { useCustomers } from '../hooks/useCustomers'
import { useInvoices } from '../hooks/useInvoices'
import { useInventoryProducts } from '../hooks/useInventoryProducts'
import { useSettings } from '../hooks/useSettings'
import type { InvoiceItemDraft, PaymentMethod } from '../types/invoice'
import { generateId, generateInvoiceCode, todayIso } from '../utils/id'
import { calculateInvoiceTotal } from '../utils/invoiceCalculation'
import { parseNumber } from '../utils/money'

interface InvoicePageProps { onSaved?: (invoiceId: string) => void }

function createEmptyItem(): InvoiceItemDraft {
  return {
    id: generateId('item'),
    productName: '',
    quantity: 1,
    itemType: 'te',
    priceMode: 'ndt',
    originalPrice: 0,
  }
}

export function InvoicePage({ onSaved }: InvoicePageProps) {
  const { settings } = useSettings()
  const { createInvoice, invoices } = useInvoices()
  const { products } = useInventoryProducts()
  const { customers, addCustomer } = useCustomers()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [invoiceCode, setInvoiceCode] = useState(generateInvoiceCode())
  const [items, setItems] = useState<InvoiceItemDraft[]>([createEmptyItem()])
  const [deposit, setDeposit] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [successCode, setSuccessCode] = useState<string | null>(null)

  const subtotal = useMemo(() => calculateInvoiceTotal(items, settings), [items, settings])
  const codAmount = paymentMethod === 'cod' ? Math.max(0, subtotal - deposit) : undefined

  const updateItem = (next: InvoiceItemDraft) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== next.id) return item
      // When a bombed item is selected from stock, preserve its recorded input cost
      // and use its former sale price only as the editable default selling price.
      if (!item.fromInventory && next.fromInventory) {
        const source = invoices.filter(invoice => invoice.status === 'bombed').flatMap(invoice => invoice.items).find(stockItem => stockItem.productName.trim().toLowerCase() === next.productName.trim().toLowerCase())
        if (source) return { ...next, itemType: source.itemType, priceMode: source.priceMode, originalPrice: source.originalPrice, saleUnitPrice: next.saleUnitPrice ?? source.unitPrice }
      }
      return next
    }))
  }

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : [createEmptyItem()]))
  }

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem()])
  }

  const handleSelectCustomer = (customer: typeof customers[number] | null) => {
    if (!customer) {
      handleClearCustomer()
      return
    }
    setCustomerId(customer.customerId)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone ?? '')
    setCustomerAddress(customer.address)
  }

  const handleClearCustomer = () => {
    setCustomerId(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
  }

  const resetForm = () => {
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setPaymentMethod('transfer')
    setCustomerId(null)
    setInvoiceDate(todayIso())
    setInvoiceCode(generateInvoiceCode())
    setItems([createEmptyItem()])
    setDeposit(0)
    setErrors([])
  }

  const handleSave = () => {
    const errs: string[] = []
    if (!customerName.trim()) errs.push('Tên khách hàng không được để trống')

    const validItems = items.filter((item) => item.productName.trim())
    if (validItems.length === 0) errs.push('Ít nhất một mặt hàng phải có tên')

    for (const item of validItems) {
      if (item.quantity <= 0) errs.push(`Số lượng của "${item.productName}" phải lớn hơn 0`)
      if (item.originalPrice < 0) errs.push(`Giá của "${item.productName}" không được âm`)
    }
    const stockByProduct = new Map<string, number>()
    invoices.filter(invoice => invoice.status === 'bombed').forEach(invoice => invoice.items.forEach(item => { const key = item.productName.trim().toLowerCase(); stockByProduct.set(key, (stockByProduct.get(key) ?? 0) + item.quantity) }))
    invoices.filter(invoice => invoice.status !== 'bombed').forEach(invoice => invoice.items.filter(item => item.fromInventory).forEach(item => { const key = item.productName.trim().toLowerCase(); stockByProduct.set(key, (stockByProduct.get(key) ?? 0) - item.quantity) }))
    products.forEach(product => stockByProduct.set(product.productKey, (stockByProduct.get(product.productKey) ?? 0) + product.quantityAdjustment))
    const requestedByProduct = new Map<string, number>()
    validItems.filter(item => item.fromInventory).forEach(item => { const key = item.productName.trim().toLowerCase(); requestedByProduct.set(key, (requestedByProduct.get(key) ?? 0) + item.quantity) })
    requestedByProduct.forEach((quantity, key) => { const available = Math.max(0, stockByProduct.get(key) ?? 0); if (quantity > available) errs.push(`Hàng tồn "${key}" chỉ còn ${available} đôi`) })

    if (deposit < 0) errs.push('Tiền đặt cọc không được âm')
    setErrors(errs)
    if (errs.length > 0) return

    let resolvedCustomerId = customerId
    if (!resolvedCustomerId) {
      const created = addCustomer(customerName, customerAddress, customerPhone)
      resolvedCustomerId = created.customerId
    }

    const invoice = createInvoice(
      {
        invoiceId: invoiceCode,
        customerId: resolvedCustomerId,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        invoiceDate,
        items: validItems,
        deposit,
        paid: 0,
      },
      settings,
    )

    setSuccessCode(invoice.invoiceId)
    resetForm()
    onSaved?.(invoice.invoiceId)
  }

  return (
    <>
      <PageHeader title="Tạo hóa đơn" subtitle="Nhập thông tin hóa đơn và mặt hàng" />

      {successCode && (
        <div className="success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Đã lưu hóa đơn {successCode}</span>
        </div>
      )}

      <InvoiceCustomerSection
        customerName={customerName}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        paymentMethod={paymentMethod}
        selectedCustomerId={customerId}
        customers={customers}
        onNameChange={setCustomerName}
        onPhoneChange={setCustomerPhone}
        onAddressChange={setCustomerAddress}
        onPaymentMethodChange={setPaymentMethod}
        onSelectCustomer={handleSelectCustomer}
      />

      <section className="form-card">
        <div className="form-card-heading">
          <h2>Mã hóa đơn & ngày</h2>
        </div>
        <div className="invoice-meta-grid">
          <label className="field">
            <span className="field-label">Mã hóa đơn</span>
            <input value={invoiceCode} readOnly />
          </label>
          <label className="field">
            <span className="field-label">Ngày</span>
            <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="form-card">
        <div className="form-card-heading">
          <h2>Danh sách mặt hàng</h2>
          <span className="count-pill">{items.length}</span>
        </div>

        <div className="invoice-table-scroll">
          <table className="invoice-table">
            <thead>
              <tr><th>STT</th><th>Tên hàng</th><th>Loại</th><th>SL</th><th>Nhập giá</th><th>Giá gốc</th><th>Nguồn</th><th>Đơn giá bán</th><th>Thành tiền</th><th aria-label="Xóa" /></tr>
            </thead>
            <tbody>{items.map((item, index) => (
              <InvoiceItemEditor
                key={item.id}
                item={item}
                settings={settings}
                index={index}
                isRemovable={items.length > 1}
                onChange={updateItem}
                onRemove={() => removeItem(item.id)}
              />
            ))}</tbody>
          </table>
        </div>

        <button type="button" className="add-item-btn" onClick={addItem}>
          <Icon name="plus" size={18} />
          Thêm mặt hàng
        </button>
      </section>

      <section className="form-card">
        <label className="field">
          <span className="field-label">Tiền đặt cọc (VNĐ)</span>
          <input type="number" min={0} inputMode="numeric" value={deposit || ''} placeholder="0" onChange={(event) => setDeposit(Math.max(0, parseNumber(event.target.value)))} />
          <span className="field-help">Khoản này được lưu thành một giao dịch thanh toán riêng.</span>
        </label>
      </section>

      <InvoiceTotalsSection subtotal={subtotal} deposit={deposit} breakdown={{ deposit, paid: paymentMethod === 'cod' ? Math.max(0, subtotal - deposit) : 0, remaining: paymentMethod === 'cod' ? 0 : Math.max(0, subtotal - deposit), codAmount }} />

      {errors.length > 0 && (
        <div className="error-banner" role="alert">
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="primary-button" onClick={handleSave}>
        Lưu hóa đơn
      </button>
    </>
  )
}
