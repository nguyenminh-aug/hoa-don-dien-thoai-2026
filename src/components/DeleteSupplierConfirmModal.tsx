import type { ChinaSupplier } from '../types/invoice'

interface Props {
  supplier: ChinaSupplier
  paymentCount: number
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSupplierConfirmModal({ supplier, paymentCount, onCancel, onConfirm }: Props) {
  return <div className="confirm-modal-backdrop" role="presentation" onMouseDown={onCancel}>
    <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-supplier-title" onMouseDown={event => event.stopPropagation()}>
      <h2 id="delete-supplier-title">Xóa nhà cung cấp?</h2>
      <p>Nhà cung cấp <strong>{supplier.name}</strong> sẽ bị xóa khỏi danh sách.</p>
      {paymentCount > 0 && <p className="confirm-modal-note">{paymentCount} khoản thanh toán liên quan cũng sẽ bị xóa. Các chỉ số tổng hợp sẽ được tính lại ngay.</p>}
      <div className="confirm-modal-actions">
        <button className="secondary-button confirm-cancel-button" onClick={onCancel}>Hủy</button>
        <button className="danger-button" onClick={onConfirm}>Xóa nhà cung cấp</button>
      </div>
    </section>
  </div>
}
