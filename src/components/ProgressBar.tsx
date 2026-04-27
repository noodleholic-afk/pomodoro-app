interface Props {
  remaining: number
  total: number
}

export function ProgressBar({ remaining, total }: Props) {
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0
  return (
    <div className="w-full h-3 bg-white/20 rounded-none border border-white/30">
      <div
        className="h-full bg-white transition-all duration-1000 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
