import type { StatSummary } from '../utils/dataProcessing'
import { formatCount, formatEok, formatPercent, formatPyeongPrice } from '../utils/format'
import './StatCards.css'

interface Props {
  gu: string
  stats: StatSummary
}

export default function StatCards({ gu, stats }: Props) {
  const momUp = stats.momChangeRatio !== null && stats.momChangeRatio > 0
  const momDown = stats.momChangeRatio !== null && stats.momChangeRatio < 0

  return (
    <div className="stat-cards">
      <div className="card stat-card">
        <span className="stat-k">{gu} 평균 거래가</span>
        <span className="stat-v num">{stats.avgPrice !== null ? formatEok(stats.avgPrice) : '-'}</span>
      </div>
      <div className="card stat-card">
        <span className="stat-k">전월 대비</span>
        <span
          className="stat-v num"
          style={{
            color: momUp ? 'var(--primary-normal)' : momDown ? 'var(--label-alternative)' : 'var(--label-normal)'
          }}
        >
          {stats.momChangeRatio !== null ? formatPercent(stats.momChangeRatio) : '-'}
        </span>
      </div>
      <div className="card stat-card">
        <span className="stat-k">거래 건수</span>
        <span className="stat-v num">{formatCount(stats.count)}</span>
      </div>
      <div className="card stat-card">
        <span className="stat-k">평당가</span>
        <span className="stat-v num">
          {stats.avgPyeongPrice !== null ? formatPyeongPrice(stats.avgPyeongPrice) : '-'}
        </span>
      </div>
    </div>
  )
}
