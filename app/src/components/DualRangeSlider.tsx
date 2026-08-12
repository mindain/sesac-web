import { useCallback } from 'react'
import './DualRangeSlider.css'

interface Props {
  min: number
  max: number
  step: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
  formatLabel: (v: number) => string
}

export default function DualRangeSlider({ min, max, step, valueMin, valueMax, onChange, formatLabel }: Props) {
  const range = max - min || 1
  const pctMin = ((valueMin - min) / range) * 100
  const pctMax = ((valueMax - min) / range) * 100

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.min(Number(e.target.value), valueMax - step)
      onChange(v, valueMax)
    },
    [onChange, valueMax, step]
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(Number(e.target.value), valueMin + step)
      onChange(valueMin, v)
    },
    [onChange, valueMin, step]
  )

  return (
    <div className="dual-slider">
      <div className="dual-slider-labels">
        <span className="num">{formatLabel(valueMin)}</span>
        <span className="num">{formatLabel(valueMax)}</span>
      </div>
      <div className="dual-slider-track-wrap">
        <div className="dual-slider-track" />
        <div className="dual-slider-range" style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }} />
        <input
          type="range"
          className="dual-slider-input"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={handleMinChange}
          aria-label="최소값"
        />
        <input
          type="range"
          className="dual-slider-input"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={handleMaxChange}
          aria-label="최대값"
        />
      </div>
    </div>
  )
}
