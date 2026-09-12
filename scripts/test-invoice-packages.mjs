import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64')
const packageUrl = asModule(readFileSync(new URL('../src/utils/invoicePackages.ts', import.meta.url), 'utf8'))
const { groupInvoicePackages } = await import(packageUrl)
const moneyUrl = asModule(readFileSync(new URL('../src/utils/money.ts', import.meta.url), 'utf8'))
const imageSource = readFileSync(new URL('../src/utils/invoiceImage.ts', import.meta.url), 'utf8').replace("'./money'", JSON.stringify(moneyUrl)).replace("'./invoicePackages'", JSON.stringify(packageUrl))
const { createInvoiceImage } = await import(asModule(imageSource))
const rows = [{ productName: 'A01', itemType: 'te', quantity: 2, unitPrice: 200000, subtotal: 400000 }, { packageNumber: 2, productName: 'B01', itemType: 'nl', quantity: 4, unitPrice: 150000, subtotal: 600000 }, { packageNumber: 1, productName: 'A02', itemType: 'nl', quantity: 3, unitPrice: 300000, subtotal: 900000 }]
test('legacy rows belong to package 1 and package totals reconcile with the invoice', () => {
  const groups = groupInvoicePackages(rows)
  assert.deepEqual(groups.map(p => [p.number, p.quantity, p.items.reduce((sum, row) => sum + row.subtotal, 0)]), [[1, 5, 1300000], [2, 4, 600000]])
  assert.equal(groups.flatMap(p => p.items).length, rows.length)
  assert.equal(rows[0].packageNumber, undefined)
  assert.deepEqual(groupInvoicePackages(JSON.parse(JSON.stringify(rows))), groups)
})
test('image contains all package details, separate subtotals and a final invoice total within canvas bounds', async () => {
  const texts = []
  const canvases = []
  globalThis.document = { createElement: () => { const canvas = { width: 0, height: 0, getContext: () => ({ measureText: text => ({ width: text.length * 16 }), fillRect() {}, fillText(text, x, y) { texts.push({ text, x, y }) }, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }), toBlob: callback => callback(new Blob(['png'])) }; canvases.push(canvas); return canvas } }
  try {
    await createInvoiceImage({ items: rows, customerName: 'Test', invoiceDate: '2026-09-13', subtotal: 1900000, deposit: 500000, remaining: 1400000, paymentMethod: 'transfer' })
    for (const name of ['Kiện 1', 'Kiện 2', 'A01', 'A02', 'B01', 'Tổng kiện 1: 5 đôi', 'Tổng kiện 2: 4 đôi', 'Tổng tiền hàng']) assert.ok(texts.some(row => row.text === name), name)
    const canvas = canvases.at(-1)
    assert.ok(texts.every(row => row.y > 0 && row.y < canvas.height && row.x <= canvas.width))
  } finally { delete globalThis.document }
})
