import { useEffect, useRef } from 'react'
import { Icon } from './icons'

export interface Handoff { name: string; time: string; day: string; party: number; bookingUrl?: string }

// The host hands the user to the restaurant's own booking page. SALT supplies
// no booking link and books nothing; the link is the host's data.
export function HandoffSheet({ handoff, onClose }: { handoff: Handoff; onClose: () => void }) {
  const primaryRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    primaryRef.current?.focus()
    return () => previous?.focus()
  }, [])

  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <p className="sheet-kicker">Leaving Trip Planner</p>
      <h2 id="sheet-title">Reserve {handoff.name}</h2>
      <p className="sheet-detail">{handoff.day} · {handoff.time} · {handoff.party} people</p>
      <p className="sheet-body">Bookings go straight to the restaurant. No platform in between, no commission taken.</p>
      <div className="sheet-actions">
        {handoff.bookingUrl
          ? <a ref={primaryRef} className="tp-button" href={handoff.bookingUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}>Book direct with {handoff.name} <Icon name="external" /></a>
          : null}
        <button ref={handoff.bookingUrl ? undefined : primaryRef} className="tp-link" onClick={onClose}>Back to trip</button>
      </div>
    </section>
  </div>
}
