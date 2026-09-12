import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
const source = stripTypeScriptTypes(readFileSync(new URL('../src/utils/supplierCash.ts', import.meta.url), 'utf8'))
const { calculateSupplierCash } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const invoices = [{ invoiceId: 'a', status: 'active', subtotal: 1000, profit: 200 }, { invoiceId: 'b', status: 'active', subtotal: 500, profit: 100 }]
const receipts = [{ invoiceId: 'a', paymentMethod: 'cod', amount: 300 }, { invoiceId: 'a', paymentMethod: 'transfer', amount: 200 }, { invoiceId: 'a', paymentMethod: 'cash', amount: 50 }]
test('reserve all profit including unpaid invoices; investment and payouts both reduce available principal', () => {
  const result = calculateSupplierCash(invoices, receipts, [{ amount: 100 }], 50)
  assert.equal(result.reservedProfit, 300)
  assert.equal(result.availableCash, 50)
  assert.equal(result.supplierPaid, 100)
  assert.equal(calculateSupplierCash(invoices, receipts, [{ amount: 150 }], 50).availableCash, 0)
})
test('deleted, bombed, cash and cancelled receipts do not fund supplier cash; capital is not a payout', () => {
  const result = calculateSupplierCash([...invoices, { invoiceId: 'c', deletedAt: 'now', profit: 900 }, { invoiceId: 'd', status: 'bombed', profit: 900 }], [...receipts, { invoiceId: 'c', paymentMethod: 'cod', amount: 999 }, { invoiceId: 'd', paymentMethod: 'cod', amount: 999 }, { invoiceId: 'a', deletedAt: 'now', paymentMethod: 'transfer', amount: 999 }], [{ kind: 'investment', amount: 0, investmentAmount: 1000 }], 1000)
  assert.equal(result.availableCash, 0)
  assert.equal(result.supplierPaid, 0)
})
test('net profit accounts for expenses and a loss cannot create spendable cash', () => {
  assert.equal(calculateSupplierCash(invoices, receipts, [], 0, 50).availableCash, 250)
  assert.equal(calculateSupplierCash(invoices, receipts, [], 0, 500).availableCash, 500)
  const shortage = calculateSupplierCash(invoices, receipts, [{ amount: 900 }], 0)
  assert.equal(shortage.availableCash, 0)
  assert.equal(shortage.balance, -700)
})

test('recovering invested principal restores cash without changing supplier repayments', () => {
  const invested = calculateSupplierCash(invoices, receipts, [{ amount: 25 }], 100)
  const recovered = calculateSupplierCash(invoices, receipts, [{ amount: 25 }], 0)
  assert.equal(recovered.availableCash - invested.availableCash, 100)
  assert.equal(invested.supplierPaid, recovered.supplierPaid)
  assert.equal(invested.reservedProfit, recovered.reservedProfit)
})

test('period filters receipt dates independently of invoice age and excludes old payouts/profits', () => {
  const old = { invoiceId: 'old', status: 'active', invoiceDate: '2025-01-01', subtotal: 1000, profit: 200 }
  const recent = { invoiceId: 'new', status: 'active', invoiceDate: '2026-09-01', subtotal: 1000, profit: 100 }
  const result = calculateSupplierCash([old, recent], [{ invoiceId: 'old', paymentDate: '2026-09-02', paymentMethod: 'transfer', amount: 500 }, { invoiceId: 'new', paymentDate: '2026-08-31', paymentMethod: 'transfer', amount: 300 }], [{ paymentDate: '2025-01-01', amount: 9000 }, { paymentDate: '2026-09-03', amount: 50 }], 25, 0, { from: '2026-09-01', to: '2026-09-30' })
  assert.equal(result.transfer, 500)
  assert.equal(result.reservedProfit, 100)
  assert.equal(result.supplierPaid, 50)
  assert.equal(result.availableCash, 325)
})
test('automatic COD requires actual collection and uses collection date once', () => {
  const invoice = { invoiceId: 'cod', status: 'active', invoiceDate: '2026-08-01', subtotal: 1000, profit: 100 }
  const receipt = { invoiceId: 'cod', isAutoCod: true, paymentDate: '2026-08-01', paymentMethod: 'cod', amount: 1000 }
  const period = { from: '2026-09-01', to: '2026-09-30' }
  assert.equal(calculateSupplierCash([invoice], [receipt], [], 0, 0, period).cod, 0)
  assert.equal(calculateSupplierCash([invoice], [{ ...receipt, collectedDate: '2026-09-01' }], [], 0, 0, period).cod, 1000)
  assert.equal(calculateSupplierCash([invoice], [{ ...receipt, collectedDate: '2026-08-31' }], [], 0, 0, period).cod, 0)
})
