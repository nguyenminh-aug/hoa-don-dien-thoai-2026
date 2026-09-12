export type Snapshot = Record<string, string>
export const RECORD_IDS: Record<string, string> = {
  'hoa-don-customers': 'customerId', 'hoa-don-invoices': 'invoiceId',
  'hoa-don-payments': 'paymentId', 'hoa-don-customer-debts': 'debtId',
  'hoa-don-customer-debt-transactions': 'transactionId',
  'hoa-don-operating-expenses': 'expenseId', 'hoa-don-inventory-products': 'productKey',
  'hoa-don-supplier-payments': 'paymentId', 'hoa-don-china-suppliers': 'supplierId',
  'hoa-don-supplier-debt-entries': 'debtEntryId',
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}'
  return JSON.stringify(value) ?? 'undefined'
}
export function mergeSnapshots(base: Snapshot, local: Snapshot, remote: Snapshot): Snapshot {
  const result = { ...remote }
  for (const [key, id] of Object.entries(RECORD_IDS)) {
    const index = (raw: string) => new Map<string, Record<string, unknown>>(JSON.parse(raw).map((r: Record<string, unknown>) => [r[id], r]))
    const b = index(base[key]), l = index(local[key]), r = index(remote[key])
    for (const [recordId, original] of b) {
      if (!l.has(recordId) || !r.has(recordId)) throw Error('Dữ liệu thiếu bản ghi. Hãy đối chiếu với dữ liệu đã đồng bộ.')
      const mine = l.get(recordId), theirs = r.get(recordId)
      if (stable(mine) !== stable(original) && stable(theirs) !== stable(original) && stable(mine) !== stable(theirs)) throw Error('Một hóa đơn hoặc bản ghi vừa được sửa trên hai thiết bị. Hãy tải dữ liệu đã đồng bộ sau khi lưu bản sao trên máy.')
    }
    const merged = new Map(r)
    for (const [recordId, mine] of l) {
      const original = b.get(recordId), theirs = r.get(recordId)
      if (!original && theirs && stable(mine) !== stable(theirs)) throw Error('Trùng mã với dữ liệu khác đã đồng bộ.')
      if (!original || stable(mine) !== stable(original)) merged.set(recordId, mine)
    }
    result[key] = JSON.stringify([...merged.values()])
  }
  return result
}
export function sameBusiness(a: Snapshot, b: Snapshot) {
  return Object.entries(RECORD_IDS).every(([key,id]) => {
    const sorted = (raw: string) => JSON.parse(raw).sort((x: Record<string,string>,y: Record<string,string>) => x[id].localeCompare(y[id]))
    return stable(sorted(a[key])) === stable(sorted(b[key]))
  })
}
