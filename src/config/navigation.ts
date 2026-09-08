import type { NavigationItem } from '../types/navigation'

export const navigationItems: NavigationItem[] = [
  { id: 'invoice', label: 'Tạo đơn', icon: 'document' },
  { id: 'customers', label: 'Khách hàng', icon: 'users' },
  { id: 'inventory', label: 'Hàng tồn', icon: 'box' },
  { id: 'expenses', label: 'Chi phí', icon: 'document' },
  { id: 'suppliers', label: 'Nhà nợ TQ', icon: 'document' },
  { id: 'statistics', label: 'Thống kê', icon: 'chart' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings' },
]
