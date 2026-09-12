import { useState } from 'react'
import type { Customer, PaymentMethod } from '../types/invoice'

interface InvoiceCustomerSectionProps {
  customerName: string
  customerPhone: string
  customerAddress: string
  paymentMethod: PaymentMethod
  selectedCustomerId: string | null
  customers: Customer[]
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onAddressChange: (value: string) => void
  onPaymentMethodChange: (value: PaymentMethod) => void
  onSelectCustomer: (customer: Customer | null) => void
}

export function InvoiceCustomerSection(props: InvoiceCustomerSectionProps) {
  const { customerName, customerPhone, customerAddress, paymentMethod, selectedCustomerId, customers } = props
  const [showSuggestions, setShowSuggestions] = useState(false)
  const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim()
  const query = normalizeName(customerName)
  const suggestions = query ? customers.filter(customer => normalizeName(customer.name).includes(query)).slice(0, 8) : []
  return <section className="form-card invoice-paper-header">
    <div className="form-card-heading"><h2>Thông tin hóa đơn</h2></div>
    <div className="invoice-customer-grid">
      <label className="field"><span className="field-label">Khách có sẵn</span><select value={selectedCustomerId ?? ''} onChange={(event) => props.onSelectCustomer(customers.find(customer => customer.customerId === event.target.value) ?? null)}><option value="">Khách mới / nhập nhanh</option>{customers.map(customer => <option key={customer.customerId} value={customer.customerId}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select></label>
      <div className="customer-name-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowSuggestions(false) }} onKeyDown={event => { if (event.key === 'Escape') setShowSuggestions(false) }}>
        <label className="field"><span className="field-label">Tên khách hàng</span><input autoComplete="off" value={customerName} onFocus={() => setShowSuggestions(true)} onChange={event => { props.onNameChange(event.target.value); setShowSuggestions(true) }} placeholder="Nhập tên khách" /></label>
        {showSuggestions && !selectedCustomerId && suggestions.length > 0 && <div className="customer-name-suggestions" aria-label="Khách hàng được đề xuất">
          {suggestions.map(customer => <button type="button" key={customer.customerId} onMouseDown={event => event.preventDefault()} onClick={() => { props.onSelectCustomer(customer); setShowSuggestions(false) }}>
            <strong>{customer.name}</strong>
            {(customer.phone || customer.address) && <span>{[customer.phone, customer.address].filter(Boolean).join(' · ')}</span>}
          </button>)}
        </div>}
      </div>
      <label className="field"><span className="field-label">SĐT</span><input type="tel" inputMode="tel" value={customerPhone} onChange={(event) => props.onPhoneChange(event.target.value)} placeholder="Ví dụ: 09..." /></label>
      <label className="field invoice-address-field"><span className="field-label">Địa chỉ</span><input value={customerAddress} onChange={(event) => props.onAddressChange(event.target.value)} placeholder="Nhập địa chỉ" /></label>
      <label className="field"><span className="field-label">Thanh toán</span><select value={paymentMethod} onChange={(event) => props.onPaymentMethodChange(event.target.value as PaymentMethod)}><option value="transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="cod">COD</option></select></label>
    </div>
  </section>
}
