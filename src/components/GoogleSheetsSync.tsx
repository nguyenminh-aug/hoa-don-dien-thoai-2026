import { useEffect, useRef } from 'react'
import { googleSheetsUrl, readAppData } from '../utils/googleSheets'

const STORAGE_TO_SHEET: Record<string, string> = {
  'hoa-don-customers': 'KhachHang',
  'hoa-don-invoices': 'HoaDon',
  'hoa-don-payments': 'ThanhToan',
  'hoa-don-customer-debts': 'CongNoKhach',
  'hoa-don-customer-debt-transactions': 'LichSuCongNoKhach',
  'hoa-don-operating-expenses': 'ChiPhiVanHanh',
  'hoa-don-inventory-products': 'HangTon',
}

function readStorage(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}

/** Sends a best-effort backup whenever locally stored business data changes. */
export function GoogleSheetsSync() {
  const lastPayload = useRef('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const sync = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        const apiUrl = googleSheetsUrl().trim()
        if (!apiUrl) return

        const rawData = readAppData()
        // Never let an empty browser profile overwrite a non-empty remote copy.
        const hasBusinessData = Object.entries(rawData).some(([key, value]) => key !== 'hoa-don-settings' && value !== '[]')
        if (!hasBusinessData) return

        const data = Object.fromEntries(
          Object.entries(STORAGE_TO_SHEET).map(([storageKey, sheet]) => [sheet, readStorage(storageKey)]),
        )
        const payload = JSON.stringify({ action: 'sync', data, rawData })
        if (payload === lastPayload.current) return
        lastPayload.current = payload

        // Apps Script redirects cross-origin requests. no-cors permits this
        // simple form submission; the local app remains the source of truth.
        void fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: new URLSearchParams({ payload }).toString(),
        }).catch(() => {
          // Retry is naturally triggered by the next local change or interval.
          lastPayload.current = ''
        })
      }, 800)
    }

    sync()
    window.addEventListener('hoa-don-storage-change', sync)
    const interval = window.setInterval(sync, 30_000)
    return () => {
      window.clearTimeout(timer.current)
      window.clearInterval(interval)
      window.removeEventListener('hoa-don-storage-change', sync)
    }
  }, [])

  return null
}
