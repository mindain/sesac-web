import type { MetaJson } from '../types/ecom'
import { formatNumber, formatRate } from '../utils/format'
import './CleaningReport.css'

interface Props {
  meta: MetaJson
}

// 채택한 규칙 하나만 보여주면 "운 좋게 맞춘 것"처럼 보인다.
// 탈락한 규칙과 탈락 이유를 함께 남기는 것이 이 블록의 목적이다.
const REJECTED = [
  {
    rule: '이벤트 47건 이상 (상위 0.1%)',
    result: '방문자 1,413명 · 이벤트 8.08%',
    why: '제거하니 구매가 34% 사라졌다. 활동량 상위 집단은 봇이 아니라 우량 고객이었다'
  },
  {
    rule: '평균 이벤트 간격 1초 미만',
    result: '방문자 11명',
    why: '4.5개월에 걸친 활동이라 평균 간격이 희석된다. 연속 이벤트 간격이 필요한데 계산 비용이 크다'
  },
  {
    rule: '상위 0.1% 이면서 구매 0건',
    result: '방문자 893명 · 이벤트 3.31%',
    why: '장바구니 전환율이 오히려 떨어졌다. 담았다가 안 산 고객은 봇이 아니라 이탈 분석 대상이다'
  },
  {
    rule: '카테고리 다양성 상위',
    result: '조회 100건+ 구매자 평균 113.7개 vs 무행동자 32.1개',
    why: '가설과 반대였다. 카테고리를 넓게 보는 사람일수록 오히려 잘 샀다'
  }
]

export default function CleaningReport({ meta }: Props) {
  const { bot, raw, clean } = meta

  return (
    <div className="block">
      <h2>이상 트래픽을 걸러냈습니다</h2>
      <p className="block-desc">
        데이터 제공자는 이런 로그에 최대 40%의 비정상 트래픽이 섞일 수 있다고 밝혔습니다. 직접 찾아본
        기록입니다
      </p>

      <div className="clean-rule">
        <span className="clean-rule-k">채택한 판정 기준</span>
        <span className="clean-rule-v">{meta.botRule}</span>
        <p>
          4.5개월 동안 100건 넘게 보면서 장바구니 버튼을 한 번도 누르지 않은 방문자입니다. 사람의 행동으로
          설명하기 어려운 유일한 패턴이라 이것만 제거했습니다. 놓치는 봇이 있더라도 정상 고객을 자르지 않는
          쪽을 택했습니다.
        </p>
      </div>

      <div className="clean-grid">
        <div className="clean-cell">
          <span className="clean-k">제거한 방문자</span>
          <span className="clean-v num">{formatNumber(bot.visitors)}명</span>
        </div>
        <div className="clean-cell">
          <span className="clean-k">제거한 이벤트</span>
          <span className="clean-v num">{formatNumber(bot.events)}건</span>
          <span className="clean-sub num">전체의 {formatRate(bot.eventShare)}</span>
        </div>
        <div className="clean-cell">
          <span className="clean-k">조회 → 장바구니</span>
          <span className="clean-v num">
            {formatRate(raw.cartRate)} <span className="clean-arrow">→</span> {formatRate(clean.cartRate)}
          </span>
        </div>
        <div className="clean-cell">
          <span className="clean-k">조회 → 구매</span>
          <span className="clean-v num">
            {formatRate(raw.buyRate)} <span className="clean-arrow">→</span> {formatRate(clean.buyRate)}
          </span>
        </div>
      </div>

      <h3 className="clean-h3">버린 규칙 4개와 버린 이유</h3>
      <div className="clean-table-wrap">
        <table className="clean-table">
          <thead>
            <tr>
              <th>시도한 규칙</th>
              <th>적발 규모</th>
              <th>탈락 이유</th>
            </tr>
          </thead>
          <tbody>
            {REJECTED.map((r) => (
              <tr key={r.rule}>
                <td>{r.rule}</td>
                <td className="num">{r.result}</td>
                <td>{r.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="caption">
        네 번 시도해서 네 번 모두 "활동량이 많은 집단 = 우량 고객"이 나왔습니다. 걸러낸 것은 전체의{' '}
        {formatRate(bot.eventShare)}뿐이고 전환율은 {formatRate(raw.buyRate)}에서 {formatRate(clean.buyRate)}로만
        움직였습니다. 방문자당 이벤트 수의 중앙값이 1건이라, 이벤트를 한 건만 남긴 봇은 정상 방문자와 구분할
        방법이 없습니다. 제공자가 말한 40%는 이 데이터만으로는 도달할 수 없다는 것이 결론입니다.
      </p>
    </div>
  )
}
