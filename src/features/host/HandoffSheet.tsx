import { useEffect, useRef } from 'react'
import { Icon } from './icons'

export interface Handoff { name: string; time: string; day: string; party: number; checkedAt?: string }

// WAYFARER hands the user to a reservation provider. The demo ends here:
// nothing is held, booked or paid for.
export function HandoffSheet({ handoff, onClose }: { handoff: Handoff; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus()
  }, [])

  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <p className="sheet-kicker">Leaving Trip Planner</p>
      <h2 id="sheet-title">Reserve {handoff.name}</h2>
      <p className="sheet-detail">{handoff.day} · {handoff.time} · {handoff.party} people</p>
      <p className="sheet-body">{handoff.checkedAt && <>This time was offered when checked at {new Date(handoff.checkedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. </>}The restaurant’s reservation provider confirms the table. Until then, nothing is booked.</p>
      <div className="sheet-actions">
        <button className="tp-button" disabled aria-describedby="sheet-end">Continue to provider <Icon name="external" /></button>
        <button ref={closeRef} className="tp-link" onClick={onClose}>Back to trip</button>
      </div>
      <p className="sheet-end" id="sheet-end">Demo ends at the handoff</p>
    </section>
  </div>
}
