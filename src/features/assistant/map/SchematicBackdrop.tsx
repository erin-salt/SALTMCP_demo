import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ADDRESS_POINTS, LANDMARKS, PARKS, STREETS } from '../../../data/backBayMap'
import { toSchematic, type MapApi } from './mapTypes'

// Stand-in base map until a Google key is configured (and in tests): the
// host's schematic drawing of Back Bay, with the same zoom and pan.
interface View { x: number; y: number; w: number; h: number }

// The whole drawing, framed tightly.
const xs = [...STREETS.flatMap((l) => [l.x1, l.x2]), ...Object.values(ADDRESS_POINTS).map((p) => p[0]), ...PARKS.flatMap((p) => [p.x, p.x + p.w])]
const ys = [...STREETS.flatMap((l) => [l.y1, l.y2]), ...Object.values(ADDRESS_POINTS).map((p) => p[1])]
const HOME: View = { x: Math.min(...xs) - 30, y: Math.min(...ys) - 30, w: Math.max(...xs) - Math.min(...xs) + 50, h: Math.max(...ys) - Math.min(...ys) + 60 }
const MIN_W = HOME.w / 10

const label = (l: (typeof STREETS)[number]) => {
  const angle = Math.atan2(l.y2 - l.y1, l.x2 - l.x1) * 180 / Math.PI
  if (l.kind === 'cross') return <text key={l.name} className="bb-label is-cross" x={l.x1} y={l.y1 - 7} textAnchor="middle">{l.name.replace(' St', '')}</text>
  const upright = angle > 90 || angle < -90
  const [x, y] = upright ? [l.x2, l.y2] : [l.x1, l.y1]
  const t = l.kind === 'avenue' && l.name !== 'Commonwealth Ave' ? 0.5 : 0.01
  const px = x + (upright ? l.x1 - l.x2 : l.x2 - l.x1) * t, py = y + (upright ? l.y1 - l.y2 : l.y2 - l.y1) * t
  return <text key={l.name} className={`bb-label is-${l.kind}`} x={px} y={py - 9} transform={`rotate(${upright ? angle + 180 : angle} ${px} ${py})`}>{l.name}</text>
}

export function SchematicBackdrop({ onApi }: { onApi: (api: MapApi) => void }) {
  const [view, setView] = useState<View>(HOME)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  const zoomAt = (v: View, factor: number, cx = v.x + v.w / 2, cy = v.y + v.h / 2): View => {
    const w = Math.min(HOME.w, Math.max(MIN_W, v.w * factor)), h = w * HOME.h / HOME.w
    return w === HOME.w ? HOME : { x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (h / v.h), w, h }
  }

  // Fit the drawing to the container: centred on wide screens, top-aligned
  // under the search bar on tall (phone) screens so the chat sheet doesn't cover it.
  const s0 = Math.min(size.w / view.w, size.h / view.h) || 1
  const portrait = size.h > size.w
  const offX = (size.w - view.w * s0) / 2, offY = portrait ? Math.min(76, Math.max(size.h - view.h * s0, 0)) : (size.h - view.h * s0) / 2
  const box = size.w ? { x: view.x - offX / s0, y: view.y - offY / s0, w: size.w / s0, h: size.h / s0 } : view

  // Tell the venue map how to place things whenever the view or size changes.
  useEffect(() => {
    onApi({
      project: (lat, lng) => { const [x, y] = toSchematic(lat, lng); return { x: offX + (x - view.x) * s0, y: offY + (y - view.y) * s0 } },
      fit: (points, options) => {
        if (!points.length) return
        const pts = points.map(([lat, lng]) => toSchematic(lat, lng))
        const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0])), minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]))
        const w = Math.min(HOME.w, Math.max(options?.maxZoom ? MIN_W : MIN_W * 1.5, (maxX - minX) * 1.5, (maxY - minY) * 1.5 * HOME.w / HOME.h)), h = w * HOME.h / HOME.w
        setView(w === HOME.w ? HOME : { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h })
      },
      zoomBy: (direction) => setView((v) => zoomAt(v, direction > 0 ? 1 / 1.6 : 1.6)),
      zoomAt: (lat, lng, levels) => {
        const [x, y] = toSchematic(lat, lng)
        setView((v) => { const w = Math.max(MIN_W, v.w / 1.6 ** levels), h = w * HOME.h / HOME.w; return { x: x - w / 2, y: y - h / 2, w, h } })
      },
      home: () => setView(HOME),
      zoomed: view !== HOME,
    })
  }, [view, s0, offX, offY, onApi])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = svg.getBoundingClientRect()
      setView((v) => {
        const scale = Math.max(v.w / box.width, v.h / box.height)
        return zoomAt(v, event.deltaY > 0 ? 1.15 : 1 / 1.15, v.x + v.w / 2 + (event.clientX - box.left - box.width / 2) * scale, v.y + v.h / 2 + (event.clientY - box.top - box.height / 2) * scale)
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
    if (!d.moved) { d.moved = true; svg.setPointerCapture?.(event.pointerId) }
    const box = svg.getBoundingClientRect(), scale = Math.max(d.view.w / box.width, d.view.h / box.height)
    setView({ ...d.view, x: d.view.x - dx * scale, y: d.view.y - dy * scale })
  }
  const up = () => { drag.current = null }

  return <svg ref={svgRef} className="bb-map" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} style={{ '--z': view.w / HOME.w, '--zs': Math.sqrt(view.w / HOME.w) } as CSSProperties}
    aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
    {PARKS.map((p, i) => <g key={i}><rect className="bb-park" x={p.x} y={p.y} width={p.w} height={p.h} rx={p.name ? 6 : 2} />{p.name && <text className="bb-park-name" x={p.x + p.w / 2} y={p.below ? p.y + p.h + 30 : p.y + p.h / 2 + 5} textAnchor="middle">{p.name}</text>}</g>)}
    {STREETS.map((l) => <line key={l.name} className={`bb-street is-${l.kind}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
    {STREETS.map(label)}
    {LANDMARKS.map((l) => <text key={l.name} className="bb-landmark" x={l.x} y={l.y + 34} textAnchor="middle">{l.name}</text>)}
  </svg>
}
