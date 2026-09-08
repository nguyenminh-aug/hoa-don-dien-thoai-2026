import { useMemo, useState } from 'react'
import type { Customer, PaymentMethod } from '../types/invoice'
import { Icon } from './Icon'

interface InvoiceCustomerSectionProps {
  customerName: string
  customerAddress: string
  paymentMethod: PaymentMethod
  selectedCustomerId: string | null
  customers: Customer[]
  onNameChange: (value: string) => void
  onAddressChange: (value: string) => void
  onPaymentMethodChange: (value: PaymentMethod) => void
  onSelectCustomer: (customer: Customer) => void
  onClearCustomer: () => void
}

export function InvoiceCustomerSection({
  customerName,
  customerAddress,
  paymentMethod,
  selectedCustomerId,
  customers,
  onNameChange,
  onAddressChange,
  onPaymentMethodChange,
  onSelectCustomer,
  onClearCustomer,
}: InvoiceCustomerSectionProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  const matches = useMemo(() => {
    const query = customerName.trim().toLowerCase()
    if (!query || selectedCustomerId) return []
    return customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.address.toLowerCase().includes(query),
      )
      .slice(0, 6)
  }, [customers, customerName, selectedCustomerId])

  const handleNameChange = (value: string) => {
    onNameChange(value)
    setSearchOpen(true)
  }

  return (
    <section className="form-card">
      <div className="form-card-heading">
        <h2>Thông tin khách hàng</h2>
      </div>

      {selectedCustomerId ? (
        <div className="selected-customer">
          <div className="selected-customer-info">
            <strong>{customerName}</strong>
            <span>{customerAddress}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClearCustomer}
            aria-label="Bỏ chọn khách hàng"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            <span className="field-label">Tên khách hàng</span>
            <input
              value={customerName}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Nhập tên khách hàng"
            />
          </label>

          {searchOpen && matches.length > 0 && (
            <div className="customer-results">
              {matches.map((customer) => (
                <button
                  key={customer.customerId}
                  type="button"
                  className="customer-result"
                  onClick={() => {
                    onSelectCustomer(customer)
                    setSearchOpen(false)
                  }}
                >
                  <strong>{customer.name}</strong>
                  <span>{customer.address}</span>
                </button>
              ))}
            </div>
          )}

          <label className="field">
            <span className="field-label">Địa chỉ</span>
            <input
              value={customerAddress}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="Nhập địa chỉ"
            />
          </label>
        </>
      )}

      <div className="field">
        <span className="field-label">Phương thức thanh toán</span>
        <div className="segmented">
          <button
            type="button"
            className={paymentMethod === 'transfer' ? 'active' : ''}
            onClick={() => onPaymentMethodChange('transfer')}
          >
            Chuyển khoản
          </button>
          <button
            type="button"
            className={paymentMethod === 'cod' ? 'active' : ''}
            onClick={() => onPaymentMethodChange('cod')}
          >
            COD
          </button>
        </div>
      </div>
    </section>
  )
}
