import type {
  BucketsJson,
  DailyJson,
  DeepJson,
  EcomData,
  HourlyJson,
  MetaJson,
  StockJson
} from '../types/ecom'

// URL로 import 해서 Vite가 콘텐츠 해시가 붙은 파일명으로 내보내게 한다.
// 데이터를 갱신했을 때 재방문자가 캐시된 옛 JSON을 새 JS와 함께 받는 사고를 막는다.
import metaUrl from '../data/meta.json?url'
import dailyUrl from '../data/daily.json?url'
import hourlyUrl from '../data/hourly.json?url'
import bucketsUrl from '../data/buckets.json?url'
import deepUrl from '../data/deep.json?url'
import stockUrl from '../data/stock.json?url'

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`데이터를 불러오지 못했습니다: ${label} (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function loadEcomData(): Promise<EcomData> {
  const [meta, daily, hourly, buckets, deep, stock] = await Promise.all([
    fetchJson<MetaJson>(metaUrl, 'meta.json'),
    fetchJson<DailyJson>(dailyUrl, 'daily.json'),
    fetchJson<HourlyJson>(hourlyUrl, 'hourly.json'),
    fetchJson<BucketsJson>(bucketsUrl, 'buckets.json'),
    fetchJson<DeepJson>(deepUrl, 'deep.json'),
    fetchJson<StockJson>(stockUrl, 'stock.json')
  ])
  return { meta, daily, hourly, buckets, deep, stock }
}
