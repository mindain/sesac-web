import type { FunnelStage } from '../utils/ecomProcessing'
import { formatNumber, formatRate } from '../utils/format'
import './FunnelChart.css'

interface Props {
  stages: FunnelStage[]
}

// 조회가 장바구니의 38배라 막대 길이를 건수에 그대로 비례시키면
// 뒤 두 단계가 선처럼 보인다. 그게 이 데이터의 사실이므로 길이는 비례로 두되,
// 건수와 전환율을 막대 밖에 적어 읽을 수 있게 한다.
export default function FunnelChart({ stages }: Props) {
  const max = Math.max(1, ...stages.map((s) => s.count))

  return (
    <div className="block">
      <h2>구매 전환 퍼널</h2>
      <p className="block-desc">조회 → 장바구니 → 구매, 선택한 기간의 이벤트 건수</p>

      <div className="funnel">
        {stages.map((s, i) => (
          <div key={s.stage} className="funnel-stage">
            <div className="funnel-head">
              <span className="funnel-name">{s.stage}</span>
              <span className="funnel-count num">{formatNumber(s.count)}건</span>
            </div>
            <div className="funnel-track">
              <div
                className="funnel-bar"
                style={{ width: `${Math.max((s.count / max) * 100, 0.4)}%` }}
              />
            </div>
            {i > 0 && s.stepRate !== null && (
              <div className="funnel-step num">
                직전 단계 대비 <strong>{formatRate(s.stepRate)}</strong>
                {i === stages.length - 1 && <span> · 조회 대비 {formatRate(s.totalRate)}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="caption">
        같은 방문자가 여러 번 조회하면 여러 건으로 집계되는 이벤트 단위 전환율입니다. 장바구니를 거치지 않은
        구매도 구매 단계에 포함됩니다.
      </p>
    </div>
  )
}
