export type AppTab = 'invoice' | 'customers' | 'inventory' | 'expenses' | 'suppliers' | 'statistics' | 'settings'

export interface NavigationItem {
  id: AppTab
  label: string
  icon: 'document' | 'users' | 'box' | 'chart' | 'settings'
}
