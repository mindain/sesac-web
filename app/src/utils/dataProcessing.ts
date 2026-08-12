import type { MonthlyJson, MonthlyPoint, Transaction } from '../types/data'
import { daysToYm } from './format'

export interface Filters {
  budgetMin: number
  budgetMax: number
  areaMin: number // m2
  areaMax: number // m2
}

export function filterTransactions(transactions: Transaction[], f: Filters): Transaction[] {
  return transactions.filter(
    (t) =>
      t.price >= f.budgetMin &&
      t.price <= f.budgetMax &&
      t.areaM2 >= f.areaMin &&
      t.areaM2 <= f.areaMax
  )
}

export interface StatSummary {
  avgPrice: number | null // 만원
  momChangeRatio: number | null // 전월대비, ratio (0.023 = +2.3%)
  count: number
  avgPyeongPrice: number | null // 만원/평
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function computeStatSummary(guTransactions: Transaction[], monthlySeries: MonthlyPoint[]): StatSummary {
  const avgPrice = avg(guTransactions.map((t) => t.price))
  const avgPyeongPrice = avg(guTransactions.map((t) => t.price / t.areaPyeong))

  // 전월 대비: last two months with data in the (filtered) monthly series
  const withData = monthlySeries.filter((m) => m.count > 0)
  let momChangeRatio: number | null = null
  if (withData.length >= 2) {
    const last = withData[withData.length - 1]
    const prev = withData[withData.length - 2]
    if (prev.avgPrice > 0) {
      momChangeRatio = (last.avgPrice - prev.avgPrice) / prev.avgPrice
    }
  }

  return {
    avgPrice,
    momChangeRatio,
    count: guTransactions.length,
    avgPyeongPrice
  }
}

// Builds a 12-point (per meta.months) monthly series from a set of already-filtered
// transactions (budget/area filters applied, gu NOT applied here — caller passes the
// gu-restricted subset). Months without any matching transaction get count 0 and a
// null avgPrice so charts can render a gap.
export function computeMonthlySeriesFromTransactions(
  transactions: Transaction[],
  months: string[]
): MonthlyPoint[] {
  const buckets = new Map<string, { prices: number[]; pyeongPrices: number[] }>()
  for (const ym of months) buckets.set(ym, { prices: [], pyeongPrices: [] })

  for (const t of transactions) {
    const ym = daysToYm(t.dateDays)
    const bucket = buckets.get(ym)
    if (!bucket) continue
    bucket.prices.push(t.price)
    bucket.pyeongPrices.push(t.price / t.areaPyeong)
  }

  return months.map((ym) => {
    const b = buckets.get(ym)!
    const count = b.prices.length
    if (count === 0) {
      return { ym, avgPrice: 0, avgPyeong: 0, count: 0, medianPrice: 0 }
    }
    const sorted = [...b.prices].sort((a, c) => a - c)
    const mid = Math.floor(sorted.length / 2)
    const medianPrice = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    const avgPrice = b.prices.reduce((a, c) => a + c, 0) / count
    const avgPyeong = b.pyeongPrices.reduce((a, c) => a + c, 0) / count
    return { ym, avgPrice, avgPyeong, count, medianPrice }
  })
}

export interface DongRankingEntry {
  dong: string
  avgPyeongPrice: number
  count: number
}

const MIN_SAMPLE_SIZE = 5

export function computeDongRanking(filteredTransactions: Transaction[]): {
  entries: DongRankingEntry[]
  excludedCount: number
} {
  const byDong = new Map<string, number[]>()
  for (const t of filteredTransactions) {
    if (!byDong.has(t.dong)) byDong.set(t.dong, [])
    byDong.get(t.dong)!.push(t.price / t.areaPyeong)
  }

  const all: DongRankingEntry[] = Array.from(byDong.entries()).map(([dong, arr]) => ({
    dong,
    avgPyeongPrice: arr.reduce((a, b) => a + b, 0) / arr.length,
    count: arr.length
  }))

  const entries = all.filter((e) => e.count >= MIN_SAMPLE_SIZE)
  const excludedCount = all.length - entries.length

  entries.sort((a, b) => b.avgPyeongPrice - a.avgPyeongPrice)
  return { entries, excludedCount }
}

export function fallbackMonthlyForGu(monthly: MonthlyJson, gu: string): MonthlyPoint[] {
  return monthly.gu[gu] ?? []
}
