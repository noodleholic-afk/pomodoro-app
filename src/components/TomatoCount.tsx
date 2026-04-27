interface Props {
  count: number // 0-3 within current cycle
}

export function TomatoCount({ count }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className={`text-xl transition-opacity ${i < count ? 'opacity-100' : 'opacity-25'}`}>
          🍅
        </span>
      ))}
    </div>
  )
}
