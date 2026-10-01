import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { GoogleBackdrop } from './GoogleBackdrop'
import { fetchMapConfig, type MapApi, type MapPlace } from './mapTypes'
import { SchematicBackdrop } from './SchematicBackdrop'

const CARD_W = 300

// SALT's venues as markers over a base map (Google when a key is configured),
// with the selected venue's card anchored to its marker, Airbnb-style.
export function VenueMap({ places, selected, fit, card, children, onSelect }: {
  places: MapPlace[]
  selected?: string
  // Fit the map to these places whenever `at` changes.
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

  // Fly to what the latest answer (or a tapped name) is about.
  const fitted = useRef<string>(undefined)
  useEffect(() => {
    if (!api || !fit || fit.at === fitted.current) return
    fitted.current = fit.at
    api.fit(places.filter((p) => fit.keys.includes(p.key)).map((p) => [p.lat, p.lng]))
  }, [api, fit, places])

  const order = (p: MapPlace) => (p.match ? 1 : 0) + (p.highlighted ? 2 : 0) + (p.flagged ? 1 : 0) + (p.key === selected ? 8 : 0)
  const chosen = places.find((p) => p.key === selected)
  const anchor = chosen && api?.project(chosen.lat, chosen.lng)
  // Above the marker when it fits, else below; always inside the map.
  const cardPos = anchor && {
    left: Math.min(Math.max(anchor.x - CARD_W / 2, 10), Math.max(size.w - CARD_W - 10, 10)),
    top: anchor.y - cardH - 22 > 64 ? anchor.y - cardH - 22 : Math.min(anchor.y + 22, Math.max(size.h - cardH - 10, 64)),
  }

  return <div className="vm" ref={boxRef}>
    {googleKey
      ? <GoogleBackdrop apiKey={googleKey} onApi={setApi} onError={() => setGoogleKey(null)} />
      : googleKey === null && <SchematicBackdrop onApi={setApi} />}
    {api && <div className="vm-markers">
      {[...places].sort((a, b) => order(a) - order(b)).map((p) => {
        const at = api.project(p.lat, p.lng)
        if (!at || (size.w > 0 && (at.x < -20 || at.y < -20 || at.x > size.w + 20 || at.y > size.h + 20))) return null
        const label = p.names.length > 1 ? `${p.names.length} places at one address` : p.names[0]
        return <button key={p.key} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
          className={`vm-pin is-${p.status}${p.names.length > 2 ? ' is-group' : ''}${p.match ? '' : ' is-dim'}${p.highlighted ? ' is-hit' : ''}${p.flagged ? ' is-flagged' : ''}${p.saved ? ' is-saved' : ''}${p.key === selected ? ' is-selected' : ''}`}
          aria-label={label} aria-pressed={p.key === selected} tabIndex={p.match ? 0 : -1} data-name={p.names.length > 1 ? `${p.names.length} places` : p.names[0]}
          onClick={(event) => { event.stopPropagation(); onSelect(p.key === selected ? undefined : p.key) }}>
          {p.names.length > 2 ? <b>{p.names.length}</b> : <i />}
        </button>
      })}
    </div>}
    {card && cardPos && <div className="vm-card" role="dialog" aria-label="Place details" ref={cardRef} style={{ left: cardPos.left, top: cardPos.top, width: CARD_W }}>{card}</div>}
    {children}
    {api && <div className="vm-zoom" role="group" aria-label="Zoom">
      <button aria-label="Zoom in" onClick={() => api.zoomBy(1)}>+</button>
      <button aria-label="Zoom out" onClick={() => api.zoomBy(-1)}>−</button>
      {api.zoomed && <button aria-label="Show all of Back Bay" className="vm-home" onClick={() => api.home()}>All</button>}
    </div>}
  </div>
}
