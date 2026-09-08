interface Props {
  invoiceId: string
  isBombed?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** A shared destructive-action confirmation so every invoice list behaves alike. */
export function DeleteInvoiceConfirmModal({ invoiceId, isBombed = false, onCancel, onConfirm }: Props) {
  return <div className="confirm-modal-backdrop" role="presentation" onMouseDown={onCancel}>
    <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title" onMouseDown={event => event.stopPropagation()}>
      <h2 id="delete-invoice-title">Xóa hóa đơn?</h2>
      <p>Hóa đơn <strong>{invoiceId}</strong> và mọi thanh toán liên quan sẽ bị xóa. Các số liệu tổng hợp sẽ được tính lại ngay.</p>
      {isBombed && <p className="confirm-modal-note">Hàng tồn được tạo từ hóa đơn bom này cũng sẽ được cập nhật lại.</p>}
      <div className="confirm-modal-actions">
        <button className="secondary-button confirm-cancel-button" onClick={onCancel}>Hủy</button>
        <button className="danger-button" onClick={onConfirm}>Xóa hóa đơn</button>
      </div>
    </section>
  </div>
}
