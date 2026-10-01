import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ADDRESS_LATLNG } from '../../data/backBayMap'
import { nearestTimes } from '../../domain/times'
import type { HostTrip, SavedPlace } from '../../domain/types'
import type { AssistantBlock, AssistantStatus, Directory, LiveAnswer, LiveVenue } from '../../salt/assistantClient'
import { displayTime } from '../../salt/liveSalt'
import { checkedLabel } from '../host/checked'
import { HandoffSheet, type Handoff } from '../host/HandoffSheet'
import { Icon } from '../host/icons'
import type { SaltMode } from '../host/TripPlannerApp'
import type { MapPlace } from './map/mapTypes'
import { VenueMap } from './map/VenueMap'
import { spotsFor, streetAddress } from './places'
import { VenueCard } from './VenueCard'

// The free-form assistant: a map of everything SALT covers in Back Bay, and a
// conversation beside it. Claude writes the conversation (the host's words);
// every fact comes from SALT and is shown from SALT's own results.
// `demo` marks a scripted exchange (never sent to the model); `filtered` names
// a suggestion SALT removed before it reached the user.
export interface LiveTurn { id: string; role: 'user' | 'assistant'; text: string; blocks?: AssistantBlock[]; pending?: boolean; error?: string; withSalt?: boolean; demo?: boolean; filtered?: string }

interface Props {
  trip: HostTrip
  saved: SavedPlace[]
  // SALT venue id -> the user's saved place, from linking the saves.
  savedByVenue: Map<string, SavedPlace>
  mode: SaltMode
  highlight: boolean
  turns: LiveTurn[]
  status?: AssistantStatus | null
  // SALT's Back Bay directory: undefined while loading, null if it failed.
  directory?: Directory | null
  now: number
  onSend: (text: string) => void
}

type Sheet = 'peek' | 'half' | 'full'
const STATUS_LABEL: Record<string, string> = { OPERATING: 'Open', CLOSED_PERMANENTLY: 'Closed permanently', CLOSED_TEMPORARILY: 'Temporarily closed', UNKNOWN: 'Status unknown' }
const isClosed = (status: string) => status.startsWith('CLOSED')
const fold = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'")

