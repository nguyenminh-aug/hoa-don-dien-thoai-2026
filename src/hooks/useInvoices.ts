import { useCallback } from 'react'
import type { AppSettings, Invoice, InvoiceItemDraft, Payment } from '../types/invoice'
import { calculateChinaCostTotal, calculateItem, calculateInvoiceTotalFromItems, calculateItemOperatingCostTotal, calculateOperatingCostTotal, emptyOperatingCosts } from '../utils/invoiceCalculation'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'hoa-don-invoices'
const PAYMENT_STORAGE_KEY = 'hoa-don-payments'

export interface CreateInvoiceInput {
  invoiceId: string
  customerId: string | null
  customerName: string
  customerAddress: string
  paymentMethod: Invoice['paymentMethod']
  invoiceDate: string
  items: InvoiceItemDraft[]
  deposit: number
  paid: number
  operatingCosts?: import('../types/invoice').OperatingCosts
}

export function useInvoices() {
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>(STORAGE_KEY, [])
  const [payments, setPayments] = useLocalStorage<Payment[]>(PAYMENT_STORAGE_KEY, [])

  const createInvoice = useCallback(
    (input: CreateInvoiceInput, settings: AppSettings): Invoice => {
      const items = input.items.map((item) => {
        const calculated = calculateItem(item, settings)
        return { ...calculated, itemId: generateId('item') }
      })
      const subtotal = calculateInvoiceTotalFromItems(items)
      const deposit = Math.max(0, Math.round(input.deposit))
      const paid = input.paymentMethod === 'cod'
        ? Math.max(0, subtotal - deposit)
        : Math.max(0, Math.round(input.paid))
      const totalPaid = deposit + paid
      const remaining = Math.max(0, subtotal - totalPaid)
      const operatingCosts = input.operatingCosts ?? emptyOperatingCosts()
      const operatingCostTotal = calculateOperatingCostTotal(operatingCosts)
      const chinaCostTotal = calculateChinaCostTotal(items)
      const itemOperatingCostTotal = calculateItemOperatingCostTotal(items)

      const invoice: Invoice = {
        invoiceId: input.invoiceId,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerAddress: input.customerAddress.trim(),
        paymentMethod: input.paymentMethod,
        invoiceDate: input.invoiceDate,
        items,
        subtotal,
        deposit,
        paid,
        remaining,
        operatingCosts,
        operatingCostTotal,
        itemOperatingCostTotal,
        chinaCostTotal,
        profit: subtotal - chinaCostTotal - operatingCostTotal - itemOperatingCostTotal,
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      setInvoices((prev) => [invoice, ...prev])
      if (input.customerId && (deposit > 0 || paid > 0)) {
        const createdAt = new Date().toISOString()
        const transactions: Payment[] = []
        if (deposit > 0) transactions.push({ paymentId: generateId('pay'), customerId: input.customerId, invoiceId: invoice.invoiceId, amount: deposit, paymentDate: input.invoiceDate, paymentMethod: input.paymentMethod, note: 'Tiền đặt cọc khi tạo hóa đơn', createdAt, kind: 'deposit' })
        if (paid > 0) transactions.push({ paymentId: generateId('pay'), customerId: input.customerId, invoiceId: invoice.invoiceId, amount: paid, paymentDate: input.invoiceDate, paymentMethod: input.paymentMethod, note: 'Thanh toán COD khi tạo hóa đơn', createdAt, kind: 'payment' })
        setPayments((prev) => [...transactions, ...prev])
      }
      return invoice
    },
    [setInvoices, setPayments],
  )

  const addPayment = useCallback((input: Omit<Payment, 'paymentId' | 'createdAt' | 'kind'>) => {
    const amount = Math.max(0, Math.round(input.amount))
    if (!amount) throw new Error('Số tiền thanh toán phải lớn hơn 0')
    const payment: Payment = { ...input, amount, paymentId: generateId('pay'), createdAt: new Date().toISOString(), kind: 'payment' }
    setPayments((prev) => [payment, ...prev])
    setInvoices((prev) => prev.map((invoice) => invoice.invoiceId === input.invoiceId
      ? { ...invoice, paid: invoice.paid + amount, remaining: Math.max(0, invoice.subtotal - invoice.deposit - invoice.paid - amount) }
      : invoice))
    return payment
  }, [setInvoices, setPayments])

  const updateInvoice = useCallback(
    (invoice: Invoice) => {
      setInvoices((prev) => prev.map((item) => (item.invoiceId === invoice.invoiceId ? invoice : item)))
    },
    [setInvoices],
  )

  const deleteInvoice = useCallback(
    (invoiceId: string) => {
      setInvoices((prev) => prev.filter((item) => item.invoiceId !== invoiceId))
      setPayments((prev) => prev.filter((payment) => payment.invoiceId !== invoiceId))
    },
    [setInvoices, setPayments],
  )

  const markInvoiceBombed = useCallback((invoiceId: string) => {
    setInvoices((prev) => prev.map((invoice) => invoice.invoiceId === invoiceId
      ? { ...invoice, status: 'bombed', bombedAt: new Date().toISOString(), remaining: 0 }
      : invoice))
  }, [setInvoices])

  return { invoices, payments, createInvoice, addPayment, updateInvoice, deleteInvoice, markInvoiceBombed }
}
