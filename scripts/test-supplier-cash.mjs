import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
const source = stripTypeScriptTypes(readFileSync(new URL('../src/utils/supplierCash.ts', import.meta.url), 'utf8'))
const { calculateSupplierCash } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const invoices = [{ invoiceId: 'a', status: 'active', subtotal: 1000, profit: 200 }, { invoiceId: 'b', status: 'active', subtotal: 500, profit: 100 }]
const receipts = [{ invoiceId: 'a', paymentMethod: 'cod', amount: 300 }, { invoiceId: 'a', paymentMethod: 'transfer', amount: 200 }, { invoiceId: 'a', paymentMethod: 'cash', amount: 50 }]
test('reserve all profit including unpaid invoices; investment adds principal and payouts subtract it', () => {
  const result = calculateSupplierCash(invoices, receipts, [{ amount: 100 }], 1000)
  assert.equal(result.reservedProfit, 300)
  assert.equal(result.availableCash, 1100)
  assert.equal(result.supplierPaid, 100)
  assert.equal(calculateSupplierCash(invoices, receipts, [{ amount: 200 }], 1000).availableCash, 1000)
})
test('deleted, bombed, cash and cancelled receipts do not fund supplier cash; capital is not a payout', () => {
  const result = calculateSupplierCash([...invoices, { invoiceId: 'c', deletedAt: 'now', profit: 900 }, { invoiceId: 'd', status: 'bombed', profit: 900 }], [...receipts, { invoiceId: 'c', paymentMethod: 'cod', amount: 999 }, { invoiceId: 'd', paymentMethod: 'cod', amount: 999 }, { invoiceId: 'a', deletedAt: 'now', paymentMethod: 'transfer', amount: 999 }], [{ kind: 'investment', amount: 0, investmentAmount: 1000 }], 1000)
  assert.equal(result.availableCash, 1200)
  assert.equal(result.supplierPaid, 0)
})
test('net profit accounts for expenses and a loss cannot create spendable cash', () => {
  assert.equal(calculateSupplierCash(invoices, receipts, [], 0, 50).availableCash, 250)
  assert.equal(calculateSupplierCash(invoices, receipts, [], 0, 500).availableCash, 500)
  const shortage = calculateSupplierCash(invoices, receipts, [{ amount: 900 }], 0)
  assert.equal(shortage.availableCash, 0)
  assert.equal(shortage.balance, -700)
})
