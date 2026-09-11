import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
const source = stripTypeScriptTypes(readFileSync(new URL('../src/utils/invoiceTrash.ts', import.meta.url), 'utf8'))
const { setInvoiceDeleted, visibleInvoiceData } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const records = [{ invoiceId: 'a', status: 'active', subtotal: 100, remaining: 50, items: [{quantity: 2}] }, { invoiceId: 'b', status: 'bombed', subtotal: 200, remaining: 0, items: [{quantity: 3}] }]
const payments = [{ paymentId: 'p1', invoiceId: 'a', amount: 50 }, { paymentId: 'p2', invoiceId: 'b', amount: 20 }]
test('trash retains original amounts/items/payment records but excludes them from active results', () => {
  const deleted = setInvoiceDeleted(records, 'a', true, '2026-09-12T00:00:00Z')
  assert.equal(deleted.length, 2)
  assert.deepEqual(deleted[0], {...records[0], deletedAt: '2026-09-12T00:00:00Z'})
  const view = visibleInvoiceData(deleted, payments)
  assert.deepEqual(view.invoices, [records[1]])
  assert.deepEqual(view.payments, [payments[1]])
  assert.equal(payments.length, 2)
  assert.deepEqual(setInvoiceDeleted(deleted, 'a', false), records)
})
test('repeated deletion is idempotent, nonexistent ID leaves records intact', () => {
  const deleted = setInvoiceDeleted(records, 'a', true, 'first')
  assert.deepEqual(setInvoiceDeleted(deleted, 'a', true, 'second'), deleted)
  assert.deepEqual(setInvoiceDeleted(records, 'unknown', true), records)
})
test('restore preserves bombed status and original inventory quantities', () => {
  const deleted = setInvoiceDeleted(records, 'b', true)
  assert.equal(visibleInvoiceData(deleted, payments).invoices.filter(i => i.status === 'bombed').length, 0)
  assert.deepEqual(setInvoiceDeleted(deleted, 'b', false), records)
})
