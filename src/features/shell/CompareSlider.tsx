import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

interface Props { before: ReactNode; after: ReactNode; onFinish: () => void }

const REST = 46

// Without SALT on the left, with SALT on the right, over the same trip. On
// first view the divider sweeps in once to reveal the change; dragging it all
// the way left hands over to the interactive app.
export function CompareSlider({ before, after, onFinish }: Props) {
  const [pos, setPos] = useState(100)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setPos(REST), 450)
    return () => clearTimeout(timer)
  }, [])

  const moveTo = (clientX: number) => {
    const box = ref.current!.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)))
  }
  const onDown = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    setTouched(true)
    moveTo(event.clientX)
  }
  const onUp = () => {
    setDragging(false)
    if (pos <= 3) onFinish()
  }
  const onKey = (event: KeyboardEvent) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    setTouched(true)
    setPos((current) => Math.min(100, Math.max(0, current + step)))
  }

  return <div className={`compare${dragging ? ' is-dragging' : ''}`} ref={ref}>
    <div className="compare-layer" aria-hidden={pos <= 3}>{before}</div>
    <div className="compare-layer is-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} aria-hidden={pos >= 97}>{after}</div>
    <div className="compare-divider" style={{ left: `${pos}%` }} onPointerDown={onDown} onPointerMove={(event) => dragging && moveTo(event.clientX)} onPointerUp={onUp} onPointerCancel={onUp}>
      <span className="compare-label is-before">Without SALT</span>
      <span className="compare-label is-after">With SALT</span>
      <span
        className="compare-handle"
        role="slider"
        tabIndex={0}
        aria-label="Compare without and with SALT"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(100 - pos)}
        aria-valuetext={`${Math.round(100 - pos)}% with SALT`}
        onKeyDown={onKey}
      ><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4.5 2.5 8 6 11.5M10 4.5 13.5 8 10 11.5" /></svg></span>
      {!touched && pos === REST && <span className="compare-prompt">Drag to compare</span>}
    </div>
  </div>
}
