import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DeepJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  leadtime: DeepJson['leadtime']
}

function LeadTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{r.label}</div>
      <div className="tt-row">
        <span>구매자</span>
        <span className="num">{formatNumber(r.count)}명</span>
      </div>
      <div className="tt-row">
        <span>비중</span>
        <span className="num">{formatRate(r.share, 1)}</span>
      </div>
    </div>
  )
}

export default function LeadtimeChart({ leadtime }: Props) {
  const data = leadtime.buckets.map((b) => ({
    ...b,
    share: b.count / leadtime.buyers,
    sharePct: (b.count / leadtime.buyers) * 100
  }))
  const instant = data[0]

  return (
    <div className="block">
      <h2>구매까지 얼마나 걸리는가</h2>
      <p className="block-desc">
        구매자 {formatNumber(leadtime.buyers)}명의 첫 이벤트부터 첫 구매까지 걸린 시간
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--label-alternative)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<LeadTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
          <Bar dataKey="sharePct" fill="var(--primary-normal)" radius={[6, 6, 0, 0]} barSize={48} />
        </BarChart>
      </ResponsiveContainer>

      <p className="caption">
        <strong>{formatRate(instant?.share ?? 0, 1)}가 첫 방문 1시간 이내에 삽니다.</strong> 구매 전 조회 수의
        중앙값은 {leadtime.viewsMedian}건입니다. 이 쇼핑몰의 구매는 오래 비교하는 형태가 아니라 즉시 결정형이며,
        길게 붙잡는 리타게팅보다 첫 방문 순간의 경험이 중요하다는 뜻입니다. 다만 상위 10%는{' '}
        {leadtime.daysP90}일이 걸려, 소수의 장기 고민층도 존재합니다.
      </p>
    </div>
  )
}
