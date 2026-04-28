interface Props {
  remaining: number
  total: number
}

export function ProgressBar({ remaining, total }: Props) {
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0
  return (
    <div className="w-full h-2.5 bg-white/15 border border-white/20">
      <div
        className="h-full bg-white transition-all duration-1000 ease-linear"
        style={{
          width: `${pct}%`,
          boxShadow: pct > 0 ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
        }}
      />
    </div>
  )
}
