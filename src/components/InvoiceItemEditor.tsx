import type { AppSettings, InvoiceItemDraft } from '../types/invoice'
import { ITEM_TYPES } from '../types/invoice'
import { calculateItem } from '../utils/invoiceCalculation'
import { formatVnd, parseNumber } from '../utils/money'
import { Icon } from './Icon'

interface InvoiceItemEditorProps {
  item: InvoiceItemDraft
  settings: AppSettings
  index: number
  isRemovable: boolean
  onChange: (item: InvoiceItemDraft) => void
  onRemove: () => void
}

/** A compact paper-invoice-style row. The enclosing table scrolls horizontally on phones. */
export function InvoiceItemEditor({ item, settings, index, isRemovable, onChange, onRemove }: InvoiceItemEditorProps) {
  const calculated = calculateItem(item, settings)
  const changeSource = (fromInventory: boolean) => onChange({ ...item, fromInventory, saleUnitPrice: fromInventory ? item.saleUnitPrice ?? calculated.unitPrice : undefined })

  return (
    <tr className="invoice-table-row">
      <td className="invoice-row-number">{index + 1}</td>
      <td><input aria-label={`Tên hàng ${index + 1}`} value={item.productName} onChange={(event) => onChange({ ...item, productName: event.target.value })} placeholder="Tên / mã hàng" /></td>
      <td><select aria-label="Loại hàng" value={item.itemType} onChange={(event) => onChange({ ...item, itemType: event.target.value as InvoiceItemDraft['itemType'] })}>{ITEM_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></td>
      <td><input className="table-number" aria-label="Số lượng" type="number" min={1} inputMode="numeric" value={item.quantity} onChange={(event) => onChange({ ...item, quantity: Math.max(0, Math.floor(parseNumber(event.target.value))) })} /></td>
      <td><select aria-label="Cách nhập giá" value={item.priceMode} onChange={(event) => onChange({ ...item, priceMode: event.target.value as InvoiceItemDraft['priceMode'] })}><option value="ndt">NDT</option><option value="vnd">VNĐ</option></select></td>
      <td><input className="table-number" aria-label="Giá gốc" type="number" min={0} step={item.priceMode === 'ndt' ? 'any' : 1000} inputMode={item.priceMode === 'ndt' ? 'decimal' : 'numeric'} value={item.originalPrice || ''} placeholder="0" onChange={(event) => onChange({ ...item, originalPrice: Math.max(0, parseNumber(event.target.value)) })} /></td>
      <td><select aria-label="Nguồn hàng" value={item.fromInventory ? 'inventory' : 'new'} onChange={(event) => changeSource(event.target.value === 'inventory')}><option value="new">Hàng mới</option><option value="inventory">Hàng tồn</option></select></td>
      <td>{item.fromInventory ? <input className="table-number" aria-label="Đơn giá bán" type="number" min={0} step={1000} inputMode="numeric" value={item.saleUnitPrice ?? calculated.unitPrice} onChange={(event) => onChange({ ...item, saleUnitPrice: Math.max(0, parseNumber(event.target.value)) })} /> : <output className="table-output">{formatVnd(calculated.unitPrice)}</output>}</td>
      <td><strong className="table-total">{formatVnd(calculated.subtotal)}</strong><small>{calculated.chinaAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tệ</small></td>
      <td><button type="button" className="table-delete" onClick={onRemove} disabled={!isRemovable} aria-label="Xóa mặt hàng"><Icon name="trash" size={16} /></button></td>
    </tr>
  )
}
