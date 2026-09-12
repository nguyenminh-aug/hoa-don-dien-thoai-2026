import { useEffect, useState } from 'react'
import { BottomNavigation } from './components/BottomNavigation'
import { CustomersPage } from './pages/CustomersPage'
import { InvoicePage } from './pages/InvoicePage'
import { SettingsPage } from './pages/SettingsPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InventoryPage } from './pages/InventoryPage'
import { OperatingExpensesPage } from './pages/OperatingExpensesPage'
import { SupplierDebtPage } from './pages/SupplierDebtPage'
import type { AppTab } from './types/navigation'
import { seedDemoDataFromQuery } from './utils/demoSeed'
import { GoogleSheetsSync } from './components/GoogleSheetsSync'
import { restoreGoogleBackup } from './utils/googleSheets'

seedDemoDataFromQuery()

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('invoice')
  const [detail, setDetail] = useState<{ type: 'customer' | 'invoice'; id: string } | null>(null)
  const [ready, setReady] = useState(false)
  const navigateToTab = (tab: AppTab) => {
    setDetail(null)
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  useEffect(() => { void restoreGoogleBackup().finally(() => setReady(true)) }, [])
  if (!ready) return <div className="app-shell"><main className="app-content"><div className="empty-state large"><strong>Đang tải dữ liệu</strong><p>Đang kiểm tra bản sao dữ liệu.</p></div></main></div>
  const page = detail?.type === 'customer' ? <CustomerDetailPage customerId={detail.id} onBack={() => setDetail(null)} onOpenInvoice={id => setDetail({ type: 'invoice', id })} />
    : detail?.type === 'invoice' ? <InvoiceDetailPage invoiceId={detail.id} onBack={() => setDetail(null)} />
    : { invoice: <InvoicePage onSaved={id => setDetail({ type: 'invoice', id })} />, customers: <CustomersPage onOpenCustomer={id => setDetail({ type: 'customer', id })} />, inventory: <InventoryPage />, expenses: <OperatingExpensesPage />, suppliers: <SupplierDebtPage />, statistics: <StatisticsPage />, settings: <SettingsPage /> }[activeTab]
  return <div className="app-shell"><GoogleSheetsSync visible={activeTab === 'customers' && detail === null} /><main className="app-content">{page}</main><BottomNavigation activeTab={activeTab} onChange={navigateToTab} /></div>
}
