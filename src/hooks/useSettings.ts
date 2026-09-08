import { useEffect, useState } from 'react'
import { defaultSettings } from '../config/settings'
import type { AppSettings } from '../types/invoice'

const STORAGE_KEY = 'hoa-don-settings'

function readSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultSettings
    const parsed = JSON.parse(saved) as Partial<AppSettings>
    return { exchangeRate: parsed.exchangeRate ?? defaultSettings.exchangeRate, surcharges: { ...defaultSettings.surcharges, ...parsed.surcharges }, itemOperatingCosts: { ...defaultSettings.itemOperatingCosts, ...parsed.itemOperatingCosts }, apiUrl: parsed.apiUrl ?? '' }
  } catch { return defaultSettings }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(readSettings)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) }, [settings])
  return { settings, setSettings }
}
