import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { MonthlyPoint } from '../types/data'
import { formatEok, formatManwon, formatCount } from '../utils/format'
import './MonthlyTrendChart.css'

interface Props {
  gu: string
  guSeries: MonthlyPoint[]
  seoulSeries: MonthlyPoint[]
}

interface ChartRow {
  ym: string
  guPriceEok: number | null
  seoulPriceEok: number | null
  guCount: number
  guAvgPrice: number
  guMedianPrice: number
  seoulAvgPrice: number
  seoulMedianPrice: number
}

function buildChartData(guSeries: MonthlyPoint[], seoulSeries: MonthlyPoint[]): ChartRow[] {
  const seoulByYm = new Map(seoulSeries.map((m) => [m.ym, m]))
  return guSeries.map((g) => {
    const s = seoulByYm.get(g.ym)
    return {
      ym: g.ym,
      guPriceEok: g.count > 0 ? g.avgPrice / 10000 : null,
      seoulPriceEok: s && s.count > 0 ? s.avgPrice / 10000 : null,
      guCount: g.count,
      guAvgPrice: g.avgPrice,
      guMedianPrice: g.medianPrice,
      seoulAvgPrice: s?.avgPrice ?? 0,
      seoulMedianPrice: s?.medianPrice ?? 0
    }
  })
}

function CustomTooltip({ active, payload, label, gu }: any) {
  if (!active || !payload || !payload.length) return null
  const row: ChartRow = payload[0].payload
  return (
    <div className="trend-tooltip">
      <div className="tt-month num">{label}</div>
      <div className="tt-row">
        <span className="tt-dot" style={{ background: 'var(--primary-normal)' }} />
        <span>{gu}</span>
        <span className="num">{row.guCount > 0 ? formatManwon(row.guAvgPrice) : '거래 없음'}</span>
      </div>
      {row.guCount > 0 && (
        <div className="tt-sub num">중앙값 {formatManwon(row.guMedianPrice)} · {formatCount(row.guCount)}</div>
      )}
      <div className="tt-row">
        <span className="tt-dot" style={{ background: 'var(--label-alternative)' }} />
        <span>서울 평균</span>
        <span className="num">{row.seoulPriceEok !== null ? formatManwon(row.seoulAvgPrice) : '-'}</span>
      </div>
    </div>
  )
}

export default function MonthlyTrendChart({ gu, guSeries, seoulSeries }: Props) {
  const data = buildChartData(guSeries, seoulSeries)
  const maxCount = Math.max(1, ...data.map((d) => d.guCount))

  return (
    <div className="block">
      <h2>월별 가격 추이</h2>
      <p className="block-desc">{gu} vs 서울 전체 평균 (평균 거래가, 억원)</p>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis dataKey="ym" tick={{ fontSize: 12, fill: 'var(--label-alternative)' }} tickLine={false} />
          <YAxis
            yAxisId="price"
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}억`}
          />
          <YAxis yAxisId="count" orientation="right" hide domain={[0, maxCount * 4]} />
          <Tooltip content={<CustomTooltip gu={gu} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="count"
            dataKey="guCount"
            name="거래 건수"
            fill="var(--primary-normal)"
            opacity={0.12}
            barSize={18}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="seoulPriceEok"
            name="서울 전체 평균"
            stroke="var(--label-alternative)"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="guPriceEok"
            name={gu}
            stroke="var(--primary-normal)"
            strokeWidth={3}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="caption">
        12개월 데이터 기준이며 계절성이 반영되지 않았습니다.
      </p>
    </div>
  )
}
