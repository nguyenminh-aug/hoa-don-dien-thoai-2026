import type { Invoice } from '../types/invoice'
import { formatVnd } from './money'
import { groupInvoicePackages } from './invoicePackages'

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
  const packages = groupInvoicePackages(invoice.items).map(pack => ({ ...pack, lines: pack.items.map(item => wrapText(measure, item.productName, 330)) }))
  const height = 240 + packages.reduce((sum, pack) => sum + 190 + pack.lines.reduce((rows, lines) => rows + Math.max(LINE_HEIGHT, lines.length * 36) + 34, 0), 0) + 360
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = height
  const context = canvas.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0, 0, WIDTH, height)
  context.fillStyle = '#2563eb'; context.fillRect(0, 0, WIDTH, 190)
  context.fillStyle = '#ffffff'; context.font = '700 50px Arial'; context.fillText('HÓA ĐƠN', PADDING, 78)
  context.font = '400 25px Arial'; context.fillText('Khách hàng: ' + invoice.customerName, PADDING, 124)
  context.fillText('Ngày: ' + invoice.invoiceDate, PADDING, 160)
  let y = 240
  const rightText = (text: string, x: number, top: number) => { context.textAlign = 'right'; context.fillText(text, x, top); context.textAlign = 'left' }
  for (const pack of packages) {
    context.fillStyle = '#173b77'; context.font = '700 32px Arial'; context.fillText('Kiện ' + pack.number, PADDING, y); y += 48
    context.fillStyle = '#475569'; context.font = '700 25px Arial'
    context.fillText('Mã hàng', PADDING, y); context.fillText('Loại', 425, y); rightText('SL', 560, y); rightText('Giá bán', 770, y); rightText('Thành tiền', WIDTH - PADDING, y); y += 48
    pack.items.forEach((item, index) => {
      const lines = pack.lines[index]; context.fillStyle = '#172033'; context.font = '600 30px Arial'
      lines.forEach((line, lineIndex) => context.fillText(line, PADDING, y + lineIndex * 36))
      context.font = '400 24px Arial'; context.fillText(item.itemType.toUpperCase(), 425, y); rightText(String(item.quantity), 560, y); rightText(formatVnd(item.unitPrice), 770, y); rightText(formatVnd(item.subtotal), WIDTH - PADDING, y)
      y += Math.max(LINE_HEIGHT, lines.length * 36) + 34
      context.strokeStyle = '#eef2f7'; context.beginPath(); context.moveTo(PADDING, y - 40); context.lineTo(WIDTH - PADDING, y - 40); context.stroke()
    })
    context.fillStyle = '#173b77'; context.font = '700 27px Arial'
    context.fillText('Tổng kiện ' + pack.number + ': ' + pack.quantity + ' đôi', PADDING, y)
    rightText(formatVnd(pack.items.reduce((sum, item) => sum + item.subtotal, 0)), WIDTH - PADDING, y)
    y += 94
  }
  const totalQuantity = invoice.items.reduce((sum, item) => sum + item.quantity, 0)
  const isCod = invoice.paymentMethod === 'cod'
  const totalRows = [
    ['Tổng số lượng', `${totalQuantity} đôi`],
    ['Tổng tiền hàng', formatVnd(invoice.subtotal)],
    ['Đặt cọc', `-${formatVnd(invoice.deposit)}`],
    ...(isCod ? [['COD cần thanh toán khi giao', formatVnd(invoice.subtotal)]] : [['Còn phải thanh toán', formatVnd(invoice.remaining)]]),
  ]
  y += 20; totalRows.forEach(([label, value], index) => { const isRemaining = index === totalRows.length - 1; context.fillStyle = isRemaining ? '#166534' : '#475569'; context.font = isRemaining ? '700 34px Arial' : '400 29px Arial'; context.fillText(label, PADDING, y); context.textAlign = 'right'; context.fillText(value, WIDTH-PADDING, y); context.textAlign = 'left'; y += 64 })
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không thể tạo ảnh')), 'image/png'))
}

export async function exportInvoiceImage(invoice: Invoice): Promise<'shared' | 'downloaded'> {
  const blob = await createInvoiceImage(invoice); const file = new File([blob], `hoa-don-${invoice.invoiceId}.png`, { type: 'image/png' })
  if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title: 'Hóa đơn', files: [file] }); return 'shared' }
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url); return 'downloaded'
}
