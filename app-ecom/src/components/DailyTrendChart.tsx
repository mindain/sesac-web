import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DailyJson, DateRange } from '../types/ecom'
import { formatCompact, formatNumber, formatRate, longDate, shortDate } from '../utils/format'
import './charts.css'

interface Props {
  daily: DailyJson
  range: DateRange
  isDefault: boolean
  onChange: (range: DateRange) => void
  onReset: () => void
  /**
   * Brush는 드래그 이후 자체 상태를 유지해서 startIndex/endIndex를 다시 내려도 되돌아가지 않는다.
   * 초기화할 때만 이 값이 바뀌고, key로 써서 그 순간에만 리마운트시킨다.
   */
  resetKey: number
}

function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title num">{longDate(r.date)}</div>
      <div className="tt-row">
        <span>조회</span>
        <span className="num">{formatNumber(r.view)}건</span>
      </div>
      <div className="tt-row">
        <span>장바구니</span>
        <span className="num">{formatNumber(r.cart)}건</span>
      </div>
      <div className="tt-row">
        <span>구매</span>
        <span className="num">{formatNumber(r.buy)}건</span>
      </div>
      <div className="tt-row">
        <span>조회 → 구매</span>
        <span className="num">{formatRate(r.rate, 3)}</span>
      </div>
    </div>
  )
}

export default function DailyTrendChart({
  daily,
  range,
  isDefault,
  onChange,
  onReset,
  resetKey
}: Props) {
  const data = daily.dates.map((date, i) => ({
    date,
    label: shortDate(date),
    view: daily.view[i],
    cart: daily.addtocart[i],
    buy: daily.transaction[i],
    rate: daily.view[i] > 0 ? daily.transaction[i] / daily.view[i] : 0,
    ratePct: daily.view[i] > 0 ? (daily.transaction[i] / daily.view[i]) * 100 : 0
  }))

  const days = range.to - range.from + 1
  const sel = data.slice(range.from, range.to + 1)
  const selView = sel.reduce((a, d) => a + d.view, 0)
  const selBuy = sel.reduce((a, d) => a + d.buy, 0)

  return (
    <div className="block">
      <div className="trend-head">
        <div>
          <h2>일별 추이</h2>
          <p className="block-desc">
            막대는 조회 건수, 선은 조회 → 구매 전환율입니다. 아래 회색 띠를 끌어 기간을 좁히면 이 페이지 위쪽
            블록이 모두 그 기간으로 다시 계산됩니다
          </p>
        </div>
        <button type="button" className="trend-reset" onClick={onReset} disabled={isDefault}>
          전체 기간
        </button>
      </div>

      <div className="trend-selected num">
        {longDate(daily.dates[range.from])} ~ {longDate(daily.dates[range.to])} · {days}일 · 조회{' '}
        {formatCompact(selView)}건 · 구매 {formatNumber(selBuy)}건 ·{' '}
        <strong>{formatRate(selView > 0 ? selBuy / selView : 0, 3)}</strong>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--label-alternative)' }}
            tickLine={false}
            interval={13}
          />
          <YAxis
            yAxisId="count"
            tick={{ fontSize: 11, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCompact(v)}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
          />
          <Tooltip content={<TrendTooltip />} />
          <Bar
            yAxisId="count"
            dataKey="view"
            name="조회"
            fill="var(--primary-normal)"
            opacity={0.18}
            barSize={6}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="ratePct"
            name="조회 → 구매"
            stroke="var(--primary-normal)"
            strokeWidth={2}
            dot={false}
          />
          <Brush
            key={resetKey}
            dataKey="label"
            height={26}
            travellerWidth={8}
            startIndex={range.from}
            endIndex={range.to}
            stroke="var(--line-solid)"
            fill="var(--bg-alternative)"
            onChange={(e: any) => {
              if (typeof e?.startIndex === 'number' && typeof e?.endIndex === 'number') {
                onChange({ from: e.startIndex, to: e.endIndex })
              }
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="caption">
        조회량은 주말마다 규칙적으로 내려앉고, 전환율은 표본이 적은 날일수록 크게 튑니다. 하루 단위로 전환율을
        해석할 때는 그날의 조회량(막대 높이)을 함께 봐야 합니다.
      </p>
    </div>
  )
}
