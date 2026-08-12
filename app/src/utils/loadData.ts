import type { MetaJson, MonthlyJson, TransactionsJson, Transaction, DashboardData } from '../types/data'
import { daysToDateStr, m2ToPyeong } from './format'

// Imported as URLs so Vite includes these JSON files in the asset graph and
// emits them with content-hashed filenames (e.g. meta-a1b2c3d4.json). This
// guarantees that whenever the data changes, the fetched URL changes too, so
// a stale cached JSON response can never be paired with a newer JS bundle.
import metaUrl from '../data/meta.json?url'
import monthlyUrl from '../data/monthly.json?url'
import transactionsUrl from '../data/transactions.json?url'

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`데이터를 불러오지 못했습니다: ${label} (${res.status})`)
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
    fetchJson<MetaJson>(metaUrl, 'meta.json'),
    fetchJson<MonthlyJson>(monthlyUrl, 'monthly.json'),
    fetchJson<TransactionsJson>(transactionsUrl, 'transactions.json')
  ])

  const transactions = decodeTransactions(transactionsRaw, meta)

  return { meta, monthly, transactions }
}
