import type { InventoryProduct, Invoice } from '../types/invoice'
export const MANUAL_INVENTORY_MARKER = '__manual_inventory_v1__'
export function initializeManualInventory(products: InventoryProduct[], invoices: Invoice[], now: string): InventoryProduct[] {
  if (products.some(product => product.productKey === MANUAL_INVENTORY_MARKER)) return products
  const rows = new Map(products.map(product => [product.productKey, { ...product }]))
  for (const invoice of invoices.filter(invoice => !invoice.deletedAt)) {
    for (const item of invoice.items) {
      const delta = invoice.status === 'bombed' ? item.quantity : item.fromInventory ? -item.quantity : 0
      if (!delta) continue
      const key = item.productName.trim().toLowerCase() || 'không tên'
      const row = rows.get(key) ?? { productKey: key, productName: item.productName, inventoryCode: 'TON-' + key, unitPrice: item.unitPrice, quantityAdjustment: 0, createdAt: now, updatedAt: now }
      row.quantityAdjustment += delta
      rows.set(key, row)
    }
  }
  return [...rows.values()].map(row => ({ ...row, quantityAdjustment: Math.max(0, row.quantityAdjustment), updatedAt: now })).concat({ productKey: MANUAL_INVENTORY_MARKER, productName: 'Khởi tạo tồn kho thủ công', inventoryCode: '', unitPrice: 0, quantityAdjustment: 0, createdAt: now, updatedAt: now })
}
