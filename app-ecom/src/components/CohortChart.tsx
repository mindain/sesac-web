import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DeepJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  cohort: DeepJson['cohort']
}

function CohortTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title num">{label} 첫 방문 집단</div>
      <div className="tt-row">
        <span>규모</span>
        <span className="num">{formatNumber(r.size)}명</span>
      </div>
      <div className="tt-row">
        <span>1주 뒤 재방문</span>
        <span className="num">{r.w1 !== null ? `${r.w1.toFixed(2)}%` : '-'}</span>
      </div>
      <div className="tt-row">
        <span>2주 뒤</span>
        <span className="num">{r.w2 !== null ? `${r.w2.toFixed(2)}%` : '-'}</span>
      </div>
      <div className="tt-row">
        <span>4주 뒤</span>
        <span className="num">{r.w4 !== null ? `${r.w4.toFixed(2)}%` : '-'}</span>
      </div>
    </div>
  )
}

export default function CohortChart({ cohort }: Props) {
  // 첫 주는 정의상 100%라 제외하고, 1·2·4주 뒤 재방문율만 코호트별로 늘어놓는다.
  const data = cohort.rows.map((r) => ({
    week: r.week.replace('2015-', ''),
    size: r.size,
    w1: r.retention[1] !== undefined ? r.retention[1] * 100 : null,
    w2: r.retention[2] !== undefined ? r.retention[2] * 100 : null,
    w4: r.retention[4] !== undefined ? r.retention[4] * 100 : null
  }))

  // 첫 코호트(W18)는 관측 시작 주라 규모가 다른 주의 1/10이다.
  // 그 값을 추세의 시작점으로 쓰면 하락폭이 과장되므로 온전한 주차부터 비교한다.
  const withW1 = data.filter((d) => d.w1 !== null)
  const full = withW1.filter((d) => d.size >= 20000)
  const firstW1 = full[0]?.w1 ?? 0
  const firstWeek = full[0]?.week ?? ''
  const lastW1 = full[full.length - 1]?.w1 ?? 0
  const lastWeek = full[full.length - 1]?.week ?? ''
  const partial = withW1.length - full.length

  return (
    <div className="block">
      <h2>다시 오는 사람은 줄고 있는가</h2>
      <p className="block-desc">
        첫 방문 주차별로 묶어, 1주·2주·4주 뒤에 다시 온 비율 (500명 미만 코호트는 제외)
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--label-alternative)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CohortTooltip />} />
          <Line
            type="monotone"
            dataKey="w1"
            name="1주 뒤"
            stroke="var(--primary-normal)"
            strokeWidth={3}
            dot={{ r: 2 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="w2"
            name="2주 뒤"
            stroke="var(--primary-strong)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="w4"
            name="4주 뒤"
            stroke="var(--label-alternative)"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="caption">
        온전히 관측된 주차만 비교하면 1주 뒤 재방문율이 {firstWeek} {firstW1.toFixed(1)}%에서 {lastWeek}{' '}
        {lastW1.toFixed(1)}%로 내려갔습니다. 신규 방문자는 매주 6~8만 명씩 꾸준히 들어오지만 그중 다시 오는 비율은
        계속 낮아지는 중입니다. 앞의 구매 전환율이 재방문 횟수에 크게 의존한다는 점과 겹쳐 보면, 이 지표의 하락이
        매출에 직접 연결됩니다.
        {partial > 0 && (
          <>
            {' '}
            첫 점(W18)은 관측이 시작된 주라 규모가 7,856명으로 다른 주의 10분의 1 수준이며, 그래서 추세의 시작점
            으로 쓰지 않았습니다.
          </>
        )}{' '}
        마지막 주차 코호트는 관측 기간이 짧아 뒤쪽 값이 비어 있습니다.
      </p>
    </div>
  )
}
