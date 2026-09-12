import type { AppSettings, InvoiceItemDraft } from '../types/invoice'
import { ITEM_TYPES } from '../types/invoice'
import { calculateItem } from '../utils/invoiceCalculation'
import { formatVnd, parseNumber } from '../utils/money'
import { Icon } from './Icon'

interface InvoiceItemEditorProps { item: InvoiceItemDraft; settings: AppSettings; index: number; isRemovable: boolean; onChange: (item: InvoiceItemDraft) => void; onRemove: () => void }

export function InvoiceItemEditor({ item, settings, index, isRemovable, onChange, onRemove }: InvoiceItemEditorProps) {
  const calculated = calculateItem(item, settings)
  return <tr>
    <td className="invoice-row-number"><span>{index + 1}</span><button type="button" className="table-delete" onClick={onRemove} disabled={!isRemovable} aria-label={`Xóa mặt hàng ${index + 1}`}><Icon name="trash" size={16} /></button></td>
    <td><span className="invoice-cell-control"><input aria-label={`Mã hàng dòng ${index + 1}`} value={item.productName} onChange={event => onChange({ ...item, productName: event.target.value })} placeholder="Mã hàng" /></span></td>
    <td><span className="invoice-cell-control"><select aria-label={`Loại hàng ${index + 1}`} value={item.itemType} onChange={event => onChange({ ...item, itemType: event.target.value as InvoiceItemDraft['itemType'] })}>{ITEM_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></span></td>
    <td><span className="invoice-cell-control"><input aria-label={`SL hàng ${index + 1}`} type="number" min={0} inputMode="numeric" value={item.quantity || ''} placeholder="0" onChange={event => onChange({ ...item, quantity: Math.max(0, Math.floor(parseNumber(event.target.value))) })} /></span></td>
    <td><span className="invoice-cell-control"><select aria-label={`ĐV hàng ${index + 1}`} value={item.priceMode} onChange={event => onChange({ ...item, priceMode: event.target.value as InvoiceItemDraft['priceMode'] })}><option value="ndt">NDT</option><option value="vnd">VNĐ</option></select></span></td>
    <td><span className="invoice-cell-control"><input aria-label={`Giá gốc hàng ${index + 1}`} type="number" min={0} step={item.priceMode === 'ndt' ? 'any' : 1000} inputMode="decimal" value={item.originalPrice || ''} placeholder="0" onChange={event => onChange({ ...item, originalPrice: Math.max(0, parseNumber(event.target.value)) })} /></span></td>
    <td><span className="invoice-cell-control"><input aria-label={`Phụ phí (VNĐ) hàng ${index + 1}`} type="number" min={0} step={1000} inputMode="numeric" value={item.extraFeeVnd || ''} placeholder="0" onChange={event => onChange({ ...item, extraFeeVnd: Math.max(0, parseNumber(event.target.value)) })} /></span></td>
    <td><output className="table-output">{formatVnd(calculated.unitPrice)}</output></td>
    <td><output className="table-total">{formatVnd(calculated.subtotal)}</output></td>
  </tr>
}
