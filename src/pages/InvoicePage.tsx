import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { InvoiceCustomerSection } from '../components/InvoiceCustomerSection'
import { InvoicePackagesEditor } from '../components/InvoicePackagesEditor'
import { InvoiceTotalsSection } from '../components/InvoiceTotalsSection'
import { PageHeader } from '../components/PageHeader'
import { useCustomers } from '../hooks/useCustomers'
import { useInvoices } from '../hooks/useInvoices'
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
    quantity: 0,
    itemType: 'te',
    priceMode: 'ndt',
    originalPrice: 0,
    extraFeeVnd: 0,
  }
}

export function InvoicePage({ onSaved }: InvoicePageProps) {
  const { settings } = useSettings()
  const { createInvoice } = useInvoices()
  const { customers, addCustomer } = useCustomers()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [invoiceCode, setInvoiceCode] = useState(generateInvoiceCode())
  const [items, setItems] = useState<InvoiceItemDraft[]>(() => Array.from({ length: 5 }, createEmptyItem))
  const [deposit, setDeposit] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [successCode, setSuccessCode] = useState<string | null>(null)

  const subtotal = useMemo(() => calculateInvoiceTotal(items.filter(item => item.productName.trim()), settings), [items, settings])
  const codAmount = paymentMethod === 'cod' ? Math.max(0, subtotal - deposit) : undefined

  const updateItem = (next: InvoiceItemDraft) => setItems(previous => previous.map(item => item.id === next.id ? next : item))

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
    setItems(Array.from({ length: 5 }, createEmptyItem))
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
        onNameChange={value => {
          if (customerId) { setCustomerId(null); setCustomerPhone(''); setCustomerAddress('') }
          setCustomerName(value)
        }}
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

        <InvoicePackagesEditor items={items} settings={settings} onChange={setItems} onItemChange={updateItem} />
        <label className="field invoice-table-deposit">
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
