import { useEffect, useMemo, useState } from 'react'
import ControlBar from './components/ControlBar'
import StatCards from './components/StatCards'
import MonthlyTrendChart from './components/MonthlyTrendChart'
import GuRankingChart from './components/GuRankingChart'
import TransactionsTable from './components/TransactionsTable'
import type { DashboardData } from './types/data'
import { loadDashboardData } from './utils/loadData'
import {
  computeGuRanking,
  computeMonthlySeriesFromTransactions,
  computeStatSummary,
  fallbackMonthlyForGu,
  filterTransactions,
  type Filters
} from './utils/dataProcessing'

const DEFAULT_GU = '노원구'
const DEFAULT_BUDGET_MIN = 60000
const DEFAULT_BUDGET_MAX = 100000

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDashboardData()
      .then((d) => {
        if (cancelled) return
        setData(d)
        const areaMin = Math.min(...d.transactions.map((t) => t.areaM2))
        const areaMax = Math.max(...d.transactions.map((t) => t.areaM2))
        const gu = d.meta.gu.includes(DEFAULT_GU) ? DEFAULT_GU : d.meta.gu[0]
        setFilters({
          gu,
          budgetMin: DEFAULT_BUDGET_MIN,
          budgetMax: DEFAULT_BUDGET_MAX,
          areaMin,
          areaMax
        })
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

  const isDefault =
    !!filters &&
    filters.gu === DEFAULT_GU &&
    filters.budgetMin === DEFAULT_BUDGET_MIN &&
    filters.budgetMax === DEFAULT_BUDGET_MAX &&
    filters.areaMin === areaBounds.min &&
    filters.areaMax === areaBounds.max

  const budgetAreaFiltered = useMemo(() => {
    if (!data || !filters) return []
    return filterTransactions(data.transactions, filters)
  }, [data, filters])

  const guTransactions = useMemo(() => {
    if (!filters) return []
    return budgetAreaFiltered.filter((t) => t.gu === filters.gu)
  }, [budgetAreaFiltered, filters])

  const monthlySeries = useMemo(() => {
    if (!data) return { gu: [], seoul: [] }
    return {
      gu: computeMonthlySeriesFromTransactions(guTransactions, data.meta.months),
      seoul: computeMonthlySeriesFromTransactions(budgetAreaFiltered, data.meta.months)
    }
  }, [data, guTransactions, budgetAreaFiltered])

  const stats = useMemo(() => computeStatSummary(guTransactions, monthlySeries.gu), [guTransactions, monthlySeries])

  const ranking = useMemo(() => {
    if (!data) return []
    return computeGuRanking(budgetAreaFiltered, data.meta.gu)
  }, [data, budgetAreaFiltered])

  function updateFilters(patch: Partial<Filters>) {
    setFilters((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function handleReset() {
    setFilters({
      gu: DEFAULT_GU,
      budgetMin: DEFAULT_BUDGET_MIN,
      budgetMax: DEFAULT_BUDGET_MAX,
      areaMin: areaBounds.min,
      areaMax: areaBounds.max
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="badge">SESAC 강북캠퍼스</span>
        <h1>서울 아파트 실거래 대시보드</h1>
        <p>2025년 7월 ~ 2026년 6월 매매 거래 기준 · 서울 25개 구</p>
      </header>

      {error && <div className="card state-msg">{error}</div>}

      {!error && (!data || !filters) && <div className="card state-msg">데이터를 불러오는 중입니다…</div>}

      {data && filters && (
        <>
          <ControlBar
            filters={filters}
            guList={data.meta.gu}
            areaBounds={areaBounds}
            isDefault={isDefault}
            onGuChange={(gu) => updateFilters({ gu })}
            onBudgetChange={(budgetMin, budgetMax) => updateFilters({ budgetMin, budgetMax })}
            onAreaChange={(areaMin, areaMax) => updateFilters({ areaMin, areaMax })}
            onReset={handleReset}
          />

          <div className="block" style={{ marginTop: 'var(--space-24)' }}>
            <StatCards gu={filters.gu} stats={stats} />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <MonthlyTrendChart
              gu={filters.gu}
              guSeries={monthlySeries.gu.length ? monthlySeries.gu : fallbackMonthlyForGu(data.monthly, filters.gu)}
              seoulSeries={monthlySeries.seoul.length ? monthlySeries.seoul : data.monthly.seoul}
            />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <GuRankingChart ranking={ranking} selectedGu={filters.gu} onSelect={(gu) => updateFilters({ gu })} />
          </div>

          <div className="card" style={{ marginTop: 'var(--space-24)' }}>
            <TransactionsTable transactions={guTransactions} />
          </div>
        </>
      )}
    </div>
  )
}