export function LiveAssistant({ trip, saved, savedByVenue, mode, turns, directory, now, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>()
  const [focus, setFocus] = useState<{ keys: string[]; at: string; after?: string }>()
  const focusSeq = useRef(0)
  const [sheet, setSheet] = useState<Sheet>('peek')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mapRef = useRef<HTMLElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  // On a phone the map sits under the demo's header: bring it to the top of the screen.
  const revealMap = () => { if (window.matchMedia?.('(max-width: 760px)').matches) mapRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }
  const busy = turns.some((turn) => turn.pending)
  const last = turns.at(-1)
  const withSalt = mode === 'with'
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [turns.length, last?.pending])

  // What the latest answer was about: shown as dark pills; nothing else fades.
  const latest = useMemo(() => [...turns].reverse().find((t) => t.role === 'assistant' && !t.pending && t.blocks?.length), [turns])
  // An answer that checked tables is about the places it checked, not everything it searched.
  const highlighted = useMemo(() => {
    const blocks = withSalt ? latest?.blocks ?? [] : []
    const checked = blocks.flatMap((b) => b.type === 'availability' ? b.response.answers.map((a) => a.venue_id) : [])
    return new Set(checked.length ? checked : blocks.flatMap((b) => b.type === 'venues' ? b.venues.map((v) => v.venue_id) : []))
  }, [latest, withSalt])

  const venues = useMemo(() => withSalt ? directory?.venues ?? [] : [], [withSalt, directory])
  const open = useMemo(() => venues.filter((v) => !isClosed(v.status)), [venues])
  const byId = useMemo(() => new Map(venues.map((v) => [v.venue_id, v])), [venues])
  const savedIds = new Set(savedByVenue.keys())
  // With SALT: every open place SALT has. Without: only the saves, from the host's own data.
  const places: MapPlace[] = withSalt
    ? [...spotsFor(open, (v) => v.address)].map(([key, group]) => ({
      key, lat: ADDRESS_LATLNG[key][0], lng: ADDRESS_LATLNG[key][1], names: group.map((v) => v.name), ids: group.map((v) => v.venue_id),
      status: group.some((v) => v.reservable === true) ? 'reservable' : 'other',
      match: true, highlighted: group.some((v) => highlighted.has(v.venue_id)), saved: group.some((v) => savedIds.has(v.venue_id)),
    }))
    : [...spotsFor(saved, (p) => p.address)].map(([key, group]) => ({
      key, lat: ADDRESS_LATLNG[key][0], lng: ADDRESS_LATLNG[key][1], names: group.map((p) => p.name), ids: [], status: 'saved',
      match: true, highlighted: false, saved: true,
    }))
  const q = fold(query.trim())
  const listed = q ? (withSalt ? open.filter((v) => fold(v.name).includes(q)).map((v) => ({ key: v.address ?? '', name: v.name })) : saved.filter((p) => fold(p.name).includes(q)).map((p) => ({ key: p.address ?? '', name: p.name }))).slice(0, 6) : []

  // Bring each new answer's places into view, only if none are on screen.
  const answerFit = useMemo(() => {
    if (!latest) return undefined
    const keys = [...new Set([...highlighted].map((id) => byId.get(id)?.address).filter((a): a is string => !!a))]
    return keys.length ? { keys, at: latest.id } : undefined
  }, [latest, highlighted, byId])
  // A place picked since the latest answer wins over the answer's own.
  const fit = focus && focus.after === latest?.id ? focus : answerFit

  const day = trip.days.find((d) => d.weekday.startsWith('Sat')) ?? trip.days[0]
  const check = { date: day.isoDate, day: day.weekday.slice(0, 3), time: '19:30', party: trip.partySize }

  const send = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    onSend(value)
    setDraft('')
    setSheet((s) => s === 'peek' ? 'half' : s)
    revealMap()
  }
  const submit = (event: FormEvent) => { event.preventDefault(); send(draft) }
  const reserve = (venueId: string, name: string, time: string, party: number, date: string) => {
    const place = savedByVenue.get(venueId)
    setHandoff({ name: place?.name ?? name, time, day: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }), party, bookingUrl: place?.bookingUrl })
  }
  // From the chat or the search: open its card, bringing it into view if needed.
  const show = (key: string) => { setSelected(key); setQuery(''); setFocus({ keys: [key], at: `pick-${++focusSeq.current}`, after: latest?.id }); setSheet('peek'); revealMap() }

  const atSpot = selected ? open.filter((v) => v.address === selected) : []
  const savesAtSpot = selected && !withSalt ? saved.filter((p) => p.address === selected) : []
  const card = atSpot.length || savesAtSpot.length
    ? <VenueCard key={selected} venues={atSpot} saves={savesAtSpot} savedByVenue={savedByVenue} check={check}
      onAsk={(text) => { setSelected(undefined); send(text) }}
      onReserve={(venue, time) => reserve(venue.venue_id, venue.name, time, check.party, check.date)}
      onClose={() => setSelected(undefined)} />
    : undefined

  // Mobile: the chat is a bottom sheet over the map; drag the handle to resize.
  const dragFrom = useRef<{ y: number; sheet: Sheet } | null>(null)
  const grab = (event: ReactPointerEvent) => { dragFrom.current = { y: event.clientY, sheet }; (event.target as Element).setPointerCapture?.(event.pointerId) }
  const release = (event: ReactPointerEvent) => {
    const from = dragFrom.current
    dragFrom.current = null
    if (!from) return
    const dy = event.clientY - from.y, steps: Sheet[] = ['peek', 'half', 'full'], i = steps.indexOf(from.sheet)
    setSheet(Math.abs(dy) < 8 ? steps[(i + 1) % 3] : steps[Math.max(0, Math.min(2, i + (dy < 0 ? 1 : -1) * (Math.abs(dy) > 220 ? 2 : 1)))])
  }

  return <div className={`as ex is-live is-${mode}`}>
    <section className="ex-map" aria-label="Back Bay" ref={mapRef}>
      <VenueMap places={places} selected={selected} fit={fit} card={card} onSelect={(key) => { setSelected(key); if (key) setSheet('peek') }}>
        <div className="ex-map-bar">
          <label className="ex-search"><Icon name="search" /><span className="visually-hidden">Find a place</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={withSalt ? `Search ${open.length || ''} places in Back Bay`.replace('  ', ' ') : 'Search your saves'} />
          </label>
          {listed.length > 0 && <ul className="ex-results">{listed.map((r) => <li key={r.name}><button onClick={() => show(r.key)}>{r.name}</button></li>)}</ul>}
        </div>
        {withSalt && directory === undefined && <p className="ex-overlay"><span className="salt-spinner" aria-hidden="true" />Loading SALT’s Back Bay directory…</p>}
        {withSalt && directory === null && <p className="ex-overlay">Couldn’t load SALT’s Back Bay directory. The assistant can still answer.</p>}
        {!withSalt && <p className="ex-overlay is-quiet">Without SALT, Trip Planner only knows your {saved.length} saved places.</p>}
      </VenueMap>
    </section>

    <section className={`ex-chat is-${sheet}`} aria-label="Trip Assistant">
      <button className="ex-handle" aria-label={sheet === 'full' ? 'Shrink the assistant' : 'Expand the assistant'} onPointerDown={grab} onPointerUp={release}><i /></button>
      <header className="as-head">
        <span className="as-logo"><span className="as-logo-mark"><Icon name="trip-chat" /></span>Trip Assistant<span className="tp-fictional">Fictional app</span></span>
      </header>
      <div className="as-thread" aria-live="polite">
        <Bubble from="assistant">
          {withSalt
            ? <p>Hi! Ask me anything about Back Bay’s restaurants: what’s there, what’s open, and where you can get a table.</p>
            : <p>Hi! I can help with your Boston weekend. You’ve saved {saved.length} places, but without SALT I can’t tell whether they’re open or have tables.</p>}
        </Bubble>
        {turns.map((turn) => turn.role === 'user'
          ? <Bubble key={turn.id} from="user">{turn.text}</Bubble>
          : <Bubble key={turn.id} from="assistant">
            {turn.pending
              ? <p className="as-checking"><span className="freshness is-checking" data-salt={withSalt || undefined}><span className="salt-spinner" aria-hidden="true" />{withSalt ? 'Checking with SALT' : 'Thinking'}</span></p>
              : turn.withSalt && !withSalt
                // Without SALT, no SALT facts anywhere, including the AI's words about them.
                ? <p className="as-hidden-answer">This answer came from SALT. Switch SALT on to see it.</p>
                : turn.error
                  ? <p className="as-error">{turn.error}</p>
                  : <>
                    <p className="as-prose">{turn.text}</p>
                    {turn.blocks?.length ? <TurnResults blocks={turn.blocks} savedByVenue={savedByVenue} now={now} addressOf={(id) => byId.get(id)?.address} onReserve={reserve} onShow={show} /> : null}
                    {turn.filtered && <a className="as-filtered" href="#salt-rail" data-salt>SALT removed {turn.filtered}: permanently closed. See the SALT panel.</a>}
                  </>}
          </Bubble>)}
        <div ref={endRef} />
      </div>
      <footer className="as-composer">
        <form className="as-form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="as-input">Message Trip Assistant</label>
          <textarea id="as-input" ref={inputRef} rows={1} maxLength={600} value={draft} placeholder={withSalt ? 'Ask about Back Bay’s restaurants…' : 'Ask about your saves…'}
            onFocus={() => setSheet((s) => s === 'peek' ? 'half' : s)}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(draft) } }} />
          <button className="as-send" type="submit" disabled={busy || !draft.trim()} aria-label="Send"><Icon name="travel" /></button>
        </form>
      </footer>
    </section>
    {handoff && <HandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />}
  </div>
}

