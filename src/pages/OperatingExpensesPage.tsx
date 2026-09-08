import { useState } from 'react'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { useOperatingExpenses } from '../hooks/useOperatingExpenses'
import { type OperatingCosts } from '../types/invoice'
import { todayIso } from '../utils/id'
import { formatVnd, parseNumber } from '../utils/money'
import { emptyOperatingCosts } from '../utils/invoiceCalculation'

const costFields = [['packing', 'Đóng hàng'], ['tape', 'Băng dính'], ['loading', 'Tải'], ['shipping', 'Ship'], ['cancelledGoods', 'Bom hàng']] as const
export function OperatingExpensesPage() {
  const { expenses, addExpense, deleteExpense } = useOperatingExpenses(); const [costs, setCosts] = useState<OperatingCosts>(emptyOperatingCosts()); const [date, setDate] = useState(todayIso()); const [note, setNote] = useState('')
  const total = Object.values(costs).reduce((sum, value) => sum + value, 0)
  const save = () => { if (!total) return; addExpense(date, costs, note); setCosts(emptyOperatingCosts()); setNote('') }
  return <><PageHeader title="Chi phí vận hành" subtitle="Nhập chi phí riêng, không bắt buộc theo hóa đơn" />
    <section className="form-card"><label className="field"><span className="field-label">Ngày chi phí</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><div className="surcharge-list">{costFields.map(([key, label]) => <label className="field" key={key}><span className="field-label">{label}</span><input type="number" min={0} inputMode="numeric" value={costs[key] || ''} placeholder="0" onChange={event => setCosts(current => ({ ...current, [key]: Math.max(0, parseNumber(event.target.value)) }))} /></label>)}</div><label className="field"><span className="field-label">Ghi chú</span><input value={note} onChange={event => setNote(event.target.value)} placeholder="Không bắt buộc" /></label><div className="totals-row light"><span>Tổng chi phí</span><strong>{formatVnd(total)}</strong></div><button className="primary-button" onClick={save} disabled={!total}>Lưu chi phí</button></section>
    <section className="form-card"><div className="form-card-heading"><h2>Lịch sử chi phí</h2></div>{[...expenses].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt)).map(expense => <div className="invoice-line expense-line" key={expense.expenseId}><div><strong>{expense.expenseDate}</strong><span>{costFields.filter(([key]) => expense.costs[key] > 0).map(([key, label]) => `${label}: ${formatVnd(expense.costs[key])}`).join(' · ')}{expense.note ? ` · ${expense.note}` : ''}</span></div><div><strong>{formatVnd(expense.total)}</strong><button className="icon-btn danger" onClick={() => deleteExpense(expense.expenseId)} aria-label="Xóa chi phí"><Icon name="trash" size={16} /></button></div></div>)}{!expenses.length && <div className="empty-state"><strong>Chưa có chi phí</strong><p>Thêm chi phí vận hành để tính lợi nhuận chính xác.</p></div>}</section>
  </>
}
