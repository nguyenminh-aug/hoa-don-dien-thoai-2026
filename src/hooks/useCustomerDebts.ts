import { useCallback } from 'react'
import type { CustomerDebt } from '../types/invoice'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'hoa-don-customer-debts'

export function useCustomerDebts() {
  const [debts, setDebts] = useLocalStorage<CustomerDebt[]>(STORAGE_KEY, [])

  const addDebt = useCallback((input: Omit<CustomerDebt, 'debtId' | 'remaining' | 'createdAt' | 'updatedAt'>) => {
    const amount = Math.max(0, Math.round(input.amount))
    if (!amount) throw new Error('Số tiền nợ phải lớn hơn 0')
    const now = new Date().toISOString()
    const debt: CustomerDebt = { ...input, amount, remaining: amount, debtId: generateId('debt'), createdAt: now, updatedAt: now }
    setDebts(prev => [debt, ...prev])
    return debt
  }, [setDebts])

  const payDebt = useCallback((debtId: string, amount: number) => {
    const paid = Math.max(0, Math.round(amount))
    if (!paid) return
    setDebts(prev => prev.map(debt => debt.debtId === debtId
      ? { ...debt, remaining: Math.max(0, debt.remaining - paid), updatedAt: new Date().toISOString() }
      : debt))
  }, [setDebts])

  return { debts, addDebt, payDebt }
}
