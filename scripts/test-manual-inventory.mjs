import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
const source = stripTypeScriptTypes(readFileSync(new URL('../src/utils/manualInventory.ts', import.meta.url), 'utf8'))
const { initializeManualInventory, MANUAL_INVENTORY_MARKER } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const item = { productName: 'A', quantity: 5, unitPrice: 100 }
const invoices = [{ status: 'bombed', items: [item] }, { status: 'active', items: [{ ...item, quantity: 2, fromInventory: true }] }]
test('preserve current inventory once and ignore subsequent invoice changes', () => {
  const products = [{ productKey: 'a', productName: 'A', inventoryCode: 'A', unitPrice: 100, quantityAdjustment: 3, createdAt: 'old', updatedAt: 'old' }]
  const migrated = initializeManualInventory(products, invoices, 'now')
  assert.equal(migrated.find(row => row.productKey === 'a').quantityAdjustment, 6)
  assert.ok(migrated.some(row => row.productKey === MANUAL_INVENTORY_MARKER))
  assert.equal(products[0].quantityAdjustment, 3)
  assert.strictEqual(initializeManualInventory(migrated, [], 'later'), migrated)
  assert.strictEqual(initializeManualInventory(migrated, [...invoices, ...invoices], 'later'), migrated)
})
test('empty warehouse remains manual after future bombed invoices; deleted invoices excluded', () => {
  const empty = initializeManualInventory([], [], 'now')
  assert.strictEqual(initializeManualInventory(empty, invoices, 'later'), empty)
  assert.equal(initializeManualInventory([], [{ ...invoices[0], deletedAt: 'now' }], 'now').length, 1)
})
