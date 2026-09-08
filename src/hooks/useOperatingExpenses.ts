import { useCallback } from 'react'
import type { OperatingCosts, OperatingExpense } from '../types/invoice'
import { generateId } from '../utils/id'
import { calculateOperatingCostTotal } from '../utils/invoiceCalculation'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'hoa-don-operating-expenses'

export function useOperatingExpenses() {
  const [expenses, setExpenses] = useLocalStorage<OperatingExpense[]>(STORAGE_KEY, [])
  const addExpense = useCallback((expenseDate: string, costs: OperatingCosts, note: string) => {
    const expense: OperatingExpense = { expenseId: generateId('expense'), expenseDate, costs, total: calculateOperatingCostTotal(costs), note: note.trim(), createdAt: new Date().toISOString() }
    setExpenses(previous => [expense, ...previous]); return expense
  }, [setExpenses])
  const deleteExpense = useCallback((expenseId: string) => setExpenses(previous => previous.filter(expense => expense.expenseId !== expenseId)), [setExpenses])
  return { expenses, addExpense, deleteExpense }
}
