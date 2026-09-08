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

export function InvoiceItemEditor({
  item,
  settings,
  index,
  isRemovable,
  onChange,
  onRemove,
}: InvoiceItemEditorProps) {
  const calculated = calculateItem(item, settings)

  return (
    <article className="item-editor">
      <div className="item-editor-header">
        <span className="item-index">#{index + 1}</span>
        {isRemovable && (
          <button
            type="button"
            className="icon-btn danger"
            onClick={onRemove}
            aria-label="Xóa mặt hàng"
          >
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>

      <label className="field">
        <span className="field-label">Tên hàng</span>
        <input
          value={item.productName}
          onChange={(event) => onChange({ ...item, productName: event.target.value })}
          placeholder="Nhập tên hàng"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">Số lượng</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={item.quantity}
            onChange={(event) =>
              onChange({ ...item, quantity: Math.max(0, Math.floor(parseNumber(event.target.value))) })
            }
          />
        </label>

        <div className="field">
          <span className="field-label">Loại hàng</span>
          <div className="segmented compact">
            {ITEM_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={item.itemType === type ? 'active' : ''}
                onClick={() => onChange({ ...item, itemType: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Cách nhập giá</span>
        <div className="segmented">
          <button
            type="button"
            className={item.priceMode === 'ndt' ? 'active' : ''}
            onClick={() => onChange({ ...item, priceMode: 'ndt' })}
          >
            NDT
          </button>
          <button
            type="button"
            className={item.priceMode === 'vnd' ? 'active' : ''}
            onClick={() => onChange({ ...item, priceMode: 'vnd' })}
          >
            VNĐ
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">{item.priceMode === 'ndt' ? 'Giá gốc (NDT)' : 'Giá (VNĐ)'}</span>
        <input
          type="number"
          min={0}
          step={item.priceMode === 'ndt' ? 'any' : 1000}
          inputMode={item.priceMode === 'ndt' ? 'decimal' : 'numeric'}
          value={item.originalPrice}
          onChange={(event) =>
            onChange({ ...item, originalPrice: Math.max(0, parseNumber(event.target.value)) })
          }
        />
      </label>

      <button type="button" className={item.fromInventory ? 'inventory-source active' : 'inventory-source'} onClick={() => onChange({ ...item, fromInventory: !item.fromInventory })}>
        {item.fromInventory ? '✓ Lấy từ hàng tồn' : 'Lấy từ hàng tồn'}
      </button>

      {item.fromInventory && <label className="field"><span className="field-label">Giá bán từ kho (VNĐ / đơn vị)</span><input type="number" min={0} step={1000} inputMode="numeric" value={item.saleUnitPrice ?? calculated.unitPrice} onChange={event => onChange({ ...item, saleUnitPrice: Math.max(0, parseNumber(event.target.value)) })} /><span className="field-help">Giá gốc TQ ở trên được giữ để tính lãi/lỗ; bạn có thể nhập giá bán thấp hơn giá gốc.</span></label>}

      <div className="item-calc">
        <div>
          <span>Gốc TQ</span>
          <strong>{calculated.chinaAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tệ</strong>
        </div>
        <div>
          <span>Gốc TQ quy đổi</span>
          <strong>{formatVnd(calculated.chinaCostVnd)}</strong>
        </div>
        <div>
          <span>Đơn giá</span>
          <strong>{formatVnd(calculated.unitPrice)}</strong>
        </div>
        <div>
          <span>Thành tiền</span>
          <strong>{formatVnd(calculated.subtotal)}</strong>
        </div>
      </div>
    </article>
  )
}
