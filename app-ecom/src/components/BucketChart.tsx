import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BucketRow } from '../utils/ecomProcessing'
import type { BucketTotal } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  rows: BucketRow[]
  totals: BucketTotal[]
}

function BucketTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const row: BucketRow = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{row.label} 방문</div>
      <div className="tt-row">
        <span>구매 전환율</span>
        <span className="num">{formatRate(row.rate)}</span>
      </div>
      <div className="tt-row">
        <span>활동 방문자-일</span>
        <span className="num">{formatNumber(row.active)}</span>
      </div>
      <div className="tt-row">
        <span>구매 방문자-일</span>
        <span className="num">{formatNumber(row.buyers)}</span>
      </div>
    </div>
  )
}

export default function BucketChart({ rows, totals }: Props) {
  const data = rows.map((r) => ({ ...r, ratePct: r.rate * 100 }))
  const totalsText = totals
    .map((t) => `${t.label} ${formatRate(t.rate)}`)
    .join(' · ')

  return (
    <div className="block">
      <h2>방문 빈도별 구매 전환율</h2>
      <p className="block-desc">
        전체 기간 이벤트 수로 방문자를 네 집단으로 나눈 뒤, 선택한 기간의 전환율을 비교합니다
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<BucketTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
          <Bar dataKey="ratePct" name="구매 전환율" radius={[6, 6, 0, 0]} barSize={56}>
            {data.map((row, i) => (
              <Cell
                key={row.label}
                fill="var(--primary-normal)"
                opacity={0.4 + (i / Math.max(1, data.length - 1)) * 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="caption">
        방문자 집단은 <strong>전체 기간</strong> 이벤트 수로 한 번 정해지며, 기간 필터를 좁혀도 소속은 바뀌지
        않습니다. 여기서 세는 단위는 방문자-일이라 여러 날 방문한 사람은 날짜별로 중복 집계됩니다. 전체 기간을
        순 방문자로 집계하면 {totalsText} 입니다.
      </p>
    </div>
  )
}
