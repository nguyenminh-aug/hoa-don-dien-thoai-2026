import type { AppSettings } from '../types/invoice'

export const defaultSettings: AppSettings = {
  exchangeRate: 3900,
  surcharges: { te: 14000, nl: 14000, bte: 14000, bnl: 14000, blo: 14000 },
  itemOperatingCosts: { te: 5000, nl: 7000, bte: 6000, bnl: 8000, blo: 10000 },
  apiUrl: '',
}

export const itemTypeLabels = {
  te: 'te', nl: 'nl', bte: 'bte', bnl: 'bnl', blo: 'blo',
} as const
