export interface BucketTotal {
  label: string
  visitors: number
  buyers: number
  rate: number
}

export interface Totals {
  events: number
  view: number
  addtocart: number
  transaction: number
  cartRate: number
  buyRate: number
  visitors?: number
  orders?: number
}

export interface MetaJson {
  source: string
  sourceUrl: string
  author: string
  license: string
  dateFrom: string
  dateTo: string
  timezone: string
  generatedAt: string
  botRule: string
  bot: { visitors: number; events: number; eventShare: number }
  raw: Totals
  clean: Totals
  bucketTotals: BucketTotal[]
}

export interface DailyJson {
  dates: string[]
  view: number[]
  addtocart: number[]
  transaction: number[]
  visitors: number[]
  orders: number[]
  rawView: number[]
  rawAddtocart: number[]
  rawTransaction: number[]
}

export interface HourlyJson {
  dates: string[]
  /** [이벤트][날짜][시(0-23)] */
  cube: number[][][]
}

export interface BucketsJson {
  dates: string[]
  labels: string[]
  /** [버킷][날짜] — 그날 활동한 방문자 수 */
  active: number[][]
  /** [버킷][날짜] — 그날 구매한 방문자 수 */
  buyers: number[][]
}

export interface DeepJson {
  session: {
    total: number
    perVisitor: number
    eventsMedian: number
    eventsMean: number
    eventsP90: number
    minutesMedian: number
    minutesP90: number
    cartRate: number
    buyRate: number
    byOrdinal: { ordinal: number; sessions: number; buys: number; rate: number }[]
  }
  leadtime: {
    buyers: number
    buckets: { label: string; count: number }[]
    daysMedian: number
    daysP90: number
    viewsMedian: number
    viewsP90: number
  }
  cohort: {
    maxOffset: number
    rows: { week: string; size: number; retention: number[] }[]
  }
  pareto: {
    viewItems: number
    buyItems: number
    views: { topPct: number; share: number; items: number }[]
    buys: { topPct: number; share: number; items: number }[]
  }
  category: {
    counted: number
    top: { category: string; views: number; buys: number; rate: number }[]
    bottom: { category: string; views: number; buys: number; rate: number }[]
  }
  weekday: {
    labels: string[]
    view: number[]
    addtocart: number[]
    transaction: number[]
  }
}

export interface StockJson {
  records: number
  items: number
  note: string
  states: {
    state: string
    views: number
    carts: number
    viewShare: number
    viewToCart: number
    cartToBuy: number
    cartedPairs: number
    boughtPairs: number
  }[]
}

export interface EcomData {
  meta: MetaJson
  daily: DailyJson
  hourly: HourlyJson
  buckets: BucketsJson
  deep: DeepJson
  stock: StockJson
}

export interface DateRange {
  /** dates 배열의 인덱스 (양끝 포함) */
  from: number
  to: number
}
