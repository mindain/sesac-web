import type { Summary } from '../utils/ecomProcessing'
import { formatCount, formatNumber, formatRate } from '../utils/format'
import './StatCards.css'

interface Props {
  summary: Summary
  days: number
}

export default function StatCards({ summary, days }: Props) {
  const delta =
    summary.buyRateFromView !== null && summary.rawBuyRate !== null
      ? summary.buyRateFromView - summary.rawBuyRate
      : null

  return (
    <div className="stat-cards">
      <div className="card stat-card">
        <span className="stat-k">이벤트</span>
        <span className="stat-v num">{formatNumber(summary.events)}</span>
        <span className="stat-sub num">{days}일 · 봇 제외 후</span>
      </div>
      <div className="card stat-card">
        <span className="stat-k">방문자-일</span>
        <span className="stat-v num">{formatNumber(summary.visitorDays)}</span>
        <span className="stat-sub">여러 날 방문하면 중복 집계</span>
      </div>
      <div className="card stat-card">
        <span className="stat-k">주문</span>
        <span className="stat-v num">{formatCount(summary.orders)}</span>
        <span className="stat-sub num">
          상품 {formatNumber(summary.purchases)}개 · 주문당{' '}
          {summary.orders > 0 ? (summary.purchases / summary.orders).toFixed(2) : '-'}개
        </span>
      </div>
      <div className="card stat-card">
        <span className="stat-k">조회 → 구매 전환율</span>
        <span className="stat-v num" style={{ color: 'var(--primary-normal)' }}>
          {summary.buyRateFromView !== null ? formatRate(summary.buyRateFromView) : '-'}
        </span>
        <span className="stat-sub num">
          {delta !== null && summary.rawBuyRate !== null
            ? `봇 제거 전 ${formatRate(summary.rawBuyRate)}`
            : ''}
        </span>
      </div>
    </div>
  )
}
