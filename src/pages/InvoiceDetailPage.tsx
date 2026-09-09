import { useState } from 'react'
import { InvoiceTotalsSection } from '../components/InvoiceTotalsSection'
import { PageHeader } from '../components/PageHeader'
import { useInvoices } from '../hooks/useInvoices'
import type { Payment } from '../types/invoice'
import { formatVnd, parseNumber } from '../utils/money'
import { todayIso } from '../utils/id'
import { exportInvoiceImage } from '../utils/invoiceImage'
import { DeleteInvoiceConfirmModal } from '../components/DeleteInvoiceConfirmModal'

interface Props { invoiceId: string; onBack: () => void }
export function InvoiceDetailPage({ invoiceId, onBack }: Props) {
  const { invoices, payments, addPayment, markInvoiceBombed, deleteInvoice } = useInvoices(); const [showForm, setShowForm] = useState(false); const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); const [error, setError] = useState(''); const [exporting, setExporting] = useState(false)
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayIso()); const [method, setMethod] = useState<Payment['paymentMethod']>('transfer'); const [note, setNote] = useState('')
  const invoice = invoices.find(i => i.invoiceId === invoiceId)
  const codAmount = invoice?.paymentMethod === 'cod' ? Math.max(0, invoice.subtotal - invoice.deposit) : undefined
  const actualProfit = invoice ? invoice.subtotal - (invoice.chinaCostTotal || 0) - (invoice.operatingCostTotal || 0) - (invoice.itemOperatingCostTotal || 0) : 0
  const inventoryLines = invoice?.items.filter(item => item.fromInventory).map(item => {
    const operatingShare = invoice.subtotal > 0 ? Math.round((invoice.operatingCostTotal || 0) * item.subtotal / invoice.subtotal) : 0
    const tienCuu = (item.itemOperatingCost || 0) * item.quantity
    const chinaCost = (item.chinaCostVnd || 0) * item.quantity
    return { item, tienCuu, chinaCost, operatingShare, profit: item.subtotal - chinaCost - tienCuu - operatingShare }
  }) ?? []
  if (!invoice) return <><button className="back-btn" onClick={onBack}>← Quay lại</button><p>Không tìm thấy hóa đơn.</p></>
  const handlePayment = () => { const value = parseNumber(amount); if (!value || value < 0) return setError('Nhập số tiền thanh toán hợp lệ.'); addPayment({ customerId: invoice.customerId || '', invoiceId, amount: value, paymentDate: date, paymentMethod: method, note }); setShowForm(false); setAmount(''); setNote(''); setError('') }
  const share = async () => { const text = `HÓA ĐƠN\n${invoice.items.map(x=>`${x.productName} x${x.quantity}: ${formatVnd(x.subtotal)}`).join('\n')}\nTổng tiền hàng: ${formatVnd(invoice.subtotal)}\nĐặt cọc: ${formatVnd(invoice.deposit)}\nCòn phải thanh toán: ${formatVnd(invoice.remaining)}`; const canShare = typeof navigator.share === 'function'; if (canShare) await navigator.share({ title: 'Hóa đơn', text }); else await navigator.clipboard?.writeText(text); alert(canShare ? 'Đã mở chia sẻ.' : 'Đã sao chép nội dung hóa đơn.') }
  const exportImage = async () => { try { setExporting(true); const result = await exportInvoiceImage(invoice); alert(result === 'shared' ? 'Đã mở bảng chia sẻ ảnh.' : 'Đã tải ảnh hóa đơn PNG.') } catch (reason) { if ((reason as Error).name !== 'AbortError') setError('Không thể xuất ảnh. Vui lòng thử lại.') } finally { setExporting(false) } }
  const markBombed = () => { if (window.confirm('Đánh dấu khách bom hàng? Toàn bộ mặt hàng sẽ chuyển vào Hàng tồn và hóa đơn không còn tính công nợ.')) markInvoiceBombed(invoiceId) }
  const removeInvoice = () => { deleteInvoice(invoiceId); onBack() }
  const shareToZalo = async () => { try { setExporting(true); const result = await exportInvoiceImage(invoice); if (result === 'downloaded') alert('Trình duyệt chưa hỗ trợ chia sẻ ảnh. Ảnh đã tải về, hãy chọn ảnh này trong Zalo để gửi.') } catch (reason) { if ((reason as Error).name !== 'AbortError') setError('Không thể tạo ảnh để chia sẻ. Vui lòng thử lại.') } finally { setExporting(false) } }
  return <><button className="back-btn" onClick={onBack}>← Quay lại</button><PageHeader title="Chi tiết hóa đơn" subtitle={`${invoice.invoiceId} · ${invoice.invoiceDate}`} />
    <section className="form-card invoice-customer"><strong>{invoice.customerName}</strong><span>{invoice.customerAddress || 'Chưa có địa chỉ'}</span><span>Thanh toán: {invoice.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'COD'}</span></section>
    <section className="form-card"><div className="form-card-heading"><h2>Danh sách hàng</h2></div>{invoice.items.map(item => <div className="invoice-line" key={item.itemId}><div><strong>{item.productName}</strong><span>{item.quantity} đôi × {formatVnd(item.unitPrice)}</span></div><strong>{formatVnd(item.subtotal)}</strong></div>)}</section>
    <InvoiceTotalsSection subtotal={invoice.subtotal} breakdown={{ deposit: invoice.deposit, paid: invoice.paid, remaining: invoice.remaining, codAmount }} />
    <section className="form-card profit-card"><div className="form-card-heading"><h2>Lợi nhuận</h2>{invoice.status === 'bombed' && <span className="bombed-pill">Khách bom hàng</span>}</div><div className="totals-row light"><span>Doanh thu</span><strong>{formatVnd(invoice.subtotal)}</strong></div><div className="totals-row light"><span>Tiền gốc Trung Quốc</span><strong>-{formatVnd(invoice.chinaCostTotal || 0)}</strong></div><div className="totals-row light"><span>Tiền cửu</span><strong>-{formatVnd(invoice.itemOperatingCostTotal || 0)}</strong></div><div className="totals-row light"><span>Chi phí vận hành hóa đơn</span><strong>-{formatVnd(invoice.operatingCostTotal || 0)}</strong></div><div className="totals-row profit-row"><span>{invoice.remaining > 0 ? 'Lợi nhuận dự kiến (còn nợ)' : 'Lợi nhuận đã tính'}</span><strong>{invoice.remaining > 0 ? formatVnd(0) : formatVnd(invoice.profit ?? invoice.subtotal - (invoice.chinaCostTotal || 0) - (invoice.operatingCostTotal || 0) - (invoice.itemOperatingCostTotal || 0))}</strong></div>{invoice.remaining > 0 && <span className="profit-note">Hóa đơn còn nợ nên chưa được cộng vào lợi nhuận.</span>}</section>
    {inventoryLines.length > 0 && <section className="form-card inventory-profit-card"><div className="form-card-heading"><h2>Lãi/lỗ hàng tồn</h2><span>Đã gồm Tiền cửu</span></div>{inventoryLines.map(({ item, chinaCost, tienCuu, operatingShare, profit }) => <div className="inventory-profit-line" key={item.itemId}><div><strong>{item.productName} × {item.quantity}</strong><span>Thu {formatVnd(item.subtotal)} · Gốc {formatVnd(chinaCost)} · Cửu {formatVnd(tienCuu)} · VH {formatVnd(operatingShare)}</span></div><strong className={profit < 0 ? 'loss-value' : 'profit-value'}>{formatVnd(profit)}</strong></div>)}</section>}
    <div className={actualProfit < 0 ? 'invoice-loss-warning' : 'invoice-profit-summary'}>{actualProfit < 0 ? `Hóa đơn đang lỗ ${formatVnd(Math.abs(actualProfit))}` : `Lợi nhuận dự kiến: ${formatVnd(actualProfit)}`}</div>
    {invoice.status !== 'bombed' && <button className="bomb-button" onClick={markBombed}>Khách bom hàng</button>}
    <button className="delete-invoice-button" onClick={() => setShowDeleteConfirm(true)}>Xóa hóa đơn</button>
    {showDeleteConfirm && <DeleteInvoiceConfirmModal invoiceId={invoice.invoiceId} isBombed={invoice.status === 'bombed'} onCancel={() => setShowDeleteConfirm(false)} onConfirm={removeInvoice} />}
    <button className="zalo-button" onClick={shareToZalo} disabled={exporting}>{exporting ? 'Đang tạo ảnh...' : 'Chia sẻ ảnh qua Zalo'}</button>
    <button className="primary-button" onClick={exportImage} disabled={exporting}>{exporting ? 'Đang tạo ảnh...' : 'Xuất ảnh hóa đơn'}</button>
    <button className="secondary-button" onClick={share}>Chia sẻ hóa đơn</button>
    {invoice.remaining > 0 && <button className="primary-button" onClick={() => setShowForm(!showForm)}>Thêm thanh toán</button>}
    {showForm && <section className="form-card payment-form"><div className="form-card-heading"><h2>Giao dịch mới</h2></div><label className="field"><span className="field-label">Số tiền</span><input type="number" min={1} value={amount} onChange={e=>setAmount(e.target.value)} /></label><label className="field"><span className="field-label">Ngày thanh toán</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label><div className="segmented"><button className={method==='transfer'?'active':''} onClick={()=>setMethod('transfer')}>Chuyển khoản</button><button className={method==='cash'?'active':''} onClick={()=>setMethod('cash')}>Tiền mặt</button></div><label className="field"><span className="field-label">Ghi chú</span><input value={note} onChange={e=>setNote(e.target.value)} /></label>{error && <div className="error-banner">{error}</div>}<button className="primary-button" onClick={handlePayment}>Lưu thanh toán</button></section>}
    <section className="form-card"><div className="form-card-heading"><h2>Lịch sử thanh toán</h2></div>{payments.filter(p=>p.invoiceId===invoiceId).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt)).map(p=><div className="invoice-line" key={p.paymentId}><div><strong>{p.kind === 'deposit' ? 'Đặt cọc' : p.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</strong><span>{p.paymentDate}{p.note ? ` · ${p.note}` : ''}</span></div><strong>{formatVnd(p.amount)}</strong></div>)}</section>
  </>
}
