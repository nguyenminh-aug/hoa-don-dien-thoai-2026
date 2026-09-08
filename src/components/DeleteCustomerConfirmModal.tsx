import type { Customer } from '../types/invoice'

interface Props {
  customer: Customer
  invoiceCount: number
  debtCount?: number
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteCustomerConfirmModal({ customer, invoiceCount, debtCount = 0, onCancel, onConfirm }: Props) {
  const canDelete = invoiceCount === 0 && debtCount === 0
  return <div className="confirm-modal-backdrop" role="presentation" onMouseDown={onCancel}>
    <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" onMouseDown={event => event.stopPropagation()}>
      <h2 id="delete-customer-title">Xóa khách hàng?</h2>
      {canDelete
        ? <p>Khách hàng <strong>{customer.name}</strong> sẽ bị xóa khỏi danh sách và localStorage.</p>
        : <p>Không thể xóa <strong>{customer.name}</strong> vì khách này còn {invoiceCount} hóa đơn{debtCount ? ` và ${debtCount} khoản ghi nợ` : ''}. Hãy xử lý các dữ liệu liên quan trước để giữ dữ liệu nhất quán.</p>}
      <div className="confirm-modal-actions">
        <button className="secondary-button confirm-cancel-button" onClick={onCancel}>{canDelete ? 'Hủy' : 'Đã hiểu'}</button>
        {canDelete && <button className="danger-button" onClick={onConfirm}>Xóa khách hàng</button>}
      </div>
    </section>
  </div>
}
