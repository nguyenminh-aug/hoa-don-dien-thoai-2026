import { useMemo, useState } from 'react'
import { DeleteInvoiceConfirmModal } from '../components/DeleteInvoiceConfirmModal'
import { PageHeader } from '../components/PageHeader'
import { useInventoryProducts } from '../hooks/useInventoryProducts'
import { useInvoices } from '../hooks/useInvoices'
import { formatVnd, parseNumber } from '../utils/money'

const keyFor = (name: string) => name.trim().toLowerCase() || 'không tên'

export function InventoryPage() {
  const { invoices, deleteInvoice } = useInvoices()
  const { products, saveProduct, adjustQuantity } = useInventoryProducts()
  const [showBombedInvoices, setShowBombedInvoices] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [unitPrice, setUnitPrice] = useState(''); const [quantity, setQuantity] = useState(''); const [error, setError] = useState('')
  const bombed = invoices.filter(invoice => invoice.status === 'bombed').sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.createdAt.localeCompare(a.createdAt))

  const inventory = useMemo(() => {
    const byProduct = new Map<string, { productKey: string; productName: string; quantity: number; value: number; unitPrice: number }>()
    bombed.forEach(invoice => invoice.items.forEach(item => {
      const productKey = keyFor(item.productName); const current = byProduct.get(productKey) ?? { productKey, productName: item.productName || 'Không tên', quantity: 0, value: 0, unitPrice: item.unitPrice }
      current.quantity += item.quantity; current.value += item.subtotal; current.unitPrice = item.unitPrice; byProduct.set(productKey, current)
    }))
    invoices.filter(invoice => invoice.status !== 'bombed').forEach(invoice => invoice.items.filter(item => item.fromInventory).forEach(item => {
      const productKey = keyFor(item.productName); const current = byProduct.get(productKey) ?? { productKey, productName: item.productName || 'Không tên', quantity: 0, value: 0, unitPrice: item.unitPrice }
      current.quantity -= item.quantity; byProduct.set(productKey, current)
    }))
    products.forEach(product => {
      const current = byProduct.get(product.productKey) ?? { productKey: product.productKey, productName: product.productName, quantity: 0, value: 0, unitPrice: product.unitPrice }
      current.productName = product.productName; current.unitPrice = product.unitPrice || current.unitPrice; current.quantity += product.quantityAdjustment; current.value += Math.max(0, product.quantityAdjustment) * current.unitPrice; byProduct.set(product.productKey, current)
    })
    return [...byProduct.values()].filter(item => item.quantity > 0).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [bombed, invoices, products])

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const invoiceToDelete = invoices.find(invoice => invoice.invoiceId === deleteInvoiceId)
  const openProductForm = (item?: typeof inventory[number]) => {
    const existing = item && products.find(product => product.productKey === item.productKey)
    setEditingKey(item?.productKey ?? null); setCode(existing?.inventoryCode ?? ''); setName(item?.productName ?? ''); setUnitPrice(String(existing?.unitPrice || item?.unitPrice || '')); setQuantity(''); setError(''); setShowProductForm(true)
  }
  const saveInventoryProduct = () => {
    const amount = parseNumber(quantity || '0'); const price = parseNumber(unitPrice || '0')
    if (!name.trim()) return setError('Nhập tên mặt hàng.')
    if (amount < 0) return setError('Số lượng nhập thêm không được âm.')
    saveProduct({ productName: name, inventoryCode: code, unitPrice: price, quantityToAdd: amount })
    setShowProductForm(false); setEditingKey(null); setCode(''); setName(''); setUnitPrice(''); setQuantity('')
  }
  const changeQuantity = (item: typeof inventory[number], delta: number) => {
    if (delta < 0 && item.quantity <= 0) return
    const existing = products.find(product => product.productKey === item.productKey)
    adjustQuantity(item.productKey, delta, { inventoryCode: existing?.inventoryCode || `TON-${item.productKey.slice(0, 6).toUpperCase()}`, productName: item.productName, unitPrice: existing?.unitPrice || item.unitPrice })
  }
  const removeInvoice = () => { if (!deleteInvoiceId) return; deleteInvoice(deleteInvoiceId); setDeleteInvoiceId(null) }

  return <><PageHeader title="Hàng tồn" subtitle="Quản lý mã hàng và số lượng tồn thực tế" />
    <div className="metric-grid"><article className="metric-card"><span>Tổng số đôi tồn</span><strong>{totalQuantity} đôi</strong></article><article className="metric-card"><span>Mã hàng tồn</span><strong>{inventory.length}</strong></article></div>
    <button className="primary-button" onClick={() => showProductForm && !editingKey ? setShowProductForm(false) : openProductForm()}>{showProductForm && !editingKey ? 'Đóng tạo mã hàng' : 'Tạo mã hàng tồn'}</button>
    {showProductForm && <section className="form-card payment-form"><div className="form-card-heading"><h2>{editingKey ? 'Cập nhật mã hàng tồn' : 'Tạo mã hàng tồn'}</h2></div><label className="field"><span className="field-label">Mã hàng tồn</span><input value={code} onChange={event => setCode(event.target.value)} placeholder="Để trống để tự sinh mã TON-..." /></label><label className="field"><span className="field-label">Tên sản phẩm</span><input value={name} onChange={event => setName(event.target.value)} placeholder="Ví dụ: Mã TE-01" readOnly={Boolean(editingKey)} /></label><label className="field"><span className="field-label">Đơn giá</span><input type="number" min={0} inputMode="numeric" value={unitPrice} onChange={event => setUnitPrice(event.target.value)} placeholder="0" /></label><label className="field"><span className="field-label">Số lượng nhập thêm</span><input type="number" min={0} inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="0" /></label>{error && <div className="error-banner">{error}</div>}<button className="primary-button" onClick={saveInventoryProduct}>{editingKey ? 'Lưu mã hàng' : 'Tạo hàng tồn'}</button></section>}
    <section className="form-card"><div className="form-card-heading"><h2>Thống kê theo mã hàng</h2></div>{inventory.length ? <div className="inventory-table"><div className="inventory-table-head inventory-table-head-managed"><span>Mã / tên hàng</span><span>Tồn kho</span></div>{inventory.map(item => { const product = products.find(entry => entry.productKey === item.productKey); return <div className="inventory-table-row inventory-table-row-managed" key={item.productKey}><div><strong>{product?.inventoryCode || 'Chưa có mã'} · {item.productName}</strong><span>Đơn giá: {formatVnd(product?.unitPrice || item.unitPrice)}</span><button className="inventory-code-button" onClick={() => openProductForm(item)}>{product?.inventoryCode ? 'Sửa mã hàng' : 'Tạo mã hàng'}</button></div><div className="inventory-quantity-control"><button onClick={() => changeQuantity(item, -1)} aria-label={`Giảm tồn ${item.productName}`}>−</button><strong>{item.quantity}</strong><button onClick={() => changeQuantity(item, 1)} aria-label={`Tăng tồn ${item.productName}`}>+</button></div></div> })}</div> : <div className="empty-state"><strong>Chưa có hàng tồn</strong><p>Tạo mã hàng tồn để nhập kho, hoặc đánh dấu hóa đơn là khách bom hàng.</p></div>}</section>
    {bombed.length > 0 && <><button className="visibility-button inventory-toggle" onClick={() => setShowBombedInvoices(!showBombedInvoices)}>{showBombedInvoices ? 'Ẩn danh sách hóa đơn bom' : `Hiện ${bombed.length} hóa đơn bom`}</button>{showBombedInvoices && <section className="form-card"><div className="form-card-heading"><h2>Danh sách hóa đơn bom</h2></div>{bombed.map(invoice => <div className="inventory-invoice" key={invoice.invoiceId}><div className="inventory-invoice-heading"><div><strong>{invoice.invoiceId}</strong><span>{invoice.customerName} · {invoice.invoiceDate}</span></div><button className="list-delete-button" onClick={() => setDeleteInvoiceId(invoice.invoiceId)} aria-label={`Xóa ${invoice.invoiceId}`}>Xóa</button></div>{invoice.items.map(item => <div className="invoice-line" key={item.itemId}><span>{item.productName} × {item.quantity}</span><strong>{formatVnd(item.unitPrice)}</strong></div>)}</div>)}</section>}</>}
    {invoiceToDelete && <DeleteInvoiceConfirmModal invoiceId={invoiceToDelete.invoiceId} isBombed onCancel={() => setDeleteInvoiceId(null)} onConfirm={removeInvoice} />}
  </>
}
