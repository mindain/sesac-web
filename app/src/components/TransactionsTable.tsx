import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from '../types/data'
import { formatArea, formatCount, formatManwon } from '../utils/format'
import './TransactionsTable.css'

interface Props {
  transactions: Transaction[]
}

type SortKey = 'date' | 'price' | 'area'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

export default function TransactionsTable({ transactions }: Props) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [debouncedSearch, sortKey, sortDir, transactions])

  const searched = useMemo(() => {
    if (!debouncedSearch) return transactions
    const q = debouncedSearch.toLowerCase()
    return transactions.filter(
      (t) => t.complex.toLowerCase().includes(q) || t.dong.toLowerCase().includes(q)
    )
  }, [transactions, debouncedSearch])

  const sorted = useMemo(() => {
    const arr = [...searched]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (sortKey === 'date') return (a.dateDays - b.dateDays) * dir
      if (sortKey === 'price') return (a.price - b.price) * dir
      return (a.areaM2 - b.areaM2) * dir
    })
    return arr
  }, [searched, sortKey, sortDir])

  const visible = sorted.slice(0, visibleCount)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'desc')
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div className="block">
      <h2>거래 내역</h2>
      <div className="table-toolbar">
        <span className="table-count">조건에 맞는 거래 {formatCount(searched.length)}</span>
        <input
          type="text"
          className="table-search"
          placeholder="단지명 또는 동 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="state-msg">조건에 맞는 거래가 없습니다</div>
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('date')}>
                    계약일{sortIndicator('date')}
                  </th>
                  <th>동</th>
                  <th>단지명</th>
                  <th className="num sortable" onClick={() => toggleSort('area')}>
                    면적{sortIndicator('area')}
                  </th>
                  <th className="num">층</th>
                  <th className="num sortable" onClick={() => toggleSort('price')}>
                    거래금액(만원){sortIndicator('price')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t, i) => (
                  <tr key={`${t.dateDays}-${t.complex}-${t.floor}-${t.price}-${i}`}>
                    <td className="date num">{t.dateStr}</td>
                    <td>{t.dong}</td>
                    <td className="name">{t.complex}</td>
                    <td className="num">{formatArea(t.areaM2)}</td>
                    <td className="num">{t.floor}</td>
                    <td className="num">{formatManwon(t.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleCount < sorted.length && (
            <div className="table-more">
              <button type="button" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                더 보기 ({sorted.length - visibleCount}건 더 있음)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
