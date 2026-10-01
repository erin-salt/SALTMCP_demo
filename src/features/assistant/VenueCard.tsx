import { useState } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import { nearestTimes } from '../../domain/times'
import type { AvailabilityResponse, SavedPlace } from '../../domain/types'
import type { LiveVenue } from '../../salt/assistantClient'
import { fetchLiveAvailability } from '../../salt/liveSalt'
import { PlaceholderPhoto } from '../host/art'
import { Icon } from '../host/icons'
import { streetAddress } from './places'

const STATUS_LABEL: Record<string, string> = { OPERATING: 'Open', CLOSED_PERMANENTLY: 'Closed permanently', CLOSED_TEMPORARILY: 'Temporarily closed', UNKNOWN: 'Status unknown' }
interface Check { date: string; day: string; time: string; party: number }

// The host's venue card, Airbnb-style. Photo, description, cuisine, price and
// ratings are Trip Planner's own content, shown as placeholders; the facts
// under them come from SALT.
export function VenueCard({ venues, saves, savedByVenue, check, onAsk, onReserve, onClose }: {
  venues: LiveVenue[]
  // Without SALT: the user's own saves at this address.
  saves: SavedPlace[]
  savedByVenue: Map<string, SavedPlace>
  check: Check
  onAsk: (text: string) => void
  onReserve: (venue: LiveVenue, time: string) => void
  onClose: () => void
}) {
  const [pickedId, setPickedId] = useState<string>()
  const many = venues.length > 1
  const venue = venues.length === 1 ? venues[0] : venues.find((v) => v.venue_id === pickedId)

  if (many && !venue) return <div className="vc">
    <header className="vc-group-head"><b>{streetAddress(venues[0].address)}</b><span>{venues.length} places at this address</span><CloseButton onClose={onClose} /></header>
    <ul className="vc-group">{venues.map((v) => <li key={v.venue_id}><button onClick={() => setPickedId(v.venue_id)}>
      <span>{v.name}</span><small className={`vc-dot is-${v.status.toLowerCase()}`} data-salt>{STATUS_LABEL[v.status]}</small>
    </button></li>)}</ul>
  </div>

  const save = venue ? savedByVenue.get(venue.venue_id) : saves[0]
  const name = venue?.name ?? save?.name ?? ''
  return <div className="vc">
    <div className="vc-photo">
      <PlaceholderPhoto seed={venue?.venue_id ?? save?.id ?? name} />
      {many && <button className="vc-back" aria-label="All places at this address" onClick={() => setPickedId(undefined)}><Icon name="arrows" /></button>}
      <CloseButton onClose={onClose} />
    </div>
    <div className="vc-body">
      <h3>{name}{save && <small className="vc-saved">{venue ? 'Saved' : SOURCE_LABEL[save.source]}</small>}</h3>
      <Filler />
      <p className="vc-address">{streetAddress(venue?.address ?? save?.address)}</p>
      {venue
        ? <SaltFacts venue={venue} check={check} onAsk={onAsk} onReserve={onReserve} />
        : <p className="vc-off">Switch SALT on to see whether it’s open and has tables.</p>}
    </div>
  </div>
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return <button className="vc-close" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
}

// Trip Planner's own content, not part of this demo: placeholder bars and lorem.
function Filler() {
  return <div className="vc-filler" aria-label="Trip Planner content (placeholder)">
    <span className="vc-bars"><i style={{ width: 54 }} /><i style={{ width: 30 }} /><i style={{ width: 42 }} /></span>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>
  </div>
}

function SaltFacts({ venue, check, onAsk, onReserve }: { venue: LiveVenue; check: Check; onAsk: (text: string) => void; onReserve: (venue: LiveVenue, time: string) => void }) {
  const [answer, setAnswer] = useState<{ state: 'checking' } | { state: 'done'; response: AvailabilityResponse } | { state: 'error'; message: string }>()
  const [all, setAll] = useState(false)
  const open = venue.status === 'OPERATING'
  const ask = () => {
    setAnswer({ state: 'checking' })
    fetchLiveAvailability({ venue_ids: [venue.venue_id], date: check.date, time: check.time, party_size: check.party })
      .then((response) => setAnswer({ state: 'done', response }), (error: Error) => setAnswer({ state: 'error', message: error.message }))
  }
  const result = answer?.state === 'done' ? answer.response.answers[0] : undefined
  const times = (result?.times ?? []).map((time) => ({ time }))
  const label = new Date(`2000-01-01T${check.time}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const { shown, hidden } = nearestTimes(times, label)
  return <>
    <p className="vc-facts" data-salt>
      <span className={`as-status is-${venue.status.toLowerCase()}`}>{STATUS_LABEL[venue.status] ?? venue.status}</span>
      {open && <span>{venue.reservable === true ? 'Takes reservations' : venue.reservable === false ? 'No reservations' : 'Reservations unknown'}</span>}
      {open && venue.live_availability && <span>Live tables</span>}
    </p>
    {open && venue.live_availability && <div className="vc-tables">
      {!answer && <button className="vc-check" onClick={ask}>Check tables · {check.day}, {label} · {check.party} people</button>}
      {answer?.state === 'checking' && <p className="vc-status"><span className="salt-spinner" aria-hidden="true" />Checking with SALT…</p>}
      {answer?.state === 'error' && <p className="vc-status">{answer.message}. <button className="vc-link" onClick={ask}>Try again</button></p>}
      {result && (times.length
        ? <span className="chips" data-salt>{(all ? times : shown).map(({ time }) => <button key={time} className="time-chip" aria-label={`${venue.name} at ${time}`} onClick={() => onReserve(venue, time)}>{time}</button>)}
          {hidden > 0 && <button className="more-times" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Less' : `+${hidden}`}</button>}</span>
        : <p className="vc-status" data-salt>{result.availability === 'NONE_REPORTED' ? `No tables found around ${label}` : 'Couldn’t check just now'}</p>)}
    </div>}
    <button className="vc-link" onClick={() => onAsk(open ? `Tell me about tables at ${venue.name}` : `Tell me about ${venue.name}`)}>Ask the assistant</button>
  </>
}
