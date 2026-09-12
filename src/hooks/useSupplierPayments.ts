import { useCallback } from 'react'
import type { ChinaSupplier, SupplierDebtEntry, SupplierPayment } from '../types/invoice'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'

const PAYMENT_KEY = 'hoa-don-supplier-payments'
const SUPPLIER_KEY = 'hoa-don-china-suppliers'
const DEBT_ENTRY_KEY = 'hoa-don-supplier-debt-entries'

export function useSupplierPayments() {
  const [ledger, setPayments] = useLocalStorage<SupplierPayment[]>(PAYMENT_KEY, [])
  const [suppliers, setSuppliers] = useLocalStorage<ChinaSupplier[]>(SUPPLIER_KEY, [])
  const [debtEntries, setDebtEntries] = useLocalStorage<SupplierDebtEntry[]>(DEBT_ENTRY_KEY, [])

  const payments = ledger.filter(entry => entry.kind !== 'investment')
  const investment = ledger.find(entry => entry.paymentId === 'ncc-investment-capital')?.investmentAmount ?? 0
  const setInvestment = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Tiền đầu tư phải là số không âm')
    setPayments(previous => {
      const existing = previous.find(entry => entry.paymentId === 'ncc-investment-capital')
      // amount stays zero so older clients do not mistake capital for a payout.
      const entry: SupplierPayment = { paymentId: 'ncc-investment-capital', kind: 'investment', amount: 0, investmentAmount: Math.round(amount), paymentDate: new Date().toISOString().slice(0, 10), createdAt: existing?.createdAt ?? new Date().toISOString(), note: 'Tiền gốc TQ đang đem đầu tư' }
      return existing ? previous.map(row => row.paymentId === entry.paymentId ? entry : row) : [...previous, entry]
    })
  }, [setPayments])

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
    setDebtEntries(prev => prev.filter(entry => entry.supplierId !== supplierId))
  }, [setSuppliers, setPayments, setDebtEntries])

  const addDebtEntry = useCallback((input: Omit<SupplierDebtEntry, 'debtEntryId' | 'createdAt'>) => {
    const amountNdt = Math.max(0, input.amountNdt)
    if (!amountNdt) throw new Error('Số tiền nợ mới phải lớn hơn 0')
    const entry: SupplierDebtEntry = { ...input, amountNdt, exchangeRate: Math.max(1, Math.round(input.exchangeRate)), debtEntryId: generateId('ncc-debt'), createdAt: new Date().toISOString() }
    setDebtEntries(prev => [entry, ...prev])
    return entry
  }, [setDebtEntries])

  return { suppliers, payments, investment, setInvestment, debtEntries, addSupplier, addPayment, addDebtEntry, deleteSupplier }
}
