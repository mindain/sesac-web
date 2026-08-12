import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import DailyTrendChart from './components/DailyTrendChart'
import StatCards from './components/StatCards'
import FunnelChart from './components/FunnelChart'
import CleaningReport from './components/CleaningReport'
import ChartSkeleton from './components/ChartSkeleton'
import type { DateRange, EcomData } from './types/ecom'
import { loadEcomData } from './utils/loadEcomData'
import { computeBuckets, computeFunnel, computeHourly, computeSummary } from './utils/ecomProcessing'
import { longDate } from './utils/format'

const BucketChart = lazy(() => import('./components/BucketChart'))
const HourlyChart = lazy(() => import('./components/HourlyChart'))
const SessionChart = lazy(() => import('./components/SessionChart'))
const LeadtimeChart = lazy(() => import('./components/LeadtimeChart'))
const CohortChart = lazy(() => import('./components/CohortChart'))
const StockChart = lazy(() => import('./components/StockChart'))
const WeekdayChart = lazy(() => import('./components/WeekdayChart'))
const ParetoChart = lazy(() => import('./components/ParetoChart'))

export default function App() {
  const [data, setData] = useState<EcomData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRange | null>(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadEcomData()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setRange({ from: 0, to: d.daily.dates.length - 1 })
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fullRange: DateRange | null = useMemo(
    () => (data ? { from: 0, to: data.daily.dates.length - 1 } : null),
    [data]
  )

  const isDefault =
    !!range && !!fullRange && range.from === fullRange.from && range.to === fullRange.to

  const summary = useMemo(
    () => (data && range ? computeSummary(data.daily, range) : null),
    [data, range]
  )
  const funnel = useMemo(() => (summary ? computeFunnel(summary) : null), [summary])
  const buckets = useMemo(
    () => (data && range ? computeBuckets(data.buckets, range) : null),
    [data, range]
  )
  const hourly = useMemo(
    () => (data && range ? computeHourly(data.hourly, range) : null),
    [data, range]
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>이커머스 방문자는 어디서 이탈하는가</h1>
        <p>
          온라인 쇼핑몰 275만 건 이벤트 로그에서 이상 트래픽을 걸러내고 본 구매 전환 퍼널
          {data && ` · ${longDate(data.meta.dateFrom)} ~ ${longDate(data.meta.dateTo)}`}
        </p>
      </header>

      {error && <div className="card state-msg">{error}</div>}
      {!error && (!data || !range) && <div className="card state-msg">데이터를 불러오는 중입니다…</div>}

      {data && range && summary && funnel && buckets && hourly && (
        <>
          <div className="block">
            <StatCards summary={summary} days={range.to - range.from + 1} />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <DailyTrendChart
              daily={data.daily}
              range={range}
              isDefault={isDefault}
              onChange={setRange}
              onReset={() => {
                if (!fullRange) return
                setRange(fullRange)
                setResetKey((k) => k + 1)
              }}
              resetKey={resetKey}
            />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <FunnelChart stages={funnel} />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <BucketChart rows={buckets} totals={data.meta.bucketTotals} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={320} />}>
              <HourlyChart rows={hourly} />
            </Suspense>
          </div>

          <div className="section-head">
            <h2>심화 분석</h2>
            <p>
              아래 여섯 블록은 <strong>전체 기간(139일) 기준</strong>이며 위쪽 기간 필터의 영향을 받지
              않습니다. 방문 단위·코호트·재고 이력처럼 기간을 잘라 다시 계산할 수 없는 지표들이기 때문입니다
            </p>
          </div>

          <div className="card">
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <SessionChart session={data.deep.session} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <LeadtimeChart leadtime={data.deep.leadtime} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={300} />}>
              <CohortChart cohort={data.deep.cohort} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <StockChart stock={data.stock} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <WeekdayChart weekday={data.deep.weekday} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <ParetoChart pareto={data.deep.pareto} category={data.deep.category} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <CleaningReport meta={data.meta} />
          </div>

          <footer className="app-footer">
            <p>
              데이터:{' '}
              <a href={data.meta.sourceUrl} target="_blank" rel="noreferrer">
                {data.meta.source}
              </a>{' '}
              · {data.meta.author} · 라이선스 {data.meta.license}
            </p>
            <p>
              원본 {formatBig(data.meta.raw.events)}건 이벤트 · 방문자 1,407,580명 · 2015년 실제 이커머스 로그이며
              상품·사용자 정보는 해시 처리되어 공개된 데이터입니다. 집계 시각 {data.meta.generatedAt}.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}

function formatBig(n: number): string {
  return n.toLocaleString('ko-KR')
}
