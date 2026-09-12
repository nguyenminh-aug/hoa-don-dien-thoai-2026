import { useEffect, useState } from 'react'
import { googleSheetsUrl, syncMessage, synchronize, useRemoteBackup, exportLocalBackup } from '../utils/googleSheets'
export function GoogleSheetsSync({ visible = true }: { visible?: boolean }) {
  const [message, setMessage] = useState(syncMessage())
  useEffect(() => {
    let timer: number | undefined
    const update = () => setMessage(syncMessage())
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void synchronize(), 1200) }
    window.addEventListener('hoa-don-sync-status', update)
    // User writes only; remote applies must not schedule an endless sync loop.
    window.addEventListener('hoa-don-user-write', schedule)
    window.addEventListener('online', schedule)
    const interval = window.setInterval(() => void synchronize(), 30000)
    return () => { window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener('hoa-don-sync-status', update); window.removeEventListener('hoa-don-user-write', schedule); window.removeEventListener('online', schedule) }
  }, [])
  // Keep background synchronization active while hiding controls on other tabs.
  if (!visible || !googleSheetsUrl().trim()) return null
  return <section className="form-card" aria-label="Đồng bộ dữ liệu"><p role="status">{message || 'Đang tải dữ liệu…'}</p>
    <button className="inline-action" onClick={() => void synchronize()}>Đồng bộ lại</button>{' '}
    <button className="inline-action" onClick={exportLocalBackup}>Tải bản sao trên máy</button>{' '}
    <button className="inline-action" onClick={() => { if (window.confirm('Tải dữ liệu đã đồng bộ thay cho dữ liệu đang có trên thiết bị? Bản hiện tại sẽ được tải xuống và lưu dự phòng trước khi thay thế.')) void useRemoteBackup() }}>Tải dữ liệu</button>
  </section>
}
