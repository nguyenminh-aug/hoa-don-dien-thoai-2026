import { formatVnd } from '../utils/money'

interface InvoiceTotalsSectionProps {
  subtotal: number
  deposit?: number
  breakdown?: {
    deposit: number
    paid: number
    remaining: number
    codAmount?: number
  }
}

export function InvoiceTotalsSection({ subtotal, deposit = 0, breakdown }: InvoiceTotalsSectionProps) {
  return (
    <section className="form-card totals-card">
      <div className="totals-row">
        <span>Tổng tiền hàng</span>
        <strong>{formatVnd(subtotal)}</strong>
      </div>

      {(breakdown || deposit > 0) && (
        <>
          <div className="totals-row deposit">
            <span>Đặt cọc</span>
            <strong>-{formatVnd(breakdown?.deposit ?? deposit)}</strong>
          </div>
          {breakdown?.codAmount !== undefined && <div className="totals-row cod">
            <span>COD cần thu khi giao</span>
            <strong>{formatVnd(breakdown.codAmount)}</strong>
          </div>}
          {breakdown && <div className="totals-row paid">
            <span>Đã thanh toán</span>
            <strong>-{formatVnd(breakdown.paid)}</strong>
          </div>}
          {breakdown && <div className="totals-row remaining">
            <span>Còn phải thanh toán</span>
            <strong>{formatVnd(breakdown.remaining)}</strong>
          </div>}
        </>
      )}
    </section>
  )
}
