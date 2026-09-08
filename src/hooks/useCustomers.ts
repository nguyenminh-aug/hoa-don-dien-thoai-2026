import { useCallback } from 'react'
import type { Customer } from '../types/invoice'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'hoa-don-customers'

export function useCustomers() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>(STORAGE_KEY, [])

  const addCustomer = useCallback(
    (name: string, address: string): Customer => {
      const now = new Date().toISOString()
      const customer: Customer = {
        customerId: generateId('kh'),
        name: name.trim(),
        address: address.trim(),
        createdAt: now,
        updatedAt: now,
      }
      setCustomers((prev) => [customer, ...prev])
      return customer
    },
    [setCustomers],
  )

  const findByName = useCallback(
    (query: string): Customer[] => {
      const normalized = query.trim().toLowerCase()
      if (!normalized) return []
      return customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(normalized) ||
          customer.address.toLowerCase().includes(normalized),
      )
    },
    [customers],
  )

  const updateCustomer = useCallback(
    (customer: Customer) => {
      setCustomers((prev) =>
        prev.map((item) =>
          item.customerId === customer.customerId
            ? { ...item, ...customer, updatedAt: new Date().toISOString() }
            : item,
        ),
      )
    },
    [setCustomers],
  )

  const deleteCustomer = useCallback(
    (customerId: string) => {
      setCustomers((prev) => prev.filter((customer) => customer.customerId !== customerId))
    },
    [setCustomers],
  )

  return { customers, addCustomer, findByName, updateCustomer, deleteCustomer }
}
