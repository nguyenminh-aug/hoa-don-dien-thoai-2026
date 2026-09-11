import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'

const source = readFileSync(new URL('../server/Code.gs', import.meta.url), 'utf8')
function server() {
  const writes = []; const sheets = new Map(); let stored; let locked = false
  const makeSheet = name => ({
    getLastRow: () => name === 'DuLieuApp' ? Object.keys(stored).length + 1 : 0,
    getMaxRows: () => 1000, getMaxColumns: () => 100,
    setFrozenRows: () => {},
    getRange: (r, c, n, m) => ({
      getValues: () => Object.entries(stored),
      setValues: rows => {
        assert.equal(locked, true)
        writes.push({ name, rows })
        if (name === 'DuLieuApp') stored = Object.fromEntries(rows.slice(1))
      },
    }),
  })
  const ss = {
    getSheetByName: name => name === 'DuLieuApp' ? makeSheet(name) : sheets.get(name),
    insertSheet: name => { const sheet = makeSheet(name); sheets.set(name, sheet); return sheet },
  }
  const ctx = vm.createContext({ console,
    SpreadsheetApp: { openById: () => ss, flush: () => {} },
    LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(locked, false); locked = true }, releaseLock: () => { locked = false } }) },
    Utilities: { DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, getUuid: () => 'unique', computeDigest: (_, text) => [...createHash('sha256').update(text).digest()] },
    ContentService: { MimeType: { JSON: 1 }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  })
  vm.runInContext(source, ctx)
  stored = Object.fromEntries(vm.runInContext('KEYS', ctx).map(k => [k, k === 'hoa-don-settings' ? '{}' : '[]']))
  stored['hoa-don-customers'] = '[{"customerId":"c1"}]'
  stored['hoa-don-invoices'] = '[{"invoiceId":"i1","customerId":"c1","items":[{"subtotal":100}],"subtotal":100}]'
  stored['hoa-don-payments'] = '[{"paymentId":"p1","invoiceId":"i1"}]'
  return { ctx, writes, current: () => structuredClone(stored), post: body => ctx.doPost({ parameter: { payload: JSON.stringify(body) } }) }
}
test('old clients are rejected before any write', () => {
  const s = server(); const result = s.post({ action: 'sync', data: {}, rawData: {} })
  assert.equal(result.ok, false); assert.match(result.error, /UPGRADE_REQUIRED/); assert.equal(s.writes.length, 0)
})
test('stale revision is rejected without writes', () => {
  const s = server(); const result = s.post({ action: 'sync-v2', baseRevision: 'stale', rawData: s.current() })
  assert.match(result.error, /CONFLICT/); assert.equal(s.writes.length, 0)
})
test('empty or partial device cannot remove remote records', () => {
  const s = server(); const raw = s.current(); raw['hoa-don-invoices'] = '[]'
  const result = s.post({ action: 'sync-v2', baseRevision: s.ctx.revision(s.current()), rawData: raw })
  assert.match(result.error, /DATA_LOSS_BLOCKED/); assert.equal(s.writes.length, 0)
})
test('archive is written before canonical commit, then stale second writer fails', () => {
  const s = server(); const base = s.ctx.revision(s.current()); const raw = s.current()
  raw['hoa-don-customers'] = '[{"customerId":"c1"},{"customerId":"c2"}]'
  assert.equal(s.post({ action: 'sync-v2', baseRevision: base, rawData: raw }).ok, true)
  assert.match(s.writes[0].name, /^Backup_/); assert.equal(s.writes[1].name, 'DuLieuApp')
  const count = s.writes.length
  assert.match(s.post({ action: 'sync-v2', baseRevision: base, rawData: raw }).error, /CONFLICT/)
  assert.equal(s.writes.length, count)
})
test('missing invoice references and oversize cells fail before writes', () => {
  for (const kind of ['link', 'size']) {
    const s = server(); const raw = s.current()
    if (kind === 'link') raw['hoa-don-payments'] = '[{"paymentId":"p1","invoiceId":"missing"}]'
    else raw['hoa-don-settings'] = JSON.stringify({ large: 'a'.repeat(45000) })
    assert.equal(s.post({ action: 'sync-v2', baseRevision: s.ctx.revision(s.current()), rawData: raw }).ok, false)
    assert.equal(s.writes.length, 0)
  }
})
test('soft deletion and restoration keep IDs and payments accepted by protected server', () => {
  const s = server(); const original = s.current(); const raw = s.current()
  const invoices = JSON.parse(raw['hoa-don-invoices'])
  invoices[0].deletedAt = '2026-09-12T00:00:00.000Z'
  raw['hoa-don-invoices'] = JSON.stringify(invoices)
  assert.equal(s.post({ action: 'sync-v2', baseRevision: s.ctx.revision(s.current()), rawData: raw }).ok, true)
  assert.equal(s.current()['hoa-don-payments'], original['hoa-don-payments'])
  assert.equal(s.post({ action: 'sync-v2', baseRevision: s.ctx.revision(s.current()), rawData: original }).ok, true)
})
