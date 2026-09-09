import type { AppSettings } from '../types/invoice'

export const defaultSettings: AppSettings = {
  exchangeRate: 3900,
  surcharges: { te: 14000, nl: 16000, bte: 15000, bnl: 17000, blo: 20000 },
  itemOperatingCosts: { te: 5000, nl: 7000, bte: 6000, bnl: 8000, blo: 10000 },
  apiUrl: 'https://script.google.com/macros/s/AKfycbwe6cegJjG4t1TU6kDLUPLjRYhEoD18pLN9OLXr7sro4aeZu_-Un-Vqet82lFhlPi4LDA/exec',
}

export const itemTypeLabels = {
  te: 'te', nl: 'nl', bte: 'bte', bnl: 'bnl', blo: 'blo',
} as const
