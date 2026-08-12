export function formatCount(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}건`
}

export function formatPeople(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}명`
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

/** 0.0084 -> "0.84%" */
export function formatRate(ratio: number, digits = 2): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

/**
 * 축 라벨용 축약: 2664312 -> "266만", 25000 -> "2.5만"
 * 만 단위에서 반올림하면 15,000과 20,000이 모두 "2만"이 되어 축 라벨이 중복된다.
 * 100만 미만에서는 소수 한 자리를 남긴다.
 */
export function formatCompact(n: number): string {
  if (n >= 1000000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`
  if (n >= 10000) {
    const man = n / 10000
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만`
  }
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`
  return `${n}`
}

/** "2015-05-03" -> "5/3" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

/** "2015-05-03" -> "2015년 5월 3일" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}
