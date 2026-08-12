import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StockJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './charts.css'

interface Props {
  stock: StockJson
}

function StockTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="tt-title">{r.state}</div>
      <div className="tt-row">
        <span>조회 → 장바구니</span>
        <span className="num">{formatRate(r.viewToCart, 3)}</span>
      </div>
      <div className="tt-row">
        <span>장바구니 → 구매</span>
        <span className="num">{formatRate(r.cartToBuy)}</span>
      </div>
      <div className="tt-row">
        <span>조회</span>
        <span className="num">{formatNumber(r.views)}건</span>
      </div>
      <div className="tt-row">
        <span>담기</span>
        <span className="num">{formatNumber(r.carts)}건</span>
      </div>
    </div>
  )
}

export default function StockChart({ stock }: Props) {
  const known = stock.states.filter((s) => s.state !== '기록 없음')
  const inStock = known.find((s) => s.state === '재고 있음')
  const out = known.find((s) => s.state === '품절')
  const data = stock.states.map((s) => ({ ...s, v2cPct: s.viewToCart * 100 }))
  const ratio = inStock && out && out.viewToCart > 0 ? inStock.viewToCart / out.viewToCart : 0

  return (
    <div className="block">
      <h2>품절은 어디서 이탈을 만드는가</h2>
      <p className="block-desc">
        상품별 재고 변경 이력 {formatNumber(stock.records)}건을 시간순으로 세워, 각 이벤트 시점에 유효했던 재고
        상태를 붙였습니다
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-solid)" vertical={false} />
          <XAxis dataKey="state" tick={{ fontSize: 12, fill: 'var(--label-alternative)' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--label-alternative)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<StockTooltip />} cursor={{ fill: 'var(--bg-alternative)' }} />
          <Bar dataKey="v2cPct" name="조회 → 장바구니" radius={[6, 6, 0, 0]} barSize={64}>
            {data.map((row) => (
              <Cell
                key={row.state}
                fill="var(--primary-normal)"
                opacity={row.state === '재고 있음' ? 1 : row.state === '품절' ? 0.45 : 0.25}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="stock-conclusion">
        <p>
          품절은 <strong>장바구니에 담기 전에</strong> 이탈을 만듭니다. 재고가 있는 상품은 조회의{' '}
          {formatRate(inStock?.viewToCart ?? 0, 3)}가 장바구니로 가지만 품절 상품은{' '}
          {formatRate(out?.viewToCart ?? 0, 3)}에 그쳐 <strong>{ratio.toFixed(1)}배</strong> 차이가 납니다. 전체
          조회의 {formatRate(out?.viewShare ?? 0, 1)}가 품절 상품에 쓰이고 있습니다.
        </p>
        <p>
          반면 담긴 뒤의 구매 전환율은 품절 {formatRate(out?.cartToBuy ?? 0)}, 재고 있음{' '}
          {formatRate(inStock?.cartToBuy ?? 0)}로 차이가 없습니다. 담을 만큼 원한 상품이면 재입고를 기다려서라도
          삽니다.
        </p>
      </div>

      <p className="caption">
        재고 값은 주 단위 스냅샷이라 시점 정확도가 ±1주입니다. 담은 직후 재입고된 경우가 '품절 상태로 담김'에
        섞여 있을 수 있습니다. 재고 기록이 조회 시점보다 늦게 시작하는{' '}
        {formatRate(stock.states.find((s) => s.state === '기록 없음')?.viewShare ?? 0, 1)}의 조회는 별도로
        표시했습니다.
      </p>
    </div>
  )
}
