// Types matching the schema documented in PRD.md section 2.

export interface MetaJson {
  gu: string[]
  months: string[]
  dong: string[]
  complex: string[]
  generatedAt: string
  totalCount: number
}

export interface MonthlyPoint {
  ym: string
  avgPrice: number // 만원
  avgPyeong: number // 만원/평
  count: number
  medianPrice: number // 만원
}

export interface MonthlyJson {
  seoul: MonthlyPoint[]
  gu: Record<string, MonthlyPoint[]>
}

export interface TransactionsJson {
  fields: ['gu', 'dong', 'complex', 'date', 'area', 'floor', 'price']
  gu: number[]
  dong: number[]
  complex: number[]
  date: number[] // days since 2025-07-01
  area: number[] // m2 * 10
  floor: number[]
  price: number[] // 만원
}

// Decoded, row-oriented transaction used throughout the UI.
export interface Transaction {
  gu: string
  dong: string
  complex: string
  dateStr: string // YYYY-MM-DD
  dateDays: number
  areaM2: number
  areaPyeong: number
  floor: number
  price: number // 만원
}

export interface DashboardData {
  meta: MetaJson
  monthly: MonthlyJson
  transactions: Transaction[]
}
