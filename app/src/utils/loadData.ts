import type { MetaJson, MonthlyJson, TransactionsJson, Transaction, DashboardData } from '../types/data'
import { daysToDateStr, m2ToPyeong } from './format'

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}data/${path}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`데이터를 불러오지 못했습니다: ${path} (${res.status})`)
  }
  return res.json() as Promise<T>
}

function decodeTransactions(raw: TransactionsJson, meta: MetaJson): Transaction[] {
  const n = raw.gu.length
  const out: Transaction[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const areaM2 = raw.area[i] / 10
    out[i] = {
      gu: meta.gu[raw.gu[i]],
      dong: meta.dong[raw.dong[i]],
      complex: meta.complex[raw.complex[i]],
      dateDays: raw.date[i],
      dateStr: daysToDateStr(raw.date[i]),
      areaM2,
      areaPyeong: m2ToPyeong(areaM2),
      floor: raw.floor[i],
      price: raw.price[i]
    }
  }
  return out
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [meta, monthly, transactionsRaw] = await Promise.all([
    fetchJson<MetaJson>('meta.json'),
    fetchJson<MonthlyJson>('monthly.json'),
    fetchJson<TransactionsJson>('transactions.json')
  ])

  const transactions = decodeTransactions(transactionsRaw, meta)

  return { meta, monthly, transactions }
}
