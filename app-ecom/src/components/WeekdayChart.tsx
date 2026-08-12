import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DeepJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  weekday: DeepJson['weekday']
}

function WeekdayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{r.day}요일</div>
      <div className="tt-row">
        <span>조회 → 구매</span>
        <span className="num">{formatRate(r.rate, 3)}</span>
      </div>
      <div className="tt-row">
        <span>조회</span>
        <span className="num">{formatNumber(r.views)}건</span>
      </div>
      <div className="tt-row">
        <span>구매</span>
        <span className="num">{formatNumber(r.buys)}건</span>
      </div>
    </div>
  )
}

export default function WeekdayChart({ weekday }: Props) {
  const data = weekday.labels.map((day, i) => {
    const views = weekday.view[i]
    const buys = weekday.transaction[i]
    return { day, views, buys, rate: buys / views, ratePct: (buys / views) * 100, weekend: i >= 5 }
  })
  const best = [...data].sort((a, b) => b.rate - a.rate)[0]
  const worst = [...data].sort((a, b) => a.rate - b.rate)[0]

  return (
    <div className="block">
      <h2>요일별 구매 전환율</h2>
      <p className="block-desc">조회 대비 구매 비율. 주말은 옅게 표시했습니다 (UTC 기준 요일)</p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--label-alternative)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
          />
          <Tooltip content={<WeekdayTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
          <Bar dataKey="ratePct" radius={[6, 6, 0, 0]} barSize={44}>
            {data.map((row) => (
              <Cell key={row.day} fill="var(--primary-normal)" opacity={row.weekend ? 0.35 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="caption">
        {best.day}요일이 {formatRate(best.rate, 3)}로 가장 높고 {worst.day}요일이 {formatRate(worst.rate, 3)}로 가장
        낮습니다. <strong>주말에는 조회가 줄어드는 것보다 구매가 더 크게 줄어듭니다</strong> — 토·일 전환율이
        평일의 3분의 2 수준입니다. 주중 근무시간대 구매가 많은 상품군이거나, 주말 방문이 구경 목적에 가깝다는
        해석이 가능합니다.
      </p>
    </div>
  )
}
