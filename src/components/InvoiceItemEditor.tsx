import type { AppSettings, InvoiceItemDraft } from '../types/invoice'
import { ITEM_TYPES } from '../types/invoice'
import { calculateItem } from '../utils/invoiceCalculation'
import { formatVnd, parseNumber } from '../utils/money'
import { Icon } from './Icon'

interface InvoiceItemEditorProps { item: InvoiceItemDraft; settings: AppSettings; index: number; isRemovable: boolean; onChange: (item: InvoiceItemDraft) => void; onRemove: () => void }

export function InvoiceItemEditor({ item, settings, index, isRemovable, onChange, onRemove }: InvoiceItemEditorProps) {
  const calculated = calculateItem(item, settings)
  const changeSource = (fromInventory: boolean) => onChange({ ...item, fromInventory, saleUnitPrice: fromInventory ? item.saleUnitPrice ?? calculated.unitPrice : undefined })
  return <tr>
    <td className="invoice-row-number"><span>{index + 1}</span><button type="button" className="table-delete" onClick={onRemove} disabled={!isRemovable} aria-label={`Xóa mặt hàng ${index + 1}`}><Icon name="trash" size={16} /></button></td>
    <td><input aria-label={`Mã hàng dòng ${index + 1}`} value={item.productName} onChange={event => onChange({ ...item, productName: event.target.value })} placeholder="Tên / mã hàng" /></td>
    <td><select aria-label={`Loại hàng ${index + 1}`} value={item.itemType} onChange={event => onChange({ ...item, itemType: event.target.value as InvoiceItemDraft['itemType'] })}>{ITEM_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></td>
    <td><input aria-label={`SL hàng ${index + 1}`} type="number" min={0} inputMode="numeric" value={item.quantity || ''} placeholder="0" onChange={event => onChange({ ...item, quantity: Math.max(0, Math.floor(parseNumber(event.target.value))) })} /></td>
    <td><select aria-label={`Nhập giá hàng ${index + 1}`} value={item.priceMode} onChange={event => onChange({ ...item, priceMode: event.target.value as InvoiceItemDraft['priceMode'] })}><option value="ndt">NDT</option><option value="vnd">VNĐ</option></select></td>
    <td><input aria-label={`Giá gốc hàng ${index + 1}`} type="number" min={0} step={item.priceMode === 'ndt' ? 'any' : 1000} inputMode="decimal" value={item.originalPrice || ''} placeholder="0" onChange={event => onChange({ ...item, originalPrice: Math.max(0, parseNumber(event.target.value)) })} /></td>
    <td><select aria-label={`Nguồn hàng ${index + 1}`} value={item.fromInventory ? 'inventory' : 'new'} onChange={event => changeSource(event.target.value === 'inventory')}><option value="new">Hàng mới</option><option value="inventory">Hàng tồn</option></select></td>
    <td><input aria-label={`Phụ phí (VNĐ) hàng ${index + 1}`} type="number" min={0} step={1000} inputMode="numeric" value={item.extraFeeVnd || ''} placeholder="0" onChange={event => onChange({ ...item, extraFeeVnd: Math.max(0, parseNumber(event.target.value)) })} /></td>
    <td>{item.fromInventory ? <input aria-label={`Đơn giá bán hàng ${index + 1}`} className="table-number" type="number" min={0} inputMode="numeric" value={item.saleUnitPrice ?? calculated.unitPrice} onChange={event => onChange({ ...item, saleUnitPrice: Math.max(0, parseNumber(event.target.value)) })} /> : <output className="table-output">{formatVnd(calculated.unitPrice)}</output>}</td>
    <td><output className="table-total">{formatVnd(calculated.subtotal)}</output></td>
  </tr>
}
