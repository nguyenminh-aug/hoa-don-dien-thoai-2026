import { useCallback } from 'react'
import type { ChinaSupplier, SupplierPayment } from '../types/invoice'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'

const PAYMENT_KEY = 'hoa-don-supplier-payments'
const SUPPLIER_KEY = 'hoa-don-china-suppliers'

export function useSupplierPayments() {
  const [payments, setPayments] = useLocalStorage<SupplierPayment[]>(PAYMENT_KEY, [])
  const [suppliers, setSuppliers] = useLocalStorage<ChinaSupplier[]>(SUPPLIER_KEY, [])

  const addSupplier = useCallback((input: { name: string; exchangeRate: number; openingDebtNdt: number }) => {
    const now = new Date().toISOString()
    const supplier: ChinaSupplier = { supplierId: generateId('ncc'), name: input.name.trim(), exchangeRate: Math.max(1, Math.round(input.exchangeRate)), openingDebtNdt: Math.max(0, input.openingDebtNdt), createdAt: now, updatedAt: now }
    setSuppliers(prev => [supplier, ...prev])
    return supplier
  }, [setSuppliers])

  const addPayment = useCallback((input: Omit<SupplierPayment, 'paymentId' | 'createdAt'>) => {
    const amount = Math.max(0, Math.round(input.amount))
    if (!amount) throw new Error('Số tiền trả NCC phải lớn hơn 0')
    const payment: SupplierPayment = { ...input, amount, paymentId: generateId('ncc-pay'), createdAt: new Date().toISOString() }
    setPayments(prev => [payment, ...prev])
    return payment
  }, [setPayments])

  const deleteSupplier = useCallback((supplierId: string) => {
    setSuppliers(prev => prev.filter(supplier => supplier.supplierId !== supplierId))
    setPayments(prev => prev.filter(payment => payment.supplierId !== supplierId))
  }, [setSuppliers, setPayments])

  return { suppliers, payments, addSupplier, addPayment, deleteSupplier }
}
