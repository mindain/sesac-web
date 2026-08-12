export function formatEok(manwon: number): string {
  // 만원 -> 억 단위 1자리
  const eok = manwon / 10000
  return `${eok.toFixed(1)}억`
}

export function formatManwon(manwon: number): string {
  return `${Math.round(manwon).toLocaleString('ko-KR')}만원`
}

export function formatCount(n: number): string {
  return `${n.toLocaleString('ko-KR')}건`
}

export function formatPyeongPrice(manwonPerPyeong: number): string {
  return `${Math.round(manwonPerPyeong).toLocaleString('ko-KR')}만원/평`
}

export function formatPercent(ratio: number): string {
  const pct = ratio * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function m2ToPyeong(m2: number): number {
  return m2 / 3.305785
}

export function formatArea(m2: number): string {
  const py = m2ToPyeong(m2)
  return `${m2.toFixed(1)}㎡ (${py.toFixed(1)}평)`
}

const DAY_MS = 24 * 60 * 60 * 1000
const BASE_DATE = new Date('2025-07-01T00:00:00')

export function daysToDateStr(days: number): string {
  const d = new Date(BASE_DATE.getTime() + days * DAY_MS)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysToYm(days: number): string {
  const d = new Date(BASE_DATE.getTime() + days * DAY_MS)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}
