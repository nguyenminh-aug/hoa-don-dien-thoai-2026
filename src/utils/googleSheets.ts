const STORAGE_KEYS = [
  'hoa-don-settings', 'hoa-don-customers', 'hoa-don-invoices',
  'hoa-don-payments', 'hoa-don-customer-debts', 'hoa-don-customer-debt-transactions', 'hoa-don-operating-expenses',
  'hoa-don-inventory-products', 'hoa-don-supplier-payments', 'hoa-don-china-suppliers',
]

export function googleSheetsUrl() {
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

/** Restores the latest complete app snapshot before feature hooks read localStorage. */
export async function restoreGoogleBackup() {
  const url = googleSheetsUrl().trim()
  if (!url) return false
  try {
    const response = await fetch(`${url}?action=backup`, { cache: 'no-store' })
    const result = await response.json() as { ok?: boolean; data?: Record<string, string> }
    if (!result.ok || !result.data || !Object.keys(result.data).length) return false
    for (const key of STORAGE_KEYS) {
      const value = result.data[key]
      if (typeof value === 'string') localStorage.setItem(key, value)
    }
    return true
  } catch {
    return false
  }
}
