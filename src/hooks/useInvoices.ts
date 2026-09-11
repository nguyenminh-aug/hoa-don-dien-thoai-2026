import { useCallback } from 'react'
import type { AppSettings, Invoice, InvoiceItemDraft, Payment } from '../types/invoice'
import { calculateChinaCostTotal, calculateItem, calculateInvoiceTotalFromItems, calculateItemOperatingCostTotal, calculateOperatingCostTotal, emptyOperatingCosts } from '../utils/invoiceCalculation'
import { generateId } from '../utils/id'
import { useLocalStorage } from './useLocalStorage'
import { setInvoiceDeleted, visibleInvoiceData } from '../utils/invoiceTrash'

const STORAGE_KEY = 'hoa-don-invoices'
const PAYMENT_STORAGE_KEY = 'hoa-don-payments'

export interface CreateInvoiceInput {
  invoiceId: string
  customerId: string | null
  customerName: string
  customerPhone?: string
  customerAddress: string
  paymentMethod: Invoice['paymentMethod']
  invoiceDate: string
  items: InvoiceItemDraft[]
  deposit: number
  paid: number
  operatingCosts?: import('../types/invoice').OperatingCosts
}

export function useInvoices() {
  const [allInvoices, setInvoices] = useLocalStorage<Invoice[]>(STORAGE_KEY, [])
  const [allPayments, setPayments] = useLocalStorage<Payment[]>(PAYMENT_STORAGE_KEY, [])
  const { invoices, payments, deletedInvoices } = visibleInvoiceData(allInvoices, allPayments)

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
        customerPhone: input.customerPhone?.trim() ?? '',
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
        if (paid > 0) transactions.push({ paymentId: generateId('pay'), customerId: input.customerId, invoiceId: invoice.invoiceId, amount: paid, paymentDate: input.invoiceDate, paymentMethod: input.paymentMethod, note: 'Thanh toán COD khi tạo hóa đơn', createdAt, kind: 'payment', isAutoCod: true })
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
      setInvoices((prev) => setInvoiceDeleted(prev, invoiceId, true))
    },
    [setInvoices, setPayments],
  )

  /** Changes the settlement method and rebuilds only the system-created COD payment. */
  const restoreInvoice = (invoiceId: string) => setInvoices(prev => setInvoiceDeleted(prev, invoiceId, false))

  const changePaymentMethod = useCallback((invoiceId: string, paymentMethod: Invoice['paymentMethod']) => {
    const current = invoices.find(invoice => invoice.invoiceId === invoiceId)
    if (!current) return
    const isAutoCod = (payment: Payment) => Boolean(payment.isAutoCod) || (payment.kind === 'payment' && payment.paymentMethod === 'cod' && payment.note === 'Thanh toán COD khi tạo hóa đơn')
    const invoicePayments = payments.filter(payment => payment.invoiceId === invoiceId)
    const kept = invoicePayments.filter(payment => !isAutoCod(payment))
    const deposit = kept.filter(payment => payment.kind === 'deposit').reduce((sum, payment) => sum + payment.amount, 0)
    const manualPaid = kept.filter(payment => payment.kind === 'payment').reduce((sum, payment) => sum + payment.amount, 0)
    const autoAmount = paymentMethod === 'cod' ? Math.max(0, current.subtotal - deposit - manualPaid) : 0
    const now = new Date().toISOString()
    setPayments([
      ...allPayments.map(payment => payment.invoiceId !== invoiceId || payment.deletedAt ? payment : isAutoCod(payment) ? { ...payment, deletedAt: now } : payment.kind === 'deposit' ? { ...payment, paymentMethod } : payment),
      ...(autoAmount > 0 && current.customerId ? [{ paymentId: generateId('pay'), customerId: current.customerId, invoiceId, amount: autoAmount, paymentDate: current.invoiceDate, paymentMethod: 'cod' as const, note: 'Thanh toán COD khi đổi hình thức', createdAt: now, kind: 'payment' as const, isAutoCod: true }] : []),
    ])
    const paid = manualPaid + autoAmount
    setInvoices(prev => prev.map(invoice => invoice.invoiceId === invoiceId ? { ...invoice, paymentMethod, deposit, paid, remaining: Math.max(0, invoice.subtotal - deposit - paid) } : invoice))
  }, [invoices, payments, allPayments, setInvoices, setPayments])

  const reviseInvoice = useCallback((invoiceId: string, items: InvoiceItemDraft[], settings: AppSettings) => {
    setInvoices(prev => prev.map(invoice => {
      if (invoice.invoiceId !== invoiceId) return invoice
      const calculatedItems = items.map(item => ({ ...calculateItem(item, settings), itemId: item.id }))
      const subtotal = calculateInvoiceTotalFromItems(calculatedItems)
      const paid = invoice.paymentMethod === 'cod' ? Math.max(0, subtotal - invoice.deposit) : Math.min(invoice.paid, Math.max(0, subtotal - invoice.deposit))
      const remaining = Math.max(0, subtotal - invoice.deposit - paid)
      const chinaCostTotal = calculateChinaCostTotal(calculatedItems)
      const itemOperatingCostTotal = calculateItemOperatingCostTotal(calculatedItems)
      return { ...invoice, items: calculatedItems, subtotal, paid, remaining, chinaCostTotal, itemOperatingCostTotal, profit: subtotal - chinaCostTotal - (invoice.operatingCostTotal || 0) - itemOperatingCostTotal }
    }))
    setPayments(prev => prev.map(payment => payment.invoiceId === invoiceId && payment.paymentMethod === 'cod' && payment.kind === 'payment'
      ? { ...payment, amount: Math.max(0, items.reduce((sum, item) => sum + calculateItem(item, settings).subtotal, 0) - (invoices.find(invoice => invoice.invoiceId === invoiceId)?.deposit ?? 0)) }
      : payment))
  }, [invoices, setInvoices, setPayments])

  const markInvoiceBombed = useCallback((invoiceId: string) => {
    setInvoices((prev) => prev.map((invoice) => invoice.invoiceId === invoiceId
      ? { ...invoice, status: 'bombed', bombedAt: new Date().toISOString(), remaining: 0 }
      : invoice))
  }, [setInvoices])

  return { invoices, payments, deletedInvoices, restoreInvoice, createInvoice, addPayment, updateInvoice, changePaymentMethod, reviseInvoice, deleteInvoice, markInvoiceBombed }
}
