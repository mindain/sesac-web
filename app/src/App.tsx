import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import ControlBar from './components/ControlBar'
import StatCards from './components/StatCards'
import ChartSkeleton from './components/ChartSkeleton'
import TransactionsTable from './components/TransactionsTable'

const MonthlyTrendChart = lazy(() => import('./components/MonthlyTrendChart'))
const DongRankingChart = lazy(() => import('./components/DongRankingChart'))
import type { DashboardData } from './types/data'
import { loadDashboardData } from './utils/loadData'
import {
  computeDongRanking,
  computeMonthlySeriesFromTransactions,
  computeStatSummary,
  filterTransactions,
  type Filters
} from './utils/dataProcessing'

export const TARGET_GU = '중구'

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDashboardData()
      .then((d) => {
        if (cancelled) return
        setData(d)
        const areaMin = Math.min(...d.transactions.map((t) => t.areaM2))
        const areaMax = Math.max(...d.transactions.map((t) => t.areaM2))
        const budgetMin = Math.min(...d.transactions.map((t) => t.price))
        const budgetMax = Math.max(...d.transactions.map((t) => t.price))
        setFilters({ budgetMin, budgetMax, areaMin, areaMax })
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const areaBounds = useMemo(() => {
    if (!data) return { min: 0, max: 0 }
    return {
      min: Math.min(...data.transactions.map((t) => t.areaM2)),
      max: Math.max(...data.transactions.map((t) => t.areaM2))
    }
  }, [data])

  const budgetBounds = useMemo(() => {
    if (!data) return { min: 0, max: 0 }
    return {
      min: Math.min(...data.transactions.map((t) => t.price)),
      max: Math.max(...data.transactions.map((t) => t.price))
    }
  }, [data])

  const isDefault =
    !!filters &&
    filters.budgetMin === budgetBounds.min &&
    filters.budgetMax === budgetBounds.max &&
    filters.areaMin === areaBounds.min &&
    filters.areaMax === areaBounds.max

  const guTransactions = useMemo(() => {
    if (!data || !filters) return []
    return filterTransactions(data.transactions, filters)
  }, [data, filters])

  const monthlySeries = useMemo(() => {
    if (!data) return { gu: [], seoul: [] }
    return {
      gu: computeMonthlySeriesFromTransactions(guTransactions, data.meta.months),
      seoul: data.monthly.seoul
    }
  }, [data, guTransactions])

  const stats = useMemo(() => computeStatSummary(guTransactions, monthlySeries.gu), [guTransactions, monthlySeries])

  const dongRanking = useMemo(() => {
    if (!data) return { entries: [], excludedCount: 0 }
    return computeDongRanking(guTransactions)
  }, [data, guTransactions])

  const tableTransactions = useMemo(() => {
    if (!selectedDong) return guTransactions
    return guTransactions.filter((t) => t.dong === selectedDong)
  }, [guTransactions, selectedDong])

  function updateFilters(patch: Partial<Filters>) {
    setFilters((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function handleReset() {
    setFilters({
      budgetMin: budgetBounds.min,
      budgetMax: budgetBounds.max,
      areaMin: areaBounds.min,
      areaMax: areaBounds.max
    })
    setSelectedDong(null)
  }

  function handleDongSelect(dong: string) {
    setSelectedDong((prev) => (prev === dong ? null : dong))
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="badge">SESAC 강북캠퍼스</span>
        <h1>서울 중구 아파트 실거래 대시보드</h1>
        <p>2025년 7월 ~ 2026년 6월 매매 거래 기준 · 서울 중구</p>
      </header>

      {error && <div className="card state-msg">{error}</div>}

      {!error && (!data || !filters) && <div className="card state-msg">데이터를 불러오는 중입니다…</div>}

      {data && filters && (
        <>
          <ControlBar
            filters={filters}
            budgetBounds={budgetBounds}
            areaBounds={areaBounds}
            isDefault={isDefault}
            onBudgetChange={(budgetMin, budgetMax) => updateFilters({ budgetMin, budgetMax })}
            onAreaChange={(areaMin, areaMax) => updateFilters({ areaMin, areaMax })}
            onReset={handleReset}
          />

          <div className="block" style={{ marginTop: 'var(--space-24)' }}>
            <StatCards gu={TARGET_GU} stats={stats} />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={340} />}>
              <MonthlyTrendChart gu={TARGET_GU} guSeries={monthlySeries.gu} seoulSeries={monthlySeries.seoul} />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <Suspense fallback={<ChartSkeleton height={Math.max(360, dongRanking.entries.length * 26)} />}>
              <DongRankingChart
                ranking={dongRanking.entries}
                excludedCount={dongRanking.excludedCount}
                selectedDong={selectedDong}
                onSelect={handleDongSelect}
              />
            </Suspense>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <TransactionsTable transactions={tableTransactions} />
          </div>
        </>
      )}
    </div>
  )
}
