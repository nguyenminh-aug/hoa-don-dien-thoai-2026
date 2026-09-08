export function formatVnd(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('vi-VN')}đ`
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.')
  const result = Number(cleaned)
  return Number.isFinite(result) ? result : 0
}
