import { useState } from 'react'
import { to24h } from '../../domain/planMeal'
import type { AvailabilityRequest, AvailabilityResponse, AvailabilityState, SaltVenue } from '../../domain/types'
import { SaltMark } from './DemoShell'

export interface CheckExchange { id: string; label: string; request: AvailabilityRequest; source?: 'simulated' | 'live'; response?: AvailabilityResponse; error?: string }

const STATES: AvailabilityState[] = ['AVAILABLE', 'ALTERNATIVE_TIMES', 'NONE_REPORTED', 'UNKNOWN', 'NOT_SUPPORTED']
const clock = (iso: string) => iso.slice(11, 19) + 'Z'

// A developer's view of what crosses the boundary: SALT's public MCP tools, with
// the real parameter and field names. It shows only what any customer sees in
// SALT's published schema, never how SALT establishes its answers.
export function SaltRail({ connected, source, saved, venues, exchanges }: { connected: boolean; source: 'simulated' | 'live'; saved: number; venues: (SaltVenue | undefined)[]; exchanges: CheckExchange[] }) {
  const latest = exchanges[0]
  const linked = venues.filter(Boolean) as SaltVenue[]
  // Collapsed by default: value first, the contract one click away.
  const [expanded, setExpanded] = useState(false)
  return <>
    <aside className={`rail${connected ? '' : ' is-off'}`} id="salt-rail" aria-labelledby="rail-title">
      <header className="rail-head"><h2 id="rail-title"><SaltMark /></h2><span className={source === 'live' ? 'is-live' : undefined}>{source === 'live' ? '● LIVE · MCP' : 'MCP'}</span></header>
      {!connected && <p className="rail-off"><span className="rail-pulse" aria-hidden="true" />Not connected. The app is running without SALT.</p>}
      <div className="rail-log" aria-live="polite" hidden={!connected}>
        {(expanded ? exchanges : exchanges.slice(0, 1)).map((exchange, index) => <CheckEntry key={exchange.id} exchange={exchange} compact={!expanded || index > 0} />)}
        {expanded && <article className="rail-entry" aria-label="search_venues">
          <p className="rail-call"><code>search_venues</code><span>{source === 'live' ? 'live, on connect' : 'when each place was saved'}</span></p>
          <p className="rail-arg"><span>name</span>× {saved} saves</p>
          <p className="rail-return">← {linked.length} venues</p>
          <p className="rail-arg"><span>live_availability</span>{linked.filter((v) => v.live_availability).length}</p>
          <p className="rail-arg"><span>CLOSED_PERMANENTLY</span>{linked.filter((v) => v.status === 'CLOSED_PERMANENTLY').length}</p>
        </article>}
        <button className="rail-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide MCP calls' : 'Show MCP calls'}</button>
      </div>
      <details className="rail-owners">
        <summary>Who owns what</summary>
        <dl>
          <dt>The app knows</dt><dd>Trip, itinerary and party</dd><dd>Saved places and where they came from</dd>
          <dt className="is-salt">SALT returns</dt><dd>Each venue’s status, and whether it can be checked live</dd><dd>On request: times offered for a party, or why there are none</dd>
          <dt>The app decides</dt><dd>When to ask, what to show, timing notes</dd><dd>Handoff to a reservation provider</dd>
        </dl>
      </details>
      <p className="rail-foot">{source === 'live' ? 'Real contract · live responses' : 'Real contract · simulated responses'}</p>
    </aside>
    {connected && latest && <a className="rail-ticker" href="#salt-rail" aria-hidden="true" tabIndex={-1}>
      <SaltMark small />
      <span className="ticker-label">check_availability · {latest.label}</span>
      {latest.response ? <Strip response={latest.response} /> : <span className="rail-spinner" />}
    </a>}
  </>
}

function Strip({ response }: { response: AvailabilityResponse }) {
  return <span className="rail-strip" aria-hidden="true">{response.answers.map((answer) => <i key={answer.venue_id} className={answer.availability} />)}</span>
}

// The latest call is shown in full; earlier calls collapse to one line each.
function CheckEntry({ exchange: { label, request, response, error }, compact }: { exchange: CheckExchange; compact: boolean }) {
  const [open, setOpen] = useState(false)
  const checkedAt = response?.answers.find((a) => a.checked_at)?.checked_at
  const counts = STATES.map((state) => [state, response?.answers.filter((a) => a.availability === state).length ?? 0] as const).filter(([, n]) => n > 0)
  if (compact) return <article className="rail-entry is-compact" aria-label={`check_availability for ${label}`}>
    <p className="rail-call"><code>check_availability</code><span>{label}</span></p>
    <p className="rail-arg is-inline">"{request.time}" · party_size {request.party_size}</p>
    <p className="rail-arg is-inline">{error ? <span className="rail-error">error · {error}</span> : response ? <Strip response={response} /> : <><span className="rail-spinner" aria-hidden="true" />waiting</>}</p>
  </article>
  return <article className="rail-entry" aria-label={`check_availability for ${label}`}>
    <p className="rail-call"><code>check_availability</code><span>{label}</span></p>
    <p className="rail-arg"><span>venue_ids</span>[{request.venue_ids.length}]</p>
    <p className="rail-arg"><span>date</span>"{request.date}"</p>
    <p className="rail-arg"><span>time</span>"{request.time}"</p>
    <p className="rail-arg"><span>party_size</span>{request.party_size}</p>
    {error ? <p className="rail-return rail-error">← error · {error}</p>
      : !response
      ? <p className="rail-return"><span className="rail-spinner" aria-hidden="true" />waiting</p>
      : <>
        <p className="rail-return">← <Strip response={response} /></p>
        <ul className="rail-states">{counts.map(([state, n]) => <li key={state} className={state}><span>{state}</span>{n}</li>)}</ul>
        {checkedAt && <p className="rail-arg"><span>checked_at</span>{clock(checkedAt)}</p>}
        <button className="rail-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>answers</button>
        {open && <ul className="rail-answers">{response.answers.map((a) => <li key={a.venue_id}>
          <span>{a.name}</span><span className="rail-state">{a.availability}</span>{a.times.length > 0 && <span className="rail-times">{a.times.map(to24h).join(' ')}</span>}
        </li>)}</ul>}
      </>}
  </article>
}