function Bubble({ from, children }: { from: 'user' | 'assistant'; children: ReactNode }) {
  return <div className={`as-bubble is-${from}`}>{from === 'assistant' && <span className="as-avatar" aria-hidden="true"><Icon name="trip-chat" /></span>}<div className="as-bubble-body">{children}</div></div>
}

// Everything SALT returned for one answer, laid out around what was asked:
// one venue at several times reads as that venue's card; several venues at
// one time read as that time's card. Freshness is stated once.
function TurnResults({ blocks, savedByVenue, now, addressOf, onReserve, onShow }: { blocks: AssistantBlock[]; savedByVenue: Map<string, SavedPlace>; now: number; addressOf: (venueId: string) => string | undefined; onReserve: (venueId: string, name: string, time: string, party: number, date: string) => void; onShow: (address: string) => void }) {
  const checks = blocks.filter((b): b is Extract<AssistantBlock, { type: 'availability' }> => b.type === 'availability')
  const found = blocks.flatMap((b) => b.type === 'venues' ? b.venues : [])
  const show = (id: string) => { const address = addressOf(id); if (address) onShow(address) }
  const label = (r: { date: string; time: string; party_size: number }) => `${new Date(`${r.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${displayTime(`${r.date}T${r.time}`)} · ${r.party_size} ${r.party_size === 1 ? 'person' : 'people'}`
  const oneVenue = checks.length > 1 && checks.every((c) => c.response.answers.length === 1 && c.response.answers[0].venue_id === checks[0].response.answers[0].venue_id)
  const checkedAt = checks.flatMap((c) => c.response.answers.map((a) => a.checked_at)).filter(Boolean).sort().at(-1)

  return <div className="tr">
    {blocks.map((block, index) => {
      if (block.type === 'error') return <p key={index} className="as-note">SALT: {block.message}</p>
      if (block.type !== 'venues') return null
      if (!block.venues.length) return <p key={index} className="as-note" data-salt>No match in SALT’s Back Bay directory ({block.query}).</p>
      // When tables were checked, the answer is those places (shown with their times);
      // the wider search behind them stays out of the way.
      if (checks.length) return null
      const rest = block.venues
      if (!rest.length) return null
      if (rest.length > 3) return <VenueList key={index} venues={rest} query={block.query} onShow={onShow} />
      return <ul key={index} className="tr-card">{rest.map((venue) => <VenueRow key={venue.venue_id} venue={venue} saved={savedByVenue.get(venue.venue_id)} onShow={onShow} />)}</ul>
    })}
    {oneVenue
      ? (() => {
        const first = checks[0].response.answers[0]
        const venue = found.find((v) => v.venue_id === first.venue_id)
        return <div className="tr-card">
          <header className="tr-head"><Name id={first.venue_id} name={first.name} saved={savedByVenue.has(first.venue_id)} onShow={show} />{venue && <VenueFacts venue={venue} />}</header>
          <ul>{checks.map((c, index) => <TimesRow key={index} label={label(c.response)} answer={c.response.answers[0]} around={displayTime(`${c.response.date}T${c.response.time}`)}
            onReserve={(time) => onReserve(first.venue_id, first.name, time, c.response.party_size, c.response.date)} />)}</ul>
        </div>
      })()
      : checks.map((c, index) => <div key={index} className="tr-card">
        <header className="tr-head"><b>{label(c.response)}</b></header>
        <ul>{c.response.answers.map((a) => <TimesRow key={a.venue_id} label={<Name id={a.venue_id} name={a.name} saved={savedByVenue.has(a.venue_id)} onShow={show} />} answer={a} around={displayTime(`${c.response.date}T${c.response.time}`)}
          onReserve={(time) => onReserve(a.venue_id, a.name, time, c.response.party_size, c.response.date)} />)}</ul>
      </div>)}
    {checkedAt && <p className="tr-fresh"><span className="freshness" data-salt><i aria-hidden="true" />{checkedLabel(checkedAt, now)}</span></p>}
  </div>
}

function Name({ id, name, saved, onShow }: { id: string; name: string; saved: boolean; onShow: (id: string) => void }) {
  return <span className="tr-name"><button className="ex-name-link" onClick={() => onShow(id)}>{name}</button>{saved && <small className="vc-saved">Saved</small>}</span>
}

function VenueFacts({ venue }: { venue: LiveVenue }) {
  return <span className="tr-facts" data-salt>
    <span className={`as-status is-${venue.status.toLowerCase()}`}>{STATUS_LABEL[venue.status] ?? venue.status}</span>
    {venue.status === 'OPERATING' && <span>{venue.reservable === true ? 'Takes reservations' : venue.reservable === false ? 'No reservations' : 'Reservations unknown'}</span>}
  </span>
}

// One check's answer: what it's for on top, the times beneath.
function TimesRow({ label, answer, around, onReserve }: { label: ReactNode; answer: LiveAnswer; around: string; onReserve: (time: string) => void }) {
  const [all, setAll] = useState(false)
  const times = answer.times.map((iso) => ({ time: displayTime(iso) }))
  const { shown, hidden } = nearestTimes(times, around)
  return <li className="tr-row">
    <span className="tr-label">{label}</span>
    {times.length
      ? <span className="chips is-left" data-salt>{(all ? times : shown).map(({ time }) => <button key={time} className="time-chip" aria-label={`${answer.name} at ${time}`} onClick={() => onReserve(time)}>{time}</button>)}
        {hidden > 0 && <button className="more-times" aria-expanded={all} aria-label={all ? `Fewer times for ${answer.name}` : `${hidden} more times for ${answer.name}`} onClick={() => setAll(!all)}>{all ? 'Less' : `+${hidden}`}</button>}</span>
      : <span className="tr-none" data-salt>{answer.availability === 'NONE_REPORTED' ? 'No tables found around then' : answer.availability === 'NOT_SUPPORTED' ? 'SALT can’t check tables here yet' : 'Couldn’t check just now'}</span>}
  </li>
}

// A longer search result: names as chips that find the place on the map.
function VenueList({ venues, query, onShow }: { venues: LiveVenue[]; query: string; onShow: (address: string) => void }) {
  const [all, setAll] = useState(false)
  const shown = all ? venues : venues.slice(0, 12)
  // Only tag closures when the list mixes open and closed places.
  const mixed = venues.some((v) => isClosed(v.status)) && venues.some((v) => !isClosed(v.status))
  return <div className="ex-list">
    <p className="as-card-head">{venues.length} places · {query} · lit up on the map</p>
    <div className="ex-list-chips" data-salt>{shown.map((v) => <button key={v.venue_id} className={isClosed(v.status) ? 'is-closed' : ''} onClick={() => v.address && onShow(v.address)}>{v.name}{mixed && isClosed(v.status) && <small>Closed</small>}</button>)}
      {venues.length > shown.length && <button className="ex-more" onClick={() => setAll(true)}>+{venues.length - shown.length} more</button>}</div>
  </div>
}

function VenueRow({ venue, saved, onShow }: { venue: LiveVenue; saved?: SavedPlace; onShow: (address: string) => void }) {
  return <li className="tr-row">
    <span className="tr-label"><span className="tr-name"><button className="ex-name-link" onClick={() => venue.address && onShow(venue.address)}>{venue.name}</button>{saved && <small className="vc-saved">Saved</small>}</span>
      <small>{streetAddress(venue.address)}{venue.live_availability && venue.status === 'OPERATING' ? ' · Live tables' : ''}</small></span>
    <VenueFacts venue={venue} />
  </li>
}
