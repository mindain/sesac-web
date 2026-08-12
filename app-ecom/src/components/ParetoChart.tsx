import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DeepJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  pareto: DeepJson['pareto']
  category: DeepJson['category']
}

function ParetoTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tt-title num">상위 {label}% 상품</div>
      {payload.map((p: any) => (
        <div key={p.name} className="tt-row">
          <span>
            <span className="tt-dot" style={{ background: p.color, display: 'inline-block' }} />
            {p.name}
          </span>
          <span className="num">{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function ParetoChart({ pareto, category }: Props) {
  const data = pareto.views.map((v, i) => ({
    pct: v.topPct * 100,
    viewShare: v.share * 100,
    buyShare: pareto.buys[i].share * 100
  }))
  const top1 = data[0]

  return (
    <div className="block">
      <h2>매출은 어디에 쏠려 있는가</h2>
      <p className="block-desc">
        상위 몇 %의 상품이 조회와 구매의 몇 %를 가져가는지 (조회된 상품 {formatNumber(pareto.viewItems)}개 중)
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis
            dataKey="pct"
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ParetoTooltip />} />
          <Line
            type="monotone"
            dataKey="viewShare"
            name="조회 점유"
            stroke="var(--label-alternative)"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="buyShare"
            name="구매 점유"
            stroke="var(--primary-normal)"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="caption">
        <strong>
          조회는 상위 1% 상품이 {top1.viewShare.toFixed(1)}%를 가져가지만, 구매는 같은 상위 1%가{' '}
          {top1.buyShare.toFixed(1)}%에 그칩니다.
        </strong>{' '}
        인기 상품에 조회가 몰리는 것에 비해 구매는 훨씬 넓게 퍼져 있어, 롱테일 상품이 매출에서 차지하는 몫이 큽니다.
        추천을 인기순으로만 구성하면 놓치는 매출이 크다는 뜻입니다. 조회된 상품은 {formatNumber(pareto.viewItems)}
        개인데 구매까지 간 상품은 {formatNumber(pareto.buyItems)}개뿐입니다.
      </p>

      <h3 className="pareto-h3">카테고리별 구매 전환율 상위 (조회 5,000건 이상 {category.counted}개 중)</h3>
      <div className="pareto-table-wrap">
        <table className="pareto-table">
          <thead>
            <tr>
              <th>카테고리 ID</th>
              <th>조회</th>
              <th>구매</th>
              <th>전환율</th>
            </tr>
          </thead>
          <tbody>
            {category.top.slice(0, 8).map((r) => (
              <tr key={r.category}>
                <td className="num">{r.category}</td>
                <td className="num">{formatNumber(r.views)}</td>
                <td className="num">{formatNumber(r.buys)}</td>
                <td className="num strong">{formatRate(r.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="caption">
        카테고리 이름은 원본에서 해시 처리되어 ID로만 표시됩니다. 상위 카테고리의 전환율은 전체 평균(0.85%)의 4~5배로,
        같은 쇼핑몰 안에서도 카테고리에 따라 구매 가능성이 크게 다릅니다.
      </p>
    </div>
  )
}
