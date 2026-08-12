import DualRangeSlider from './DualRangeSlider'
import type { Filters } from '../utils/dataProcessing'
import { m2ToPyeong } from '../utils/format'
import './ControlBar.css'

interface Props {
  filters: Filters
  budgetBounds: { min: number; max: number }
  areaBounds: { min: number; max: number }
  isDefault: boolean
  onBudgetChange: (min: number, max: number) => void
  onAreaChange: (min: number, max: number) => void
  onReset: () => void
}

export default function ControlBar({
  filters,
  budgetBounds,
  areaBounds,
  isDefault,
  onBudgetChange,
  onAreaChange,
  onReset
}: Props) {
  return (
    <div className="card control-bar">
      <div className="control-item control-slider">
        <label>예산 범위 (만원)</label>
        <DualRangeSlider
          min={budgetBounds.min}
          max={budgetBounds.max}
          step={1000}
          valueMin={filters.budgetMin}
          valueMax={filters.budgetMax}
          onChange={onBudgetChange}
          formatLabel={(v) => `${(v / 10000).toFixed(1)}억`}
        />
      </div>

      <div className="control-item control-slider">
        <label>면적 범위 (㎡)</label>
        <DualRangeSlider
          min={areaBounds.min}
          max={areaBounds.max}
          step={0.5}
          valueMin={filters.areaMin}
          valueMax={filters.areaMax}
          onChange={onAreaChange}
          formatLabel={(v) => `${v.toFixed(1)}㎡(${m2ToPyeong(v).toFixed(1)}평)`}
        />
      </div>

      <div className="control-item control-reset">
        <button type="button" onClick={onReset} disabled={isDefault}>
          필터 초기화
        </button>
      </div>
    </div>
  )
}
