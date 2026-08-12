import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HourRow } from '../utils/ecomProcessing'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  rows: HourRow[]
}

function HourTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const row: HourRow = payload[0].payload
  const items = [
    { name: '조회', color: 'var(--label-alternative)', share: row.view, count: row.viewCount },
    { name: '장바구니', color: 'var(--primary-strong)', share: row.cart, count: row.cartCount },
    { name: '구매', color: 'var(--primary-normal)', share: row.purchase, count: row.purchaseCount }
  ]
  return (
    <div className="chart-tooltip">
      <div className="tt-title num">{label} (UTC)</div>
      {items.map((it) => (
        <div key={it.name} className="tt-row">
          <span>
            <span className="tt-dot" style={{ background: it.color, display: 'inline-block' }} />
            {it.name}
          </span>
          <span className="num">
            {formatRate(it.share, 1)} · {formatNumber(it.count)}건
          </span>
        </div>
      ))}
    </div>
  )
}

export default function HourlyChart({ rows }: Props) {
  const data = rows.map((r) => ({
    ...r,
    viewPct: r.view * 100,
    cartPct: r.cart * 100,
    purchasePct: r.purchase * 100
  }))

  return (
    <div className="block">
      <h2>시간대별 활동 분포</h2>
      <p className="block-desc">
        각 이벤트를 자기 합계로 나눈 비율. 규모가 100배 넘게 차이 나는 세 계열을 한 축에서 비교하려고 건수 대신
        비율로 그립니다
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 11, fill: 'var(--label-alternative)' }}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<HourTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="viewPct"
            name="조회"
            stroke="var(--label-alternative)"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cartPct"
            name="장바구니"
            stroke="var(--primary-strong)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="purchasePct"
            name="구매"
            stroke="var(--primary-normal)"
            strokeWidth={3}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="caption">
        시각은 <strong>UTC 기준</strong>입니다. 한국 시간으로 보려면 9시간을 더하세요. 원본 데이터에 사용자
        지역 정보가 없어 현지 시각으로 변환할 수 없습니다.
      </p>
    </div>
  )
}
