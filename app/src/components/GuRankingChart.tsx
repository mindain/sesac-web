import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { GuRankingEntry } from '../utils/dataProcessing'
import { formatPyeongPrice, formatCount } from '../utils/format'
import './GuRankingChart.css'

interface Props {
  ranking: GuRankingEntry[]
  selectedGu: string
  onSelect: (gu: string) => void
}

function RankTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const row: GuRankingEntry = payload[0].payload
  return (
    <div className="trend-tooltip">
      <div className="tt-month num">{row.gu}</div>
      <div className="tt-row">
        <span>평당가</span>
        <span className="num">{row.count > 0 ? formatPyeongPrice(row.avgPyeongPrice) : '거래 없음'}</span>
      </div>
      <div className="tt-row">
        <span>거래 건수</span>
        <span className="num">{formatCount(row.count)}</span>
      </div>
    </div>
  )
}

export default function GuRankingChart({ ranking, selectedGu, onSelect }: Props) {
  const height = Math.max(360, ranking.length * 26)
  return (
    <div className="block">
      <h2>구별 평당가 순위</h2>
      <p className="block-desc">막대를 클릭하면 해당 구로 전환됩니다 (현재 필터 적용)</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={ranking} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--label-alternative)' }}
            tickFormatter={(v) => `${Math.round(v / 1000)}천`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="gu"
            width={64}
            tick={{ fontSize: 12, fill: 'var(--label-normal)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<RankTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
          <Bar dataKey="avgPyeongPrice" radius={[0, 4, 4, 0]} onClick={(d: any) => onSelect(d.gu)} cursor="pointer">
            {ranking.map((entry) => (
              <Cell
                key={entry.gu}
                fill={entry.gu === selectedGu ? 'var(--primary-normal)' : 'var(--line-normal)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
