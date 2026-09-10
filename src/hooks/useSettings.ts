import { useEffect, useState } from 'react'
import { defaultSettings } from '../config/settings'
import { ITEM_TYPES, type AppSettings, type ItemType } from '../types/invoice'

const STORAGE_KEY = 'hoa-don-settings'

function readSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultSettings
    const parsed = JSON.parse(saved) as Partial<AppSettings>
    const savedSurcharges: Partial<Record<ItemType, number>> = parsed.surcharges ?? {}
    // Migrate the old setup where every item type was mistakenly stored as 14,000đ.
    const allLegacyFourteen = ITEM_TYPES.every(type => savedSurcharges[type] === 14000)
    return {
      exchangeRate: parsed.exchangeRate ?? defaultSettings.exchangeRate,
      surcharges: allLegacyFourteen ? defaultSettings.surcharges : { ...defaultSettings.surcharges, ...savedSurcharges },
      itemOperatingCosts: { ...defaultSettings.itemOperatingCosts, ...parsed.itemOperatingCosts },
      apiUrl: parsed.apiUrl || defaultSettings.apiUrl,
    }
  } catch { return defaultSettings }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(readSettings)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) }, [settings])
  return { settings, setSettings }
}
