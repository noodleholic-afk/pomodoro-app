import { useState } from 'react'

interface Props {
  label: string
  emoji: string
  items: { id: string; text: string }[]
  onAdd: (text: string) => void
}

export function InterruptionBox({ label, emoji, items, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  function submit() {
    const t = input.trim()
    if (!t) return
    onAdd(t)
    setInput('')
  }

  return (
    <div className="bg-black/30 border border-white/20 rounded text-xs">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-white/80 hover:text-white pixel-btn"
        onClick={() => setOpen(o => !o)}
      >
        <span>{emoji} {label} {items.length > 0 && <span className="text-yellow-300">({items.length})</span>}</span>
        <span className="text-white/50">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {items.map(item => (
            <div key={item.id} className="text-white/70 text-xs border-l-2 border-white/30 pl-2">
              {item.text}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 bg-white/10 border border-white/30 px-2 py-1 text-white text-xs outline-none placeholder-white/40 font-pixel"
              placeholder="记录..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <button
              className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs pixel-btn"
              onClick={submit}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
