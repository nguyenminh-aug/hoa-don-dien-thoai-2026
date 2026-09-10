import type { AppSettings, InvoiceItemDraft } from '../types/invoice'
import { ITEM_TYPES } from '../types/invoice'
import { calculateItem } from '../utils/invoiceCalculation'
import { formatVnd, parseNumber } from '../utils/money'
import { Icon } from './Icon'

interface InvoiceItemEditorProps { item: InvoiceItemDraft; settings: AppSettings; index: number; isRemovable: boolean; onChange: (item: InvoiceItemDraft) => void; onRemove: () => void }

export function InvoiceItemEditor({ item, settings, index, isRemovable, onChange, onRemove }: InvoiceItemEditorProps) {
  const calculated = calculateItem(item, settings)
  const changeSource = (fromInventory: boolean) => onChange({ ...item, fromInventory, saleUnitPrice: fromInventory ? item.saleUnitPrice ?? calculated.unitPrice : undefined })
  return <article className="invoice-item-compact">
    <div className="invoice-item-top"><strong>#{index + 1}</strong><button type="button" className="table-delete" onClick={onRemove} disabled={!isRemovable} aria-label="Xóa mặt hàng"><Icon name="trash" size={16} /></button></div>
    <div className="invoice-item-grid row-one">
      <label><span>Tên hàng</span><input value={item.productName} onChange={event => onChange({ ...item, productName: event.target.value })} placeholder="Tên / mã hàng" /></label>
      <label><span>Loại</span><select value={item.itemType} onChange={event => onChange({ ...item, itemType: event.target.value as InvoiceItemDraft['itemType'] })}>{ITEM_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></label>
      <label><span>SL</span><input type="number" min={0} inputMode="numeric" value={item.quantity || ''} placeholder="0" onChange={event => onChange({ ...item, quantity: Math.max(0, Math.floor(parseNumber(event.target.value))) })} /></label>
    </div>
    <div className="invoice-item-grid row-two">
      <label><span>Nhập giá</span><select value={item.priceMode} onChange={event => onChange({ ...item, priceMode: event.target.value as InvoiceItemDraft['priceMode'] })}><option value="ndt">NDT</option><option value="vnd">VNĐ</option></select></label>
      <label><span>Giá gốc</span><input type="number" min={0} step={item.priceMode === 'ndt' ? 'any' : 1000} inputMode="decimal" value={item.originalPrice || ''} placeholder="0" onChange={event => onChange({ ...item, originalPrice: Math.max(0, parseNumber(event.target.value)) })} /></label>
      <label><span>Nguồn</span><select value={item.fromInventory ? 'inventory' : 'new'} onChange={event => changeSource(event.target.value === 'inventory')}><option value="new">Hàng mới</option><option value="inventory">Hàng tồn</option></select></label>
      <label><span>Phụ phí (VNĐ)</span><input type="number" min={0} step={1000} inputMode="numeric" value={item.extraFeeVnd || ''} placeholder="0" onChange={event => onChange({ ...item, extraFeeVnd: Math.max(0, parseNumber(event.target.value)) })} /></label>
    </div>
    <div className="invoice-item-result"><span>Đơn giá bán {item.fromInventory ? <input aria-label="Đơn giá bán" type="number" min={0} inputMode="numeric" value={item.saleUnitPrice ?? calculated.unitPrice} onChange={event => onChange({ ...item, saleUnitPrice: Math.max(0, parseNumber(event.target.value)) })} /> : <strong>{formatVnd(calculated.unitPrice)}</strong>}</span><span>Thành tiền <strong>{formatVnd(calculated.subtotal)}</strong></span></div>
  </article>
}
