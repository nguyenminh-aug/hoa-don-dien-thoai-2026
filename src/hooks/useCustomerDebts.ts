import { useCallback } from 'react'
import type { CustomerDebt, CustomerDebtTransaction } from '../types/invoice'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'hoa-don-customer-debts'
const TRANSACTION_STORAGE_KEY = 'hoa-don-customer-debt-transactions'

export function useCustomerDebts() {
  const [debts, setDebts] = useLocalStorage<CustomerDebt[]>(STORAGE_KEY, [])
  const [transactions, setTransactions] = useLocalStorage<CustomerDebtTransaction[]>(TRANSACTION_STORAGE_KEY, [])

  const addDebt = useCallback((input: Omit<CustomerDebt, 'debtId' | 'remaining' | 'createdAt' | 'updatedAt'>) => {
    const amount = Math.max(0, Math.round(input.amount))
    if (!amount) throw new Error('Số tiền nợ phải lớn hơn 0')
    const now = new Date().toISOString()
    const debt: CustomerDebt = { ...input, amount, remaining: amount, debtId: generateId('debt'), createdAt: now, updatedAt: now }
    setDebts(prev => [debt, ...prev])
    setTransactions(prev => [{ transactionId: generateId('debt-tx'), customerId: debt.customerId, debtId: debt.debtId, amount, direction: 'debt', transactionDate: debt.debtDate, note: debt.note, createdAt: now }, ...prev])
    return debt
  }, [setDebts, setTransactions])

  const payDebt = useCallback((debtId: string, amount: number, details: { paymentDate: string; paymentMethod: 'transfer' | 'cash'; note: string }) => {
    const paid = Math.max(0, Math.round(amount))
    const debt = debts.find(item => item.debtId === debtId)
    if (!paid || !debt) return
    const applied = Math.min(paid, debt.remaining)
    if (!applied) return
    const now = new Date().toISOString()
    setDebts(prev => prev.map(item => item.debtId === debtId ? { ...item, remaining: Math.max(0, item.remaining - applied), updatedAt: now } : item))
    setTransactions(prev => [{ transactionId: generateId('debt-tx'), customerId: debt.customerId, debtId, amount: applied, direction: 'payment', transactionDate: details.paymentDate, paymentMethod: details.paymentMethod, note: details.note, createdAt: now }, ...prev])
  }, [debts, setDebts, setTransactions])

  return { debts, transactions, addDebt, payDebt }
}
