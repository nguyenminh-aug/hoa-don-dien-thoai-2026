import type { AppSettings, CalculatedInvoiceItem, InvoiceItemDraft, InvoiceLineItem, OperatingCosts } from '../types/invoice'

export function calculateUnitPrice(item: InvoiceItemDraft, settings: AppSettings): number {
  if (item.priceMode === 'vnd') {
    // The VND input is still the purchase cost; it skips currency conversion,
    // not the configured selling surcharge for the item type.
    return Math.max(0, roundToNearestThousand(item.originalPrice + settings.surcharges[item.itemType]))
  }
  const convertedPrice = item.originalPrice * settings.exchangeRate + settings.surcharges[item.itemType]
  return Math.max(0, roundToNearestThousand(convertedPrice))
}

/** Rounds positive values: decimal part >= 0.5 goes up, otherwise down. */
export function roundHalfUp(value: number): number {
  const safeValue = Number.isFinite(value) ? value : 0
  return Math.floor(safeValue + 0.5)
}

/** Rounds converted NDT prices to the nearest 1,000 VND: 99,800 → 100,000. */
export function roundToNearestThousand(value: number): number {
  return roundHalfUp(value / 1000) * 1000
}

export function calculateItem(item: InvoiceItemDraft, settings: AppSettings): CalculatedInvoiceItem {
  const calculatedUnitPrice = calculateUnitPrice(item, settings)
  const baseUnitPrice = item.fromInventory && item.saleUnitPrice !== undefined
    ? Math.max(0, roundHalfUp(item.saleUnitPrice))
    : calculatedUnitPrice
  const extraFeeVnd = Math.max(0, roundHalfUp(item.extraFeeVnd ?? 0))
  const unitPrice = baseUnitPrice + extraFeeVnd
  const quantity = Math.max(0, Math.floor(item.quantity))
  // `originalPrice` is the cost price.  In VND mode it is already VND, so
  // never round-trip it through the exchange rate (which used to create a
  // fractional NDT cost and could make the profit display misleading).
  const chinaAmount = item.priceMode === 'ndt' ? Math.max(0, item.originalPrice) : 0
  const chinaCostVnd = item.priceMode === 'ndt'
    ? chinaAmount * settings.exchangeRate
    : Math.max(0, roundHalfUp(item.originalPrice))
  return {
    ...item,
    exchangeRate: settings.exchangeRate,
    surcharge: settings.surcharges[item.itemType],
    extraFeeVnd,
    chinaAmount,
    chinaCostVnd,
    // Tiền cửu vẫn áp dụng cho cả hàng mới lẫn hàng xuất từ kho.
    itemOperatingCost: settings.itemOperatingCosts[item.itemType],
    unitPrice,
    subtotal: unitPrice * quantity,
  }
}

export function calculateInvoiceTotal(items: InvoiceItemDraft[], settings: AppSettings): number {
  return items.reduce((sum, item) => sum + calculateItem(item, settings).subtotal, 0)
}

export function calculateInvoiceTotalFromItems(items: CalculatedInvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0)
}

export function calculateRemainingAmount(subtotal: number, deposit: number, paid: number): number {
  return Math.max(0, Math.round(subtotal) - Math.round(deposit) - Math.round(paid))
}

export function calculateTotalPaid(deposit: number, paid: number): number {
  return Math.max(0, Math.round(deposit)) + Math.max(0, Math.round(paid))
}

export const emptyOperatingCosts = (): OperatingCosts => ({ packing: 0, tape: 0, loading: 0, shipping: 0, cancelledGoods: 0 })

export function calculateOperatingCostTotal(costs: OperatingCosts): number {
  return Object.values(costs).reduce((sum, value) => sum + Math.max(0, Math.round(value || 0)), 0)
}

/** Uses exchange rate snapshotted on each item when its invoice was saved. */
export function calculateChinaCostTotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, item) => {
    const unitCost = item.chinaCostVnd ?? (item.priceMode === 'ndt' ? item.originalPrice * item.exchangeRate : item.originalPrice)
    return sum + unitCost * item.quantity
  }, 0)
}

export function calculateItemOperatingCostTotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.itemOperatingCost || 0) * item.quantity, 0)
}
