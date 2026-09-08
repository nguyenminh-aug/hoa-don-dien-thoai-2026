import { navigationItems } from '../config/navigation'
import type { AppTab } from '../types/navigation'
import { Icon } from './Icon'

interface BottomNavigationProps { activeTab: AppTab; onChange: (tab: AppTab) => void }

export function BottomNavigation({ activeTab, onChange }: BottomNavigationProps) {
  return <nav className="bottom-nav" aria-label="Điều hướng chính">
    {navigationItems.map((item) => <button key={item.id} className={activeTab === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(item.id)}>
      <Icon name={item.icon} size={22} /><span>{item.label}</span>
    </button>)}
  </nav>
}
