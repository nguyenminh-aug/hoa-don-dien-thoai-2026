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
      <p>Hóa đơn <strong>{invoiceId}</strong> sẽ chuyển vào thùng rác và không còn tính vào doanh thu, công nợ hay số lượng hàng đã bán. Thanh toán liên quan được giữ cùng hóa đơn nhưng không tính vào số tiền đã thu.</p>
      <p>Bạn có thể khôi phục tại Cài đặt → Thùng rác hóa đơn. Thao tác này không hoàn tiền cho khách.</p>
      {isBombed && <p className="confirm-modal-note">Hàng tồn được tạo từ hóa đơn bom này cũng sẽ được cập nhật lại.</p>}
      <div className="confirm-modal-actions">
        <button className="secondary-button confirm-cancel-button" onClick={onCancel}>Hủy</button>
        <button className="danger-button" onClick={onConfirm}>Chuyển vào thùng rác</button>
      </div>
    </section>
  </div>
}
