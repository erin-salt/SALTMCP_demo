import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ADDRESS_POINTS, LANDMARKS, PARKS, STREETS } from '../../data/backBayMap'

// A schematic Back Bay: the host's drawing, SALT's venues on it. Venues that
// share an address (the Prudential Center, Copley Place) share one marker.
// Zoom with the buttons, the wheel or a pinch-free drag; picking a place from
// the chat flies the map to it.
export interface MapSpot { key: string; x: number; y: number; names: string[]; ids: string[]; status: 'open' | 'closed' | 'unknown' | 'saved'; match: boolean; highlighted: boolean; saved: boolean }
interface View { x: number; y: number; w: number; h: number }

// The whole drawing, framed tightly.
const xs = [...STREETS.flatMap((l) => [l.x1, l.x2]), ...Object.values(ADDRESS_POINTS).map((p) => p[0]), ...PARKS.flatMap((p) => [p.x, p.x + p.w])]
const ys = [...STREETS.flatMap((l) => [l.y1, l.y2]), ...Object.values(ADDRESS_POINTS).map((p) => p[1])]
const HOME: View = { x: Math.min(...xs) - 30, y: Math.min(...ys) - 30, w: Math.max(...xs) - Math.min(...xs) + 50, h: Math.max(...ys) - Math.min(...ys) + 60 }
const MIN_W = HOME.w / 6

const label = (l: (typeof STREETS)[number]) => {
  const angle = Math.atan2(l.y2 - l.y1, l.x2 - l.x1) * 180 / Math.PI
  if (l.kind === 'cross') return <text key={l.name} className="bb-label is-cross" x={l.x1} y={l.y1 - 7} textAnchor="middle">{l.name.replace(' St', '')}</text>
  const upright = angle > 90 || angle < -90
  const [x, y] = upright ? [l.x2, l.y2] : [l.x1, l.y1]
  const t = l.kind === 'avenue' && l.name !== 'Commonwealth Ave' ? 0.5 : 0.01
  const px = x + (upright ? l.x1 - l.x2 : l.x2 - l.x1) * t, py = y + (upright ? l.y1 - l.y2 : l.y2 - l.y1) * t
  return <text key={l.name} className={`bb-label is-${l.kind}`} x={px} y={py - 9} transform={`rotate(${upright ? angle + 180 : angle} ${px} ${py})`}>{l.name}</text>
}

