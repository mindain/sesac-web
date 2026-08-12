import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import type { DongRankingEntry } from '../utils/dataProcessing'
import { formatPyeongPrice, formatCount } from '../utils/format'
import './DongRankingChart.css'

interface Props {
  ranking: DongRankingEntry[]
  excludedCount: number
  selectedDong: string | null
  onSelect: (dong: string) => void
}

function RankTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const row: DongRankingEntry = payload[0].payload
  return (
    <div className="trend-tooltip">
      <div className="tt-month num">{row.dong}</div>
      <div className="tt-row">
        <span>평당가</span>
        <span className="num">{formatPyeongPrice(row.avgPyeongPrice)}</span>
      </div>
      <div className="tt-row">
        <span>거래 건수</span>
        <span className="num">{formatCount(row.count)}</span>
      </div>
    </div>
  )
}

function CountLabel(props: any) {
  const { x, y, width, height, value } = props
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dy={4}
      fontSize={11}
      fill="var(--label-alternative)"
      className="num"
    >
      {value}건
    </text>
  )
}

export default function DongRankingChart({ ranking, excludedCount, selectedDong, onSelect }: Props) {
  const height = Math.max(360, ranking.length * 28)

  return (
    <div className="block">
      <h2>중구 동별 평당가 순위</h2>
      <p className="block-desc">평당가(만원) · 막대를 클릭하면 거래 내역 표가 해당 동으로 필터링됩니다 (현재 필터 적용, 다시 클릭 시 해제)</p>

      {ranking.length === 0 ? (
        <div className="gu-ranking-empty">조건에 맞는 거래가 있는 동이 없습니다</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={ranking} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--label-alternative)' }}
              tickFormatter={(v) => Math.round(v).toLocaleString('ko-KR')}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="dong"
              width={72}
              tick={{ fontSize: 12, fill: 'var(--label-normal)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<RankTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
            <Bar dataKey="avgPyeongPrice" radius={[0, 4, 4, 0]} onClick={(d: any) => onSelect(d.dong)} cursor="pointer">
              <LabelList dataKey="count" content={CountLabel} />
              {ranking.map((entry) => (
                <Cell
                  key={entry.dong}
                  fill={entry.dong === selectedDong ? 'var(--primary-normal)' : 'var(--line-normal)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {excludedCount > 0 && (
        <p className="caption">거래 5건 미만인 {excludedCount}개 동은 제외했습니다.</p>
      )}
    </div>
  )
}
