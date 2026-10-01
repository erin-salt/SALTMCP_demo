import { useEffect, useRef } from 'react'

// SALT's own pitch to the customer, in SALT's frame rather than the host app.
// Kept to what SALT supports today (see the SALT repo, main branch).
export function ProductTeams({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus()
  }, [])

  return <div className="teams-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="teams" role="dialog" aria-modal="true" aria-labelledby="teams-title" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <button ref={closeRef} className="teams-close" onClick={onClose} aria-label="Close">×</button>
      <p className="teams-kicker">For product teams</p>
      <h2 id="teams-title">Turn your users’ saved places into plans they can act on</h2>

      <section>
        <h3>Where SALT fits</h3>
        <ol className="teams-flow">
          <li><b>Your product</b>The places your users already saved, their trip dates and party size</li>
          <li><b>SALT</b>Is each place still open? Is there a table around the time they want?</li>
          <li><b>Your product</b>Shows it your way, and hands off to booking</li>
        </ol>
      </section>

      <section>
        <h3>What you could build</h3>
        <ul>
          <li><b>A pre-trip scan</b> of every saved restaurant when dates are added, or before departure</li>
          <li><b>Plan-ready itineraries</b> where a meal slot fills from the user’s own saves</li>
          <li><b>Assistant answers</b> that can say “there’s a table at 7:45” instead of “check the website”</li>
          <li><b>Stale-save cleanup</b> that catches closed places before your users do</li>
        </ul>
      </section>

      <section>
        <h3>What a pilot looks like</h3>
        <ul>
          <li>A read-only scan of your users’ saved Boston restaurants, starting in Back Bay</li>
          <li>Connect over MCP with your own access key: <code>search_venues</code>, <code>get_venue</code>, <code>check_availability</code></li>
          <li>Measure what matters to you: saves resolved, places caught as closed, and clicks through to booking</li>
        </ul>
      </section>

      <p className="teams-note">SALT doesn’t recommend restaurants or take bookings. It answers questions about the places your users have already chosen.</p>
    </aside>
  </div>
}
