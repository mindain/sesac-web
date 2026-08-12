import DualRangeSlider from './DualRangeSlider'
import type { Filters } from '../utils/dataProcessing'
import { m2ToPyeong } from '../utils/format'
import './ControlBar.css'

interface Props {
  filters: Filters
  guList: string[]
  areaBounds: { min: number; max: number }
  isDefault: boolean
  onGuChange: (gu: string) => void
  onBudgetChange: (min: number, max: number) => void
  onAreaChange: (min: number, max: number) => void
  onReset: () => void
}

export default function ControlBar({
  filters,
  guList,
  areaBounds,
  isDefault,
  onGuChange,
  onBudgetChange,
  onAreaChange,
  onReset
}: Props) {
  return (
    <div className="card control-bar">
      <div className="control-item control-gu">
        <label htmlFor="gu-select">관심 구</label>
        <select id="gu-select" value={filters.gu} onChange={(e) => onGuChange(e.target.value)}>
          {guList.map((gu) => (
            <option key={gu} value={gu}>
              {gu}
            </option>
          ))}
        </select>
      </div>

      <div className="control-item control-slider">
        <label>예산 범위 (만원)</label>
        <DualRangeSlider
          min={0}
          max={300000}
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
