import { useState } from 'react'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { useSettings } from '../hooks/useSettings'
import { useCustomers } from '../hooks/useCustomers'
import { useInvoices } from '../hooks/useInvoices'
import type { ItemType } from '../types/invoice'
import { ITEM_TYPES } from '../types/invoice'
import { parseNumber } from '../utils/money'

export function SettingsPage() {
  const { settings, setSettings } = useSettings()
  const { customers } = useCustomers()
  const { invoices, payments } = useInvoices()

  const [exchangeRateInput, setExchangeRateInput] = useState(String(settings.exchangeRate / 1000))
  const [surchargeInputs, setSurchargeInputs] = useState<Record<ItemType, string>>(() => {
    const result = {} as Record<ItemType, string>
    for (const type of ITEM_TYPES) {
      result[type] = String(settings.surcharges[type] / 1000)
    }
    return result
  })
  const [itemCostInputs, setItemCostInputs] = useState<Record<ItemType, string>>(() => {
    const result = {} as Record<ItemType, string>
    for (const type of ITEM_TYPES) result[type] = String(settings.itemOperatingCosts[type])
    return result
  })
  const [saved, setSaved] = useState(false)
  const [apiUrl, setApiUrl] = useState(settings.apiUrl)

  const updateSurcharge = (type: ItemType, value: string) => {
    setSurchargeInputs((prev) => ({ ...prev, [type]: value }))
  }

  const handleSave = () => {
    const exchangeRate = Math.max(0, Math.round(parseNumber(exchangeRateInput) * 1000))
    const surcharges = {} as Record<ItemType, number>
    const itemOperatingCosts = {} as Record<ItemType, number>
    for (const type of ITEM_TYPES) {
      surcharges[type] = Math.max(0, Math.round(parseNumber(surchargeInputs[type]) * 1000))
      itemOperatingCosts[type] = Math.max(0, Math.round(parseNumber(itemCostInputs[type])))
    }
    setSettings({ exchangeRate, surcharges, itemOperatingCosts, apiUrl: apiUrl.trim() })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <PageHeader title="Cài đặt" subtitle="Tỷ giá và phụ phí theo loại hàng" />

      <section className="form-card">
        <div className="form-card-heading">
          <h2>Tỷ giá</h2>
        </div>
        <label className="field">
          <span className="field-label">Tỷ giá NDT → VNĐ</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={exchangeRateInput}
            onChange={(event) => setExchangeRateInput(event.target.value)}
            placeholder="3,9"
          />
          <span className="field-help">Ví dụ: 3,9 = 3.900 VNĐ (giá trị hiện tại: {settings.exchangeRate.toLocaleString('vi-VN')}đ)</span>
        </label>
      </section>

      <section className="form-card local-storage-card">
        <div className="form-card-heading"><h2>Bộ nhớ thử nghiệm trên máy</h2><span className="status-pill">Đang hoạt động</span></div>
        <p>Dữ liệu được lưu cục bộ trong trình duyệt này, nên bạn có thể thử toàn bộ chức năng trước khi kết nối Google Sheets.</p>
        <div className="storage-counts"><span>{customers.length} khách hàng</span><span>{invoices.length} hóa đơn</span><span>{payments.length} giao dịch</span></div>
        <span className="field-help">Không xóa dữ liệu trình duyệt hoặc dùng chế độ ẩn danh nếu muốn giữ lại dữ liệu test.</span>
      </section>

      <section className="form-card">
        <div className="form-card-heading"><h2>Google Sheets</h2></div>
        <label className="field">
          <span className="field-label">Google Apps Script API URL</span>
          <input inputMode="url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
          <span className="field-help">{apiUrl ? 'Đã cấu hình URL. Dữ liệu hiện được lưu cục bộ cho đến khi API Apps Script được triển khai.' : 'Chưa kết nối — nhập URL Web App Apps Script để cấu hình.'}</span>
        </label>
      </section>

      <section className="form-card">
        <div className="form-card-heading">
          <h2>Phụ phí theo loại hàng</h2>
        </div>
        <div className="surcharge-list">
          {ITEM_TYPES.map((type) => (
            <label className="field" key={type}>
              <span className="field-label">{type.toUpperCase()}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={surchargeInputs[type]}
                onChange={(event) => updateSurcharge(type, event.target.value)}
                placeholder="0"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="form-card">
        <div className="form-card-heading"><h2>Tiền cửu theo loại hàng</h2></div>
        <p className="field-help settings-intro">Khoản này được trừ vào lợi nhuận cho mỗi đơn vị hàng và được chốt theo từng hóa đơn.</p>
        <div className="surcharge-list">
          {ITEM_TYPES.map((type) => <label className="field" key={type}><span className="field-label">{type.toUpperCase()} (VNĐ / đơn vị)</span><input type="number" inputMode="numeric" min={0} value={itemCostInputs[type]} onChange={(event) => setItemCostInputs(previous => ({ ...previous, [type]: event.target.value }))} /></label>)}
        </div>
      </section>

      {saved && (
        <div className="success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Đã lưu cài đặt</span>
        </div>
      )}

      <button type="button" className="primary-button" onClick={handleSave}>
        Lưu cài đặt
      </button>
    </>
  )
}
