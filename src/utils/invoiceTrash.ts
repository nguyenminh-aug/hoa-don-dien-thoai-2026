import type { Invoice, Payment } from '../types/invoice'

export function setInvoiceDeleted(records: Invoice[], invoiceId: string, deleted: boolean, now = new Date().toISOString()) {
  return records.map(invoice => {
    if (invoice.invoiceId !== invoiceId) return invoice
    if (deleted) return invoice.deletedAt ? invoice : { ...invoice, deletedAt: now }
    const { deletedAt: _removed, ...restored } = invoice
    return restored
  })
}

export function visibleInvoiceData(records: Invoice[], payments: Payment[]) {
  const deletedIds = new Set(records.filter(invoice => invoice.deletedAt).map(invoice => invoice.invoiceId))
  return {
    invoices: records.filter(invoice => !invoice.deletedAt),
    deletedInvoices: records.filter(invoice => invoice.deletedAt),
    payments: payments.filter(payment => !payment.deletedAt && !deletedIds.has(payment.invoiceId)),
  }
}
