import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { stripTypeScriptTypes } from 'node:module'
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
const mergeUrl = moduleUrl(readFileSync(new URL('../src/utils/syncMerge.ts', import.meta.url), 'utf8'))
const source = readFileSync(new URL('../src/utils/googleSheets.ts', import.meta.url), 'utf8').replace("'./syncMerge'", JSON.stringify(mergeUrl)).replaceAll('import.meta.env', '({ MODE: "production", VITE_GOOGLE_APPS_SCRIPT_URL: "https://example.test/exec" })')
const api = await import(moduleUrl(source))
const { mergeSnapshots } = await import(mergeUrl)
let values, remote, revision, posts
function reset() {
  values = new Map(); posts = 0; revision = 1
  globalThis.window = new EventTarget()
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) }
  remote = {...api.readAppData(), 'hoa-don-settings': '{}'}
  globalThis.fetch = async (_, options) => {
    if (options?.method === 'POST') {
      posts++
      const body = JSON.parse(options.body.get('payload'))
      assert.equal(body.action, 'sync-v2')
      if (body.baseRevision === String(revision)) { remote = body.rawData; revision++ }
      return {}
    }
    return { ok: true, json: async () => ({ok:true, protocol:2, revision:String(revision), data:structuredClone(remote)}) }
  }
}
test('empty device restores without POST', async () => {
  reset(); remote['hoa-don-customers']='[{"customerId":"a"}]'
  assert.equal(await api.synchronize(),true); assert.equal(posts,0)
  assert.equal(values.get('hoa-don-customers'),remote['hoa-don-customers'])
})
test('upgrade adds recovered remote invoices without losing locally unique records', async () => {
  reset(); remote['hoa-don-invoices']='[{"invoiceId":"old"}]'
  values.set('hoa-don-invoices','[{"invoiceId":"new"}]')
  assert.equal(await api.synchronize(),true); assert.equal(posts,1)
  assert.equal(JSON.parse(remote['hoa-don-invoices']).length,2)
})
test('soft delete syncs and another device cannot resurrect using stale base', async () => {
  reset(); remote['hoa-don-invoices']='[{"invoiceId":"a"}]'
  await api.synchronize(); const base=structuredClone(remote)
  values.set('hoa-don-invoices','[{"invoiceId":"a","deletedAt":"today"}]')
  assert.equal(await api.synchronize(),true)
  assert.equal(JSON.parse(remote['hoa-don-invoices'])[0].deletedAt,'today')
  assert.equal(JSON.parse(mergeSnapshots(base,base,remote)['hoa-don-invoices'])[0].deletedAt,'today')
})
test('same-record conflict and missing records block writes', async () => {
  for (const local of ['[]','[{"invoiceId":"a","paid":2}]']) {
    reset(); remote['hoa-don-invoices']='[{"invoiceId":"a","paid":0}]'; await api.synchronize()
    values.set('hoa-don-invoices',local); remote['hoa-don-invoices']='[{"invoiceId":"a","paid":1}]'
    assert.equal(await api.synchronize(),false); assert.equal(posts,0); assert.equal(values.get('hoa-don-invoices'),local)
  }
})
test('offline and corrupt snapshots never POST or overwrite', async () => {
  reset(); remote['hoa-don-invoices']='broken'; assert.equal(await api.synchronize(),false); assert.equal(posts,0); assert.equal(values.size,0)
  globalThis.fetch=async()=>{throw Error('offline')}; assert.equal(await api.synchronize(),false); assert.equal(values.size,0)
})
test('opaque POST alone is not success; failed verification preserves local edits', async () => {
  reset(); await api.synchronize(); values.set('hoa-don-invoices','[{"invoiceId":"a"}]')
  const real=globalThis.fetch
  globalThis.fetch=async(url,options)=>options?.method==='POST'?{}:real(url,options)
  assert.equal(await api.synchronize(),false)
  assert.equal(values.get('hoa-don-invoices'),'[{"invoiceId":"a"}]')
})
test('edits made during POST remain pending instead of being overwritten', async () => {
  reset(); await api.synchronize(); values.set('hoa-don-customers','[{"customerId":"a"}]')
  const real=globalThis.fetch
  globalThis.fetch=async(url,options)=>{const result=await real(url,options); if(options?.method==='POST') values.set('hoa-don-customers','[{"customerId":"a"},{"customerId":"b"}]'); return result}
  assert.equal(await api.synchronize(),true)
  assert.equal(JSON.parse(values.get('hoa-don-customers')).length,2)
  assert.equal(JSON.parse(remote['hoa-don-customers']).length,1)
})
test('no baseline plus conflicting old device data requires explicit reconciliation', async () => {
  reset(); remote['hoa-don-invoices']='[{"invoiceId":"a","deletedAt":"today"}]'; values.set('hoa-don-invoices','[{"invoiceId":"a"}]')
  assert.equal(await api.synchronize(),false); assert.equal(posts,0)
})
