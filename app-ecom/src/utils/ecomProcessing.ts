import type { BucketsJson, DailyJson, DateRange, HourlyJson } from '../types/ecom'

export interface Summary {
  events: number
  visitorDays: number
  purchases: number
  orders: number
  cartRate: number | null
  buyRateFromCart: number | null
  buyRateFromView: number | null
  view: number
  cart: number
  /** 봇 제거 전 같은 기간의 조회→구매 전환율. 정제 효과 비교용 */
  rawBuyRate: number | null
  rawCartRate: number | null
  rawEvents: number
}

function sumRange(arr: number[], { from, to }: DateRange): number {
  let s = 0
  for (let i = from; i <= to; i++) s += arr[i]
  return s
}

export function computeSummary(daily: DailyJson, range: DateRange): Summary {
  const view = sumRange(daily.view, range)
  const cart = sumRange(daily.addtocart, range)
  const purchases = sumRange(daily.transaction, range)
  const rawView = sumRange(daily.rawView, range)
  const rawCart = sumRange(daily.rawAddtocart, range)
  const rawTxn = sumRange(daily.rawTransaction, range)
  return {
    view,
    cart,
    purchases,
    orders: sumRange(daily.orders, range),
    events: view + cart + purchases,
    // 날짜별 순 방문자 수의 합이라 여러 날 온 사람은 중복 계산된다. 그래서 이름이 방문자-일이다.
    visitorDays: sumRange(daily.visitors, range),
    cartRate: view > 0 ? cart / view : null,
    buyRateFromCart: cart > 0 ? purchases / cart : null,
    buyRateFromView: view > 0 ? purchases / view : null,
    rawEvents: rawView + rawCart + rawTxn,
    rawCartRate: rawView > 0 ? rawCart / rawView : null,
    rawBuyRate: rawView > 0 ? rawTxn / rawView : null
  }
}

export interface FunnelStage {
  stage: string
  count: number
  /** 직전 단계 대비 전환율 */
  stepRate: number | null
  /** 조회 대비 전환율 */
  totalRate: number
}

export function computeFunnel(summary: Summary): FunnelStage[] {
  const { view, cart, purchases } = summary
  return [
    { stage: '조회', count: view, stepRate: null, totalRate: 1 },
    {
      stage: '장바구니',
      count: cart,
      stepRate: view > 0 ? cart / view : null,
      totalRate: view > 0 ? cart / view : 0
    },
    {
      stage: '구매',
      count: purchases,
      stepRate: cart > 0 ? purchases / cart : null,
      totalRate: view > 0 ? purchases / view : 0
    }
  ]
}

export interface BucketRow {
  label: string
  active: number
  buyers: number
  rate: number
}

export function computeBuckets(buckets: BucketsJson, range: DateRange): BucketRow[] {
  return buckets.labels.map((label, i) => {
    const active = sumRange(buckets.active[i], range)
    const buyers = sumRange(buckets.buyers[i], range)
    return { label, active, buyers, rate: active > 0 ? buyers / active : 0 }
  })
}

export interface HourRow {
  hour: number
  hourLabel: string
  /** 각 계열을 자기 합계로 나눈 비율. 규모가 100배 차이 나는 세 계열을 한 축에서 비교하려고. */
  view: number
  cart: number
  purchase: number
  /** 툴팁용 원본 건수 */
  viewCount: number
  cartCount: number
  purchaseCount: number
}

export function computeHourly(hourly: HourlyJson, range: DateRange): HourRow[] {
  const totals = [0, 1, 2].map((ev) => {
    const byHour = new Array(24).fill(0) as number[]
    for (let d = range.from; d <= range.to; d++) {
      const day = hourly.cube[ev][d]
      for (let h = 0; h < 24; h++) byHour[h] += day[h]
    }
    return byHour
  })

  const sums = totals.map((byHour) => byHour.reduce((a, b) => a + b, 0))

  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    hourLabel: `${h}시`,
    view: sums[0] > 0 ? totals[0][h] / sums[0] : 0,
    cart: sums[1] > 0 ? totals[1][h] / sums[1] : 0,
    purchase: sums[2] > 0 ? totals[2][h] / sums[2] : 0,
    viewCount: totals[0][h],
    cartCount: totals[1][h],
    purchaseCount: totals[2][h]
  }))
}
