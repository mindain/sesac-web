interface Props {
  height: number
}

export default function ChartSkeleton({ height }: Props) {
  return (
    <div className="chart-skeleton" aria-hidden="true">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-desc" />
      <div className="skeleton-line skeleton-body" style={{ height }} />
    </div>
  )
}
