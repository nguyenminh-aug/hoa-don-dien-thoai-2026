import type { InvoiceItemDraft } from '../types/invoice'

export function groupInvoicePackages<T extends { packageNumber?: number; quantity: number }>(items: T[]) {
  const groups = new Map<number, T[]>()
  for (const item of items) {
    const number = Number.isInteger(item.packageNumber) && item.packageNumber! > 0 ? item.packageNumber! : 1
    groups.set(number, [...(groups.get(number) ?? []), item])
  }
  return [...groups].sort(([a], [b]) => a - b).map(([number, rows]) => ({ number, items: rows, quantity: rows.reduce((sum, item) => sum + item.quantity, 0) }))
}

export function createPackageItem(id: string, packageNumber = 1): InvoiceItemDraft {
  return { id, packageNumber, productName: '', quantity: 0, itemType: 'te', priceMode: 'ndt', originalPrice: 0, extraFeeVnd: 0 }
}
