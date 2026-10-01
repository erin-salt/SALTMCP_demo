import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { GoogleBackdrop } from './GoogleBackdrop'
import { fetchMapConfig, type MapApi, type MapPlace } from './mapTypes'
import { SchematicBackdrop } from './SchematicBackdrop'

const CARD_W = 300
const PILL_H = 26
const GAP = 4

interface Pill { key: string; x: number; y: number; w: number; members: MapPlace[]; solo: boolean; sx: number; sy: number }
const short = (name: string) => name.length > 20 ? `${name.slice(0, 18).trimEnd()}…` : name
const countOf = (members: MapPlace[]) => members.reduce((n, p) => n + p.names.length, 0)
// A place's own pill shows its name; a shared address shows how many places are there.
const labelOf = (p: MapPlace) => p.names.length > 1 ? `${p.names.length} places` : short(p.names[0])
const widthOf = (text: string) => Math.round(24 + text.length * 6.4)

// SALT's venues as white pills over a base map (Google when a key is configured).
// Pills that would overlap on screen merge into one count pill, which zooms in
// when tapped, so everything on the map can be read and clicked. The latest
// answer's places and the selected place always keep their own pill.
export function VenueMap({ places, selected, fit, card, children, onSelect }: {
  places: MapPlace[]
  selected?: string
  // Bring these places into view (only if none are visible) whenever `at` changes.
  fit?: { keys: string[]; at: string }
  card?: ReactNode
  children?: ReactNode
  onSelect: (key: string | undefined) => void
}) {
  const [api, setApi] = useState<MapApi>()
  const [googleKey, setGoogleKey] = useState<string | null>()
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [cardH, setCardH] = useState(320)
  const boxRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchMapConfig().then((c) => setGoogleKey(c.googleMapsKey)) }, [])
  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight) }, [card, selected])

  // Gentle: move the map only when none of the places asked about are on screen.
  const fitted = useRef<string>(undefined)
  useEffect(() => {
    if (!api || !fit || fit.at === fitted.current) return
    fitted.current = fit.at
    const targets = places.filter((p) => fit.keys.includes(p.key))
    const visible = targets.some((p) => {
      const at = api.project(p.lat, p.lng)
      return at && (!size.w || (at.x > 40 && at.x < size.w - 40 && at.y > 80 && at.y < size.h - 40))
    })
    if (!visible) api.fit(targets.map((p) => [p.lat, p.lng]))
  }, [api, fit, places, size])

  // Lay out pills in priority order; later ones that would overlap join a count pill.
  const pills: Pill[] = []
  if (api) {
    const rank = (p: MapPlace) => (p.key === selected ? 0 : p.highlighted ? 1 : p.saved ? 2 : p.status === 'reservable' ? 3 : 4)
    const ordered = [...places].sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key))
    for (const p of ordered) {
      const at = api.project(p.lat, p.lng)
      if (!at || (size.w > 0 && (at.x < -60 || at.y < -30 || at.x > size.w + 60 || at.y > size.h + 30))) continue
      const solo = p.key === selected || p.highlighted
      const w = widthOf(labelOf(p))
      const hit = solo ? undefined : pills.find((q) => !q.solo && Math.abs(q.x - at.x) < (q.w + w) / 2 + GAP && Math.abs(q.y - at.y) < PILL_H + GAP)
      if (hit) { hit.members.push(p); hit.sx += at.x; hit.sy += at.y; hit.w = widthOf(String(countOf(hit.members))) + 6 }
      else pills.push({ key: p.key, x: at.x, y: at.y, w, members: [p], solo, sx: at.x, sy: at.y })
    }
  }
  // A count pill sits at the centre of what it stands for; tapping zooms in there.
  for (const pill of pills) if (pill.members.length > 1) { pill.x = pill.sx / pill.members.length; pill.y = pill.sy / pill.members.length }
  const open = (pill: Pill) => {
    if (pill.members.length === 1) return onSelect(pill.key === selected ? undefined : pill.key)
    onSelect(undefined)
    const lat = pill.members.reduce((s, p) => s + p.lat, 0) / pill.members.length, lng = pill.members.reduce((s, p) => s + p.lng, 0) / pill.members.length
    api?.zoomAt(lat, lng, 2)
  }

  const chosen = places.find((p) => p.key === selected)
  const anchor = chosen && api?.project(chosen.lat, chosen.lng)
  // Above the pill when it fits, else below; always inside the map.
  const cardPos = anchor && {
    left: Math.min(Math.max(anchor.x - CARD_W / 2, 10), Math.max(size.w - CARD_W - 10, 10)),
    top: anchor.y - cardH - 24 > 64 ? anchor.y - cardH - 24 : Math.min(anchor.y + 24, Math.max(size.h - cardH - 10, 64)),
  }

  return <div className="vm" ref={boxRef}>
    {googleKey
      ? <GoogleBackdrop apiKey={googleKey} onApi={setApi} onError={() => setGoogleKey(null)} />
      : googleKey === null && <SchematicBackdrop onApi={setApi} />}
    {api && <div className="vm-markers">
      {[...pills].sort((a, b) => Number(a.solo) - Number(b.solo)).map((pill) => {
        const one = pill.members.length === 1 ? pill.members[0] : undefined
        const n = countOf(pill.members)
        const text = one ? labelOf(one) : String(n)
        const name = one ? (one.names.length > 1 ? `${one.names.length} places at one address` : one.names[0]) : `${n} places nearby. Zoom in`
        // Positioned with left/top, not a transform: hover scaling must never move a pill out from under the cursor.
        return <button key={pill.key} style={{ left: pill.x, top: pill.y }}
          className={`vm-pill${one ? '' : ' is-cluster'}${one && one.names.length > 1 ? ' is-group' : ''}${one?.status === 'reservable' ? ' is-reservable' : ''}${pill.members.some((p) => p.saved) ? ' is-saved' : ''}${pill.members.some((p) => p.highlighted) ? ' is-hit' : ''}${pill.key === selected && one ? ' is-selected' : ''}`}
          aria-label={name} aria-pressed={one ? pill.key === selected : undefined}
          onClick={(event) => { event.stopPropagation(); open(pill) }}>
          {one?.saved && <i className="vm-saved" aria-hidden="true" />}{text}
        </button>
      })}
    </div>}
    {card && cardPos && <div className="vm-card" role="dialog" aria-label="Place details" ref={cardRef} style={{ left: cardPos.left, top: cardPos.top, width: CARD_W }}>{card}</div>}
    {children}
    {api && <div className="vm-zoom" role="group" aria-label="Zoom">
      <button aria-label="Zoom in" onClick={() => api.zoomBy(1)}>+</button>
      <button aria-label="Zoom out" onClick={() => api.zoomBy(-1)}>−</button>
    </div>}
  </div>
}
