import { mergeSnapshots, sameBusiness, stable, type Snapshot } from './syncMerge'
const STORAGE_KEYS = [
  'hoa-don-settings', 'hoa-don-customers', 'hoa-don-invoices',
  'hoa-don-payments', 'hoa-don-customer-debts', 'hoa-don-customer-debt-transactions', 'hoa-don-operating-expenses',
  'hoa-don-inventory-products', 'hoa-don-supplier-payments', 'hoa-don-china-suppliers', 'hoa-don-supplier-debt-entries',
]

export function googleSheetsUrl() {
  // Local modes never fall back to a saved production URL or the shared .env.
  if (import.meta.env.MODE !== 'production') {
    return import.meta.env.VITE_STAGING_GOOGLE_APPS_SCRIPT_URL || ''
  }
  try {
    const settings = JSON.parse(localStorage.getItem('hoa-don-settings') ?? '{}')
    return settings.apiUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''
  } catch {
    return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''
  }
}

export function readAppData() {
  return Object.fromEntries(STORAGE_KEYS.map(key => [key, localStorage.getItem(key) ?? '[]']))
}

let restoreWarning = ''
export function getRestoreWarning() { return restoreWarning }

const RECORD_IDS: Record<string, string> = {
  'hoa-don-customers': 'customerId', 'hoa-don-invoices': 'invoiceId',
  'hoa-don-payments': 'paymentId', 'hoa-don-customer-debts': 'debtId',
  'hoa-don-customer-debt-transactions': 'transactionId',
  'hoa-don-operating-expenses': 'expenseId', 'hoa-don-inventory-products': 'productKey',
  'hoa-don-supplier-payments': 'paymentId', 'hoa-don-china-suppliers': 'supplierId',
  'hoa-don-supplier-debt-entries': 'debtEntryId',
}

export function validateBackup(data: Record<string, string>) {
  for (const key of STORAGE_KEYS) {
    if (typeof data[key] !== 'string') throw new Error(`Thiếu dữ liệu: ${key}`)
    const value: unknown = JSON.parse(data[key])
    if (key === 'hoa-don-settings') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Cài đặt không hợp lệ')
    } else {
      if (!Array.isArray(value)) throw new Error(`Danh sách không hợp lệ: ${key}`)
      const ids = new Set<string>()
      for (const row of value) {
        const id = row?.[RECORD_IDS[key]]
        if (typeof id !== 'string' || !id || ids.has(id)) throw new Error(`Mã dữ liệu lỗi hoặc trùng: ${key}`)
        ids.add(id)
      }
    }
  }
}

const BASE_KEY = 'hoa-don-sync-base-v2'
let busy = false
export function syncMessage() { return restoreWarning }
function status(message: string) {
  restoreWarning = message
  window.dispatchEvent(new Event('hoa-don-sync-status'))
}
async function remoteBackup(url: string) {
  const target = new URL(url); target.searchParams.set('action', 'backup')
  const response = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
  const result = await response.json()
  if (!response.ok || !result.ok || result.protocol !== 2 || typeof result.revision !== 'string') throw Error('Máy chủ chưa sẵn sàng đồng bộ an toàn. Dữ liệu mới vẫn ở thiết bị.')
  validateBackup(result.data)
  return result as { data: Snapshot; revision: string }
}
function baseline(url: string): Snapshot | null {
  const saved = JSON.parse(localStorage.getItem(BASE_KEY) || 'null')
  if (!saved || saved.url !== url) return null
  validateBackup(saved.data); return saved.data
}
function apply(data: Snapshot) {
  // Save a durable recovery point before a multi-key update.
  const before = readAppData()
  localStorage.setItem('hoa-don-before-restore', JSON.stringify({ at: new Date().toISOString(), data: before }))
  try {
    for (const key of Object.keys(RECORD_IDS)) localStorage.setItem(key, data[key])
  } catch (error) {
    for (const key of Object.keys(RECORD_IDS)) localStorage.setItem(key, before[key])
    throw error
  }
  window.dispatchEvent(new Event('hoa-don-storage-change'))
}
export async function synchronize() {
  if (busy) return false
  const url = googleSheetsUrl().trim()
  if (!url) return false
  busy = true
  try {
    const remote = await remoteBackup(url)
    const local = readAppData()
    const base = baseline(url)
    let merged: Snapshot
    if (!base) {
      // First upgrade: remote wins for known records; preserve unmatched local
      // records, but ask the user before discarding any conflicting local edits.
      for (const [key,id] of Object.entries(RECORD_IDS)) {
        const serverRows = new Map<string, unknown>(JSON.parse(remote.data[key]).map((r: Record<string,string>) => [r[id], r]))
        for (const row of JSON.parse(local[key])) {
          const known = serverRows.get(row[id])
          if (known && stable(known) !== stable(row)) throw Error('Dữ liệu cũ trên máy khác Google Sheets. Lưu bản sao rồi chọn tải dữ liệu đã phục hồi.')
        }
      }
      merged = mergeSnapshots(Object.fromEntries(Object.keys(RECORD_IDS).map(k => [k, '[]'])), local, remote.data)
    } else merged = mergeSnapshots(base, local, remote.data)
    if (!sameBusiness(merged, remote.data)) {
      if (Object.values(merged).some(value => value.length > 45000)) throw Error('Dữ liệu đã gần giới hạn lưu trữ của máy chủ. Đã giữ thay đổi trên máy; cần nâng cấp lưu trữ trước khi gửi tiếp.')
      status('Đang gửi thay đổi…')
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: new URLSearchParams({ payload: JSON.stringify({ action: 'sync-v2', baseRevision: remote.revision, rawData: merged }) }), signal: AbortSignal.timeout(30_000) })
      // Opaque POST is not an acknowledgement. Read back the canonical snapshot.
      const confirmed = await remoteBackup(url)
      if (!sameBusiness(merged, confirmed.data)) throw Error('Chưa xác nhận được thay đổi trên Google Sheets; đã giữ dữ liệu trên máy. Bấm thử lại.')
    }
    const current = readAppData()
    const withPending = mergeSnapshots(local, current, merged)
    apply(withPending)
    localStorage.setItem(BASE_KEY, JSON.stringify({ url, data: merged }))
    status(sameBusiness(withPending, merged) ? 'Đã đồng bộ Google Sheets' : 'Còn thay đổi trên máy đang chờ đồng bộ')
    return true
  } catch (error) {
    status(error instanceof Error ? error.message : 'Chưa đồng bộ; dữ liệu vẫn ở thiết bị.')
    return false
  } finally { busy = false }
}
export async function restoreGoogleBackup() { return synchronize() }
export function exportLocalBackup() {
  const blob = new Blob([JSON.stringify({ at: new Date().toISOString(), data: readAppData() }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `hoa-don-backup-${Date.now()}.json`; link.click(); URL.revokeObjectURL(url)
}
export async function useRemoteBackup() {
  if (busy) return
  busy = true
  try {
    const url = googleSheetsUrl().trim(), before = readAppData()
    const remote = await remoteBackup(url)
    if (JSON.stringify(readAppData()) !== JSON.stringify(before)) throw Error('Dữ liệu vừa thay đổi. Hãy thử lại.')
    exportLocalBackup()
    apply(remote.data)
    localStorage.setItem(BASE_KEY, JSON.stringify({ url, data: remote.data }))
    status('Đã tải dữ liệu Google Sheets; bản cũ trên máy đã được sao lưu')
  } catch (error) { status(error instanceof Error ? error.message : 'Không tải được dữ liệu') }
  finally { busy = false }
}
