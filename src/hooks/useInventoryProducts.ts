import { useCallback, useEffect } from 'react'
import { useInvoices } from './useInvoices'
import { initializeManualInventory, MANUAL_INVENTORY_MARKER } from '../utils/manualInventory'
import type { InventoryProduct } from '../types/invoice'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'hoa-don-inventory-products'
const productKey = (name: string) => name.trim().toLowerCase()

export function useInventoryProducts() {
  const [storedProducts, setProducts] = useLocalStorage<InventoryProduct[]>(STORAGE_KEY, [])

  const { invoices } = useInvoices()
  useEffect(() => {
    if (!storedProducts.some(product => product.productKey === MANUAL_INVENTORY_MARKER)) setProducts(previous => initializeManualInventory(previous, invoices, new Date().toISOString()))
  }, [storedProducts, invoices, setProducts])
  const products = storedProducts.filter(product => product.productKey !== MANUAL_INVENTORY_MARKER)

  const saveProduct = useCallback((input: { productName: string; inventoryCode: string; unitPrice: number; quantityToAdd: number }) => {
    const key = productKey(input.productName)
    if (!key) throw new Error('Tên hàng tồn không được để trống')
    const now = new Date().toISOString(); const quantityToAdd = Math.round(input.quantityToAdd)
    setProducts(prev => {
      const existing = prev.find(product => product.productKey === key)
      if (existing) return prev.map(product => product.productKey === key ? { ...product, productName: input.productName.trim(), inventoryCode: input.inventoryCode.trim() || product.inventoryCode, unitPrice: Math.max(0, Math.round(input.unitPrice)) || product.unitPrice, quantityAdjustment: product.quantityAdjustment + quantityToAdd, updatedAt: now } : product)
      const generatedCode = `TON-${Date.now().toString().slice(-6)}`
      return [...prev, { productKey: key, productName: input.productName.trim(), inventoryCode: input.inventoryCode.trim() || generatedCode, unitPrice: Math.max(0, Math.round(input.unitPrice)), quantityAdjustment: quantityToAdd, createdAt: now, updatedAt: now }]
    })
  }, [setProducts])

  const adjustQuantity = useCallback((key: string, delta: number, fallback: Omit<InventoryProduct, 'productKey' | 'quantityAdjustment' | 'createdAt' | 'updatedAt'>) => {
    const change = Math.round(delta); if (!change) return
    const now = new Date().toISOString()
    setProducts(prev => {
      const existing = prev.find(product => product.productKey === key)
      if (existing) return prev.map(product => product.productKey === key ? { ...product, quantityAdjustment: Math.max(0, product.quantityAdjustment + change), updatedAt: now } : product)
      return [...prev, { productKey: key, inventoryCode: fallback.inventoryCode, productName: fallback.productName, unitPrice: fallback.unitPrice, quantityAdjustment: change, createdAt: now, updatedAt: now }]
    })
  }, [setProducts])

  return { products, saveProduct, adjustQuantity }
}
