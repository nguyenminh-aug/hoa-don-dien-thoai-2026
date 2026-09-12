import type { AppSettings, InvoiceItemDraft } from '../types/invoice'
import { InvoiceItemEditor } from './InvoiceItemEditor'
import { groupInvoicePackages, createPackageItem } from '../utils/invoicePackages'
import { generateId } from '../utils/id'
import { calculateInvoiceTotal } from '../utils/invoiceCalculation'
import { formatVnd } from '../utils/money'

interface Props { items: InvoiceItemDraft[]; settings: AppSettings; onChange: (items: InvoiceItemDraft[]) => void; onItemChange: (item: InvoiceItemDraft) => void }
export function InvoicePackagesEditor({ items, settings, onChange, onItemChange }: Props) {
  const packages = groupInvoicePackages(items)
  const blank = (number: number) => createPackageItem(generateId('item'), number)
  return <>
    <p className="invoice-table-hint">Phụ phí, giá bán và thành tiền tính bằng VNĐ.</p>
    {packages.map(pack => <section className="invoice-package" key={pack.number} aria-label={`Kiện ${pack.number}`}>
      <div className="form-card-heading"><h2>Kiện {pack.number}</h2>{packages.length > 1 && <button type="button" className="inline-action" onClick={() => { if (!pack.items.some(item => item.productName.trim()) || window.confirm(`Xóa Kiện ${pack.number} và các dòng hàng trong kiện khỏi bản đang nhập?`)) onChange(items.filter(item => !pack.items.includes(item))) }}>Xóa kiện</button>}</div>
      <div className="invoice-table-scroll"><table className="invoice-table invoice-entry-table">
        <thead><tr>{['STT', 'Mã hàng', 'Loại', 'SL', 'ĐV', 'Giá gốc', 'Phụ phí', 'Giá bán', 'Thành tiền'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
        <tbody>{pack.items.map((item, index) => <InvoiceItemEditor key={item.id} item={item} settings={settings} index={index} isRemovable={true} onChange={onItemChange} onRemove={() => onChange(pack.items.length === 1 ? items.map(row => row.id === item.id ? blank(pack.number) : row) : items.filter(row => row.id !== item.id))} />)}</tbody>
      </table></div>
      <button type="button" className="add-item-btn" onClick={() => onChange([...items, blank(pack.number)])}>+ Thêm mặt hàng vào kiện {pack.number}</button>
      <div className="invoice-package-total"><span>Tổng kiện {pack.number}: {pack.items.filter(item => item.productName.trim()).reduce((sum, item) => sum + item.quantity, 0)} đôi</span><strong>{formatVnd(calculateInvoiceTotal(pack.items.filter(item => item.productName.trim()), settings))}</strong></div>
    </section>)}
    <button type="button" className="secondary-button" onClick={() => { const number = Math.max(0, ...packages.map(pack => pack.number)) + 1; onChange([...items, ...Array.from({ length: 5 }, () => blank(number))]) }}>+ Thêm kiện</button>
    <div className="invoice-package-total"><span>Tổng số lượng các kiện</span><strong>{items.filter(item => item.productName.trim()).reduce((sum, item) => sum + item.quantity, 0)} đôi</strong></div>
  </>
}
