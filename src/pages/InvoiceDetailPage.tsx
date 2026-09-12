import { useState } from 'react'
import { InvoiceTotalsSection } from '../components/InvoiceTotalsSection'
import { InvoicePackagesEditor } from '../components/InvoicePackagesEditor'
import { groupInvoicePackages } from '../utils/invoicePackages'
import { PageHeader } from '../components/PageHeader'
import { useInvoices } from '../hooks/useInvoices'
import { useSettings } from '../hooks/useSettings'
import type { InvoiceItemDraft, Payment } from '../types/invoice'
import { formatVnd, parseNumber } from '../utils/money'
import { todayIso } from '../utils/id'
import { exportInvoiceImage } from '../utils/invoiceImage'
import { DeleteInvoiceConfirmModal } from '../components/DeleteInvoiceConfirmModal'

interface Props { invoiceId: string; onBack: () => void }
export function InvoiceDetailPage({ invoiceId, onBack }: Props) {
  const { settings } = useSettings()
  const { invoices, payments, addPayment, changePaymentMethod, reviseInvoice, markInvoiceBombed, deleteInvoice } = useInvoices(); const [showForm, setShowForm] = useState(false); const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); const [editing, setEditing] = useState(false); const [editItems, setEditItems] = useState<InvoiceItemDraft[]>([]); const [error, setError] = useState(''); const [exporting, setExporting] = useState(false)
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayIso()); const [method, setMethod] = useState<Payment['paymentMethod']>('transfer'); const [note, setNote] = useState('')
  const invoice = invoices.find(i => i.invoiceId === invoiceId)
  const totalQuantity = invoice?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const codAmount = invoice?.paymentMethod === 'cod' ? Math.max(0, invoice.subtotal - invoice.deposit) : undefined
  const actualProfit = invoice ? invoice.subtotal - (invoice.chinaCostTotal || 0) - (invoice.operatingCostTotal || 0) - (invoice.itemOperatingCostTotal || 0) : 0
  const inventoryLines = invoice?.items.filter(item => item.fromInventory).map(item => {
    const operatingShare = invoice.subtotal > 0 ? Math.round((invoice.operatingCostTotal || 0) * item.subtotal / invoice.subtotal) : 0
    const tienCuu = (item.itemOperatingCost || 0) * item.quantity
    const chinaCost = (item.chinaCostVnd || 0) * item.quantity
    return { item, tienCuu, chinaCost, operatingShare, profit: item.subtotal - chinaCost - tienCuu - operatingShare }
  }) ?? []
  const openEdit = () => {
    if (!invoice) return
    setEditItems(invoice.items.map(item => ({ id: item.itemId, packageNumber: item.packageNumber, productName: item.productName, quantity: item.quantity, itemType: item.itemType, priceMode: item.priceMode, originalPrice: item.originalPrice, extraFeeVnd: item.extraFeeVnd ?? 0, fromInventory: item.fromInventory, saleUnitPrice: item.saleUnitPrice })))
    setEditing(true); setError('')
  }
  const saveEdit = () => {
    const valid = editItems.filter(item => item.productName.trim())
    if (!valid.length || valid.some(item => item.quantity <= 0)) return setError('Mỗi mặt hàng cần có tên và số lượng lớn hơn 0.')
    reviseInvoice(invoiceId, valid, settings); setEditing(false); setError('')
  }
  const updateEditItem = (next: InvoiceItemDraft) => setEditItems(previous => previous.map(item => item.id === next.id ? next : item))
  if (!invoice) return <><button className="back-btn" onClick={onBack}>← Quay lại</button><p>Không tìm thấy hóa đơn.</p></>
  const handlePayment = () => { const value = parseNumber(amount); if (!value || value < 0) return setError('Nhập số tiền thanh toán hợp lệ.'); addPayment({ customerId: invoice.customerId || '', invoiceId, amount: value, paymentDate: date, paymentMethod: method, note }); setShowForm(false); setAmount(''); setNote(''); setError('') }
  const share = async () => { const settlement = invoice.paymentMethod === 'cod' ? `COD cần thanh toán khi giao: ${formatVnd(invoice.subtotal)}` : `Còn phải thanh toán: ${formatVnd(invoice.remaining)}`; const text = `HÓA ĐƠN\n${groupInvoicePackages(invoice.items).map(pack => `Kiện ${pack.number}\n${pack.items.map(x => `${x.productName} (${x.itemType.toUpperCase()}) × ${x.quantity} × ${formatVnd(x.unitPrice)}: ${formatVnd(x.subtotal)}`).join('\n')}\nTổng kiện ${pack.number}: ${pack.quantity} đôi — ${formatVnd(pack.items.reduce((sum, item) => sum + item.subtotal, 0))}`).join('\n\n')}\nTổng số lượng: ${totalQuantity} đôi\nTổng tiền hàng: ${formatVnd(invoice.subtotal)}\nĐặt cọc: ${formatVnd(invoice.deposit)}\n${settlement}`; const canShare = typeof navigator.share === 'function'; if (canShare) await navigator.share({ title: 'Hóa đơn', text }); else await navigator.clipboard?.writeText(text); alert(canShare ? 'Đã mở chia sẻ.' : 'Đã sao chép nội dung hóa đơn.') }
  const exportImage = async () => { try { setExporting(true); const result = await exportInvoiceImage(invoice); alert(result === 'shared' ? 'Đã mở bảng chia sẻ ảnh.' : 'Đã tải ảnh hóa đơn PNG.') } catch (reason) { if ((reason as Error).name !== 'AbortError') setError('Không thể xuất ảnh. Vui lòng thử lại.') } finally { setExporting(false) } }
  const markBombed = () => { if (window.confirm('Đánh dấu khách bom hàng? Hóa đơn không còn tính công nợ. Bạn tự điều chỉnh số lượng hàng tồn nếu nhận lại hàng.')) markInvoiceBombed(invoiceId) }
  const removeInvoice = () => { deleteInvoice(invoiceId); onBack() }
  const shareToZalo = async () => { try { setExporting(true); const result = await exportInvoiceImage(invoice); if (result === 'downloaded') alert('Trình duyệt chưa hỗ trợ chia sẻ ảnh. Ảnh đã tải về, hãy chọn ảnh này trong Zalo để gửi.') } catch (reason) { if ((reason as Error).name !== 'AbortError') setError('Không thể tạo ảnh để chia sẻ. Vui lòng thử lại.') } finally { setExporting(false) } }
  return <><button className="back-btn" onClick={onBack}>← Quay lại</button><PageHeader title="Chi tiết hóa đơn" subtitle={`${invoice.invoiceId} · ${invoice.invoiceDate}`} />
    <section className="form-card invoice-customer"><strong>{invoice.customerName}</strong><span>{invoice.customerAddress || 'Chưa có địa chỉ'}</span><label className="field"><span className="field-label">Hình thức thanh toán</span><select value={invoice.paymentMethod} onChange={event => changePaymentMethod(invoice.invoiceId, event.target.value as typeof invoice.paymentMethod)}><option value="transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="cod">COD</option></select></label><span className="field-help">Đổi sang COD sẽ tự ghi nhận phần còn lại; đổi sang hình thức khác sẽ hoàn tác khoản COD tự động.</span></section>
    {groupInvoicePackages(invoice.items).map(pack => <section className="form-card" key={pack.number}><div className="form-card-heading"><h2>Kiện {pack.number}</h2></div>{pack.items.map(item => <div className="invoice-line" key={item.itemId}><div><strong>{item.productName}</strong><span>{item.itemType.toUpperCase()} · {item.quantity} đôi × {formatVnd(item.unitPrice)}</span></div><strong>{formatVnd(item.subtotal)}</strong></div>)}<div className="invoice-package-total"><span>Tổng kiện {pack.number}: {pack.quantity} đôi</span><strong>{formatVnd(pack.items.reduce((sum, item) => sum + item.subtotal, 0))}</strong></div></section>)}
    {!editing && <button className="secondary-button" onClick={openEdit}>Sửa hóa đơn</button>}
    {editing && <section className="form-card edit-invoice-card"><div className="form-card-heading"><h2>Sửa mặt hàng</h2><span className="count-pill">{editItems.length}</span></div><InvoicePackagesEditor items={editItems} settings={settings} onChange={setEditItems} onItemChange={updateEditItem} />{error && <div className="error-banner">{error}</div>}<div className="edit-invoice-actions"><button type="button" className="secondary-button" onClick={() => { setEditing(false); setError('') }}>Hủy</button><button type="button" className="primary-button" onClick={saveEdit}>Lưu thay đổi</button></div></section>}
    <section className="invoice-quantity-summary"><span>Tổng số lượng</span><strong>{totalQuantity} đôi</strong></section>
    <InvoiceTotalsSection subtotal={invoice.subtotal} breakdown={{ deposit: invoice.deposit, paid: invoice.paid, remaining: invoice.remaining, codAmount }} />
    <section className="form-card profit-card"><div className="form-card-heading"><h2>Lợi nhuận</h2>{invoice.status === 'bombed' && <span className="bombed-pill">Khách bom hàng</span>}</div><div className="totals-row light"><span>Doanh thu</span><strong>{formatVnd(invoice.subtotal)}</strong></div><div className="totals-row light"><span>Tiền gốc Trung Quốc</span><strong>-{formatVnd(invoice.chinaCostTotal || 0)}</strong></div><div className="totals-row light"><span>Tiền cửu</span><strong>-{formatVnd(invoice.itemOperatingCostTotal || 0)}</strong></div><div className="totals-row light"><span>Chi phí vận hành hóa đơn</span><strong>-{formatVnd(invoice.operatingCostTotal || 0)}</strong></div><div className="totals-row profit-row"><span>Lợi nhuận đơn hàng</span><strong>{formatVnd(invoice.profit ?? actualProfit)}</strong></div>{invoice.remaining > 0 && <span className="profit-note">Công nợ chỉ ảnh hưởng dòng tiền; lợi nhuận đơn hàng vẫn được ghi nhận đầy đủ.</span>}</section>
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
    <section className="form-card"><div className="form-card-heading"><h2>Lịch sử thanh toán</h2></div>{payments.filter(p=>p.invoiceId===invoiceId).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt)).map(p=><div className="invoice-line" key={p.paymentId}><div><strong>{p.kind === 'deposit' ? 'Đặt cọc' : p.paymentMethod === 'cod' ? 'COD' : p.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</strong><span>{p.paymentDate}{p.note ? ` · ${p.note}` : ''}</span></div><strong>{formatVnd(p.amount)}</strong></div>)}</section>
  </>
}
