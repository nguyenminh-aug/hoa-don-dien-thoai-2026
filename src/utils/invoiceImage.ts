import type { Invoice } from '../types/invoice'
import { formatVnd } from './money'

const WIDTH = 1080
const PADDING = 64
const LINE_HEIGHT = 46

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (context.measureText(candidate).width > maxWidth && current) { lines.push(current); current = word } else current = candidate
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export async function createInvoiceImage(invoice: Invoice): Promise<Blob> {
  const measureCanvas = document.createElement('canvas'); const measure = measureCanvas.getContext('2d')!
  measure.font = '600 30px Arial'
  const itemLines = invoice.items.map(item => wrapText(measure, item.productName, 420))
  const height = 330 + itemLines.reduce((sum, lines) => sum + Math.max(LINE_HEIGHT, lines.length * 36) + 34, 0) + 334
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = height
  const context = canvas.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0, 0, WIDTH, height)
  context.fillStyle = '#2563eb'; context.fillRect(0, 0, WIDTH, 190)
  context.fillStyle = '#ffffff'; context.font = '700 50px Arial'; context.fillText('HÓA ĐƠN', PADDING, 78)
  context.font = '400 25px Arial'; context.fillText(`Khách hàng: ${invoice.customerName}`, PADDING, 124)
  context.fillText(`Ngày: ${invoice.invoiceDate}`, PADDING, 160)
  context.fillStyle = '#172033'; context.font = '700 30px Arial'; context.fillText('Mặt hàng', PADDING, 250)
  context.fillText('SL', 600, 250); context.fillText('Đơn giá', 690, 250); context.textAlign = 'right'; context.fillText('Thành tiền', WIDTH - PADDING, 250); context.textAlign = 'left'
  context.strokeStyle = '#dce3ee'; context.lineWidth = 2; context.beginPath(); context.moveTo(PADDING, 275); context.lineTo(WIDTH-PADDING,275); context.stroke()
  let y = 320
  invoice.items.forEach((item, index) => {
    const lines = itemLines[index]; context.fillStyle = '#172033'; context.font = '600 30px Arial'; lines.forEach((line, lineIndex) => context.fillText(line, PADDING, y + lineIndex * 36))
    context.font = '400 27px Arial'; context.fillText(String(item.quantity), 610, y); context.fillText(formatVnd(item.unitPrice), 690, y); context.textAlign = 'right'; context.font = '700 27px Arial'; context.fillText(formatVnd(item.subtotal), WIDTH-PADDING, y); context.textAlign = 'left'
    y += Math.max(LINE_HEIGHT, lines.length * 36) + 34; context.strokeStyle = '#eef2f7'; context.beginPath(); context.moveTo(PADDING,y-16); context.lineTo(WIDTH-PADDING,y-16); context.stroke()
  })
  const totalQuantity = invoice.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalRows = [['Tổng số lượng', `${totalQuantity} đôi`], ['Tổng tiền hàng', formatVnd(invoice.subtotal)], ['Đặt cọc', `-${formatVnd(invoice.deposit)}`], ['Còn phải thanh toán', formatVnd(invoice.remaining)]]
  y += 20; totalRows.forEach(([label, value], index) => { const isRemaining = index === totalRows.length - 1; context.fillStyle = isRemaining ? '#166534' : '#475569'; context.font = isRemaining ? '700 34px Arial' : '400 29px Arial'; context.fillText(label, PADDING, y); context.textAlign = 'right'; context.fillText(value, WIDTH-PADDING, y); context.textAlign = 'left'; y += 64 })
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không thể tạo ảnh')), 'image/png'))
}

export async function exportInvoiceImage(invoice: Invoice): Promise<'shared' | 'downloaded'> {
  const blob = await createInvoiceImage(invoice); const file = new File([blob], `hoa-don-${invoice.invoiceId}.png`, { type: 'image/png' })
  if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title: 'Hóa đơn', files: [file] }); return 'shared' }
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url); return 'downloaded'
}
