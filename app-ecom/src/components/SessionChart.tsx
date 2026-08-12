import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DeepJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  session: DeepJson['session']
}

function SessionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{r.label} 방문</div>
      <div className="tt-row">
        <span>구매 발생률</span>
        <span className="num">{formatRate(r.rate)}</span>
      </div>
      <div className="tt-row">
        <span>세션</span>
        <span className="num">{formatNumber(r.sessions)}개</span>
      </div>
      <div className="tt-row">
        <span>구매 세션</span>
        <span className="num">{formatNumber(r.buys)}개</span>
      </div>
    </div>
  )
}

export default function SessionChart({ session }: Props) {
  const data = session.byOrdinal.map((r) => ({
    ...r,
    label: r.ordinal >= 10 ? '10+' : `${r.ordinal}`,
    ratePct: r.rate * 100
  }))
  const first = session.byOrdinal[0]
  const last = session.byOrdinal[session.byOrdinal.length - 1]
  const multiple = first && last ? last.rate / first.rate : 0

  return (
    <div className="block">
      <h2>몇 번째 방문에서 사는가</h2>
      <p className="block-desc">
        30분 이상 활동이 없으면 다른 방문으로 끊었습니다. 방문자의 n번째 방문에서 구매가 일어난 비율입니다
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--label-alternative)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<SessionTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
          <Bar dataKey="ratePct" radius={[6, 6, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={row.label}
                fill="var(--primary-normal)"
                opacity={0.35 + (i / Math.max(1, data.length - 1)) * 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="caption">
        첫 방문에서는 {formatRate(first?.rate ?? 0)}, 10번째 이상 방문에서는 {formatRate(last?.rate ?? 0)} —{' '}
        <strong>{multiple.toFixed(1)}배 차이</strong>입니다. 전체 세션 {formatNumber(session.total)}개 중{' '}
        {formatNumber(first?.sessions ?? 0)}개(
        {formatRate((first?.sessions ?? 0) / session.total, 1)})가 첫 방문이며, 세션당 이벤트 수의 중앙값은{' '}
        {session.eventsMedian}건, 세션 길이 중앙값은 {session.minutesMedian}분입니다. 대부분의 방문이 한 페이지를
        보고 끝납니다.
      </p>
    </div>
  )
}