export function BackBayMap({ spots, selected, focus, onSelect }: { spots: MapSpot[]; selected?: string; focus?: { key: string; at: number }; onSelect: (key: string) => void }) {
  const [view, setView] = useState<View>(HOME)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)

  const zoom = (factor: number, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => setView((v) => {
    const w = Math.min(HOME.w, Math.max(MIN_W, v.w * factor)), h = w * HOME.h / HOME.w
    return w === HOME.w ? HOME : { x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (h / v.h), w, h }
  })

  // Fly to a place picked in the chat or the search.
  const lastFocus = useRef<number>(undefined)
  useEffect(() => {
    if (!focus || focus.at === lastFocus.current || !ADDRESS_POINTS[focus.key]) return
    lastFocus.current = focus.at
    const [x, y] = ADDRESS_POINTS[focus.key]
    const w = HOME.w / 2.6, h = w * HOME.h / HOME.w
    const id = requestAnimationFrame(() => setView({ x: x - w / 2, y: y - h / 2, w, h }))
    return () => cancelAnimationFrame(id)
  }, [focus])

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = svg.getBoundingClientRect()
      setView((v) => {
        const scale = Math.max(v.w / box.width, v.h / box.height)
        const cx = v.x + v.w / 2 + (event.clientX - box.left - box.width / 2) * scale
        const cy = v.y + v.h / 2 + (event.clientY - box.top - box.height / 2) * scale
        const w = Math.min(HOME.w, Math.max(MIN_W, v.w * (event.deltaY > 0 ? 1.15 : 1 / 1.15))), h = w * HOME.h / HOME.w
        return w === HOME.w ? HOME : { x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (h / v.h), w, h }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const down = (event: ReactPointerEvent) => { drag.current = { x: event.clientX, y: event.clientY, view, moved: false } }
  const move = (event: ReactPointerEvent) => {
    const d = drag.current, svg = svgRef.current
    if (!d || !svg) return
    const dx = event.clientX - d.x, dy = event.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    if (!d.moved) { d.moved = true; svg.setPointerCapture(event.pointerId) }
    const box = svg.getBoundingClientRect(), scale = Math.max(d.view.w / box.width, d.view.h / box.height)
    setView({ ...d.view, x: d.view.x - dx * scale, y: d.view.y - dy * scale })
  }
  const up = () => { setTimeout(() => { drag.current = null }) }
  const choose = (key: string) => { if (!drag.current?.moved) onSelect(key) }

  // Markers shrink a little as the map zooms in, so dense blocks separate.
  const k = Math.pow(view.w / HOME.w, 0.55)
  const order = (s: MapSpot) => (s.match ? 1 : 0) + (s.highlighted ? 2 : 0) + (s.key === selected ? 4 : 0)
  return <div className="bb">
    <svg ref={svgRef} className={`bb-map${view === HOME ? '' : ' is-zoomed'}`} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} style={{ '--z': view.w / HOME.w, '--zs': Math.sqrt(view.w / HOME.w) } as CSSProperties} role="group" aria-label="Map of Back Bay, Boston"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {PARKS.map((p, i) => <g key={i}><rect className="bb-park" x={p.x} y={p.y} width={p.w} height={p.h} rx={p.name ? 6 : 2} />{p.name && <text className="bb-park-name" x={p.x + p.w / 2} y={p.below ? p.y + p.h + 30 : p.y + p.h / 2 + 5} textAnchor="middle">{p.name}</text>}</g>)}
      {STREETS.map((l) => <line key={l.name} className={`bb-street is-${l.kind}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
      {STREETS.map(label)}
      {LANDMARKS.map((l) => <text key={l.name} className="bb-landmark" x={l.x} y={l.y + 34} textAnchor="middle">{l.name}</text>)}
      {[...spots].sort((a, b) => order(a) - order(b)).map((s) => {
        const r = (s.names.length > 1 ? Math.min(7.5 + s.names.length * 0.6, 17) : 6.5) * k
        const name = s.names.length > 1 ? `${s.names.length} places at one address: ${s.names.slice(0, 3).join(', ')}${s.names.length > 3 ? '…' : ''}` : s.names[0]
        return <g key={s.key} className={`bb-spot is-${s.status}${s.match ? '' : ' is-dim'}${s.highlighted ? ' is-hit' : ''}${s.saved ? ' is-saved' : ''}${s.key === selected ? ' is-selected' : ''}`}
          transform={`translate(${s.x} ${s.y})`} role="button" tabIndex={s.match ? 0 : -1} aria-label={name}
          onClick={() => choose(s.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.key) } }}>
          <title>{name}</title>
          <circle className="bb-hit" r={r + 7 * k} />
          {s.saved && <circle className="bb-saved-ring" r={r + 3.5 * k} style={{ strokeWidth: 2 * k }} />}
          <circle className="bb-dot" r={r} />
          {s.status === 'closed' && <line className="bb-cross" x1={-r * 0.6} y1={r * 0.6} x2={r * 0.6} y2={-r * 0.6} />}
          {s.names.length > 2 && <text className="bb-count" y={3.8 * k} textAnchor="middle" style={{ fontSize: 11 * k }}>{s.names.length}</text>}
        </g>
      })}
    </svg>
    <div className="bb-zoom" role="group" aria-label="Zoom">
      <button aria-label="Zoom in" onClick={() => zoom(1 / 1.6)}>+</button>
      <button aria-label="Zoom out" disabled={view === HOME} onClick={() => zoom(1.6)}>−</button>
      {view !== HOME && <button aria-label="Show all of Back Bay" className="bb-home" onClick={() => setView(HOME)}>All</button>}
    </div>
  </div>
}
