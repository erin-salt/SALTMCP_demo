import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ADDRESS_POINTS } from '../../data/backBayMap'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import { nearestTimes } from '../../domain/times'
import type { HostTrip, SavedPlace } from '../../domain/types'
import type { AssistantBlock, AssistantStatus, Directory, LiveAnswer, LiveVenue } from '../../salt/assistantClient'
import { displayTime } from '../../salt/liveSalt'
import { PlaceholderPhoto } from '../host/art'
import { checkedLabel } from '../host/checked'
import { HandoffSheet, type Handoff } from '../host/HandoffSheet'
import { Icon } from '../host/icons'
import type { SaltMode } from '../host/TripPlannerApp'
import { BackBayMap, type MapSpot } from './BackBayMap'
import { spotsFor, streetAddress } from './places'

// The free-form assistant: a map of everything SALT covers in Back Bay, and a
// conversation beside it. Claude writes the conversation (the host's words);
// every fact comes from SALT and is shown from SALT's own results.
export interface LiveTurn { id: string; role: 'user' | 'assistant'; text: string; blocks?: AssistantBlock[]; pending?: boolean; error?: string; withSalt?: boolean }

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

type Filter = 'all' | 'open' | 'closed'
const STARTERS = ['What’s closed on Newbury Street?', 'Which of my saves have a table for 4 on Saturday around 8?', 'What’s at the Prudential Center?']
const STATUS_LABEL: Record<string, string> = { OPERATING: 'Open', CLOSED_PERMANENTLY: 'Closed permanently', CLOSED_TEMPORARILY: 'Temporarily closed', UNKNOWN: 'Status unknown' }
const isClosed = (status: string) => status.startsWith('CLOSED')
const fold = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'")

export function LiveAssistant({ trip, saved, savedByVenue, mode, highlight, turns, status, directory, now, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>()
  const [about, setAbout] = useState(false)
  const [focus, setFocus] = useState<{ key: string; at: number }>()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((turn) => turn.pending)
  const last = turns.at(-1)
  const withSalt = mode === 'with'
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [turns.length, last?.pending])

  // What the latest answer was about, lit up on the map.
  const highlighted = useMemo(() => {
    const answer = [...turns].reverse().find((t) => t.role === 'assistant' && !t.pending && t.blocks?.length)
    return new Set(answer?.blocks?.flatMap((b) => b.type === 'venues' ? b.venues.map((v) => v.venue_id) : b.type === 'availability' ? b.response.answers.filter((a) => a.times.length).map((a) => a.venue_id) : []) ?? [])
  }, [turns])

  const venues = withSalt ? directory?.venues ?? [] : []
  const savedIds = new Set(savedByVenue.keys())
  const q = fold(query.trim())
  const matches = (v: LiveVenue) => (filter === 'all' || (filter === 'closed') === isClosed(v.status)) && (!q || fold(v.name).includes(q))
  // With SALT: every venue SALT has. Without: only the saves, from the host's own data.
  const spots: MapSpot[] = withSalt
    ? [...spotsFor(venues, (v) => v.address)].map(([key, group]) => ({
      key, x: ADDRESS_POINTS[key][0], y: ADDRESS_POINTS[key][1], names: group.map((v) => v.name), ids: group.map((v) => v.venue_id),
      status: group.some((v) => v.status === 'OPERATING') ? 'open' : group.every((v) => isClosed(v.status)) ? 'closed' : 'unknown',
      match: group.some(matches), highlighted: group.some((v) => highlighted.has(v.venue_id)), saved: group.some((v) => savedIds.has(v.venue_id)),
    }))
    : [...spotsFor(saved, (p) => p.address)].map(([key, group]) => ({
      key, x: ADDRESS_POINTS[key][0], y: ADDRESS_POINTS[key][1], names: group.map((p) => p.name), ids: [], status: 'saved',
      match: !q || group.some((p) => fold(p.name).includes(q)), highlighted: false, saved: true,
    }))
  const counts = { all: venues.length, open: venues.filter((v) => v.status === 'OPERATING').length, closed: venues.filter((v) => isClosed(v.status)).length }
  const listed = q ? (withSalt ? venues.filter(matches).map((v) => ({ key: v.address ?? '', name: v.name })) : saved.filter((p) => fold(p.name).includes(q)).map((p) => ({ key: p.address ?? '', name: p.name }))).slice(0, 6) : []

  const send = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    onSend(value)
    setDraft('')
  }
  const fill = (text: string) => { setDraft(text); inputRef.current?.focus() }
  const submit = (event: FormEvent) => { event.preventDefault(); send(draft) }
  const reserve = (venueId: string, name: string, time: string, party: number, date: string) => {
    const place = savedByVenue.get(venueId)
    setHandoff({ name: place?.name ?? name, time, day: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }), party, bookingUrl: place?.bookingUrl })
  }
  const pick = (key: string) => { setSelected(key === selected ? undefined : key); setQuery('') }
  // From the chat or the search: select it and fly the map there.
  const mapRef = useRef<HTMLElement>(null)
  const show = (key: string) => {
    setSelected(key); setQuery(''); setFocus((f) => ({ key, at: (f?.at ?? 0) + 1 }))
    // On a phone the map sits above the chat: bring it into view.
    if (window.matchMedia?.('(max-width: 760px)').matches) mapRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }
  const atSpot = selected ? (withSalt ? venues.filter((v) => v.address === selected) : []) : []
  const savesAtSpot = selected && !withSalt ? saved.filter((p) => p.address === selected) : []

  return <div className={`as ex is-live is-${mode}${highlight ? ' is-highlight' : ''}`}>
    <section className="ex-map" aria-label="Back Bay" ref={mapRef}>
      <div className="ex-map-bar">
        <label className="ex-search"><Icon name="search" /><span className="visually-hidden">Find a place</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={withSalt ? `Find a place in Back Bay${directory ? ` · ${directory.total} venues` : ''}` : 'Find one of your saves'} />
        </label>
        {withSalt && directory && <div className="ex-filter" role="group" aria-label="Show">
          {(['all', 'open', 'closed'] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Closed'} <b data-salt>{counts[f]}</b></button>)}
        </div>}
        {listed.length > 0 && <ul className="ex-results">{listed.map((r) => <li key={r.name}><button onClick={() => show(r.key)}>{r.name}</button></li>)}</ul>}
      </div>
      <div className="ex-canvas">
        <BackBayMap spots={spots} selected={selected} focus={focus} onSelect={pick} />
        {highlight && withSalt && directory && <span className="ex-tag salt-tag">Places and statuses: SALT</span>}
        {withSalt && directory === undefined && <p className="ex-overlay"><span className="salt-spinner" aria-hidden="true" />Loading SALT’s Back Bay directory…</p>}
        {withSalt && directory === null && <p className="ex-overlay">Couldn’t load SALT’s Back Bay directory. The assistant can still answer.</p>}
        {!withSalt && <p className="ex-overlay is-quiet">Without SALT, Trip Planner only knows your {saved.length} saved places.</p>}
        {(atSpot.length > 0 || savesAtSpot.length > 0) && <div className="ex-sheet" role="dialog" aria-label="Place details">
          <button className="ex-sheet-close" aria-label="Close" onClick={() => setSelected(undefined)}>×</button>
          <p className="ex-sheet-address">{streetAddress(selected)}{atSpot.length > 1 ? ` · ${atSpot.length} places` : ''}</p>
          <ul>
            {atSpot.map((v) => <li key={v.venue_id}>
              <span className="ex-sheet-name">{v.name}{savedIds.has(v.venue_id) && <small className="ex-saved-mark">Saved</small>}</span>
              <span className="ex-facts" data-salt>
                <span className={`as-status is-${v.status.toLowerCase()}`}>{STATUS_LABEL[v.status] ?? v.status}</span>
                {v.status === 'OPERATING' && <span>{v.reservable === true ? 'Takes reservations' : v.reservable === false ? 'No reservations' : 'Reservations unknown'}</span>}
                {v.status === 'OPERATING' && v.live_availability && <span>Live tables</span>}
              </span>
              {v.status === 'OPERATING' && <button className="ex-ask" onClick={() => fill(v.live_availability ? `Is there a table at ${v.name} for ${trip.partySize} on Saturday around 7:30?` : `Tell me about ${v.name}`)}>{v.live_availability ? 'Ask about a table' : 'Ask'}</button>}
            </li>)}
            {savesAtSpot.map((p) => <li key={p.id}><span className="ex-sheet-name">{p.name}<small className="ex-saved-mark">{SOURCE_LABEL[p.source]}</small></span></li>)}
          </ul>
        </div>}
        {withSalt && directory && <ul className="ex-legend" aria-label="Key">
          <li><i className="is-open" />Open</li><li><i className="is-closed" />Closed</li><li><i className="is-unknown" />Status unknown</li><li><i className="is-saved" />Your saves</li>
        </ul>}
        <p className="ex-credit">Schematic map · positions approximate</p>
      </div>
    </section>

    <section className="ex-chat" aria-label="Trip Assistant">
      <header className="as-head">
        <span className="as-logo"><span className="as-logo-mark"><Icon name="trip-chat" /></span>Trip Assistant<span className="tp-fictional">Fictional app</span></span>
      </header>
      <div className="as-thread" aria-live="polite">
        <Bubble from="assistant">
          {withSalt
            ? <p>Hi! Ask me anything about Back Bay’s restaurants: what’s there, what’s open, and where you can get a table.</p>
            : <p>Hi! I can help with your Boston weekend. You’ve saved {saved.length} places, but without SALT I can’t tell whether they’re open or have tables.</p>}
          {withSalt && <button className="ex-about" aria-expanded={about} onClick={() => setAbout(!about)}>{about ? 'Hide' : 'What can SALT tell me?'}</button>}
          {withSalt && about && <div className="ex-about-body">
            <p data-salt>SALT knows every restaurant in Back Bay, whether it’s open or closed, whether it takes reservations, and, for many, live tables for your time and party.</p>
            <p>It doesn’t rank or recommend, and has no menus, reviews or hours. You book direct with the restaurant.</p>
          </div>}
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
                    {highlight && turn.blocks?.length ? <span className="as-tags"><span className="host-tag">Words: Trip Planner’s AI</span><span className="salt-tag">Facts: SALT</span></span> : null}
                    <p className="as-prose">{turn.text}</p>
                    {turn.blocks?.map((block, index) => <ResultBlock key={index} block={block} savedByVenue={savedByVenue} now={now} onReserve={reserve} onShow={show} />)}
                    {turn.blocks?.some((b) => b.type !== 'error') && <Receipt blocks={turn.blocks} />}
                  </>}
          </Bubble>)}
        <div ref={endRef} />
      </div>
      <footer className="as-composer">
        {!turns.length && <div className="ex-starters" aria-label="Ideas">{(withSalt ? STARTERS : ['Which of my saves are open on Saturday?']).map((prompt) => <button key={prompt} className="as-suggestion" onClick={() => send(prompt)}>{prompt}</button>)}</div>}
        <form className="as-form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="as-input">Message Trip Assistant</label>
          <textarea id="as-input" ref={inputRef} rows={1} maxLength={600} value={draft} placeholder={withSalt ? 'Ask about Back Bay’s restaurants…' : 'Ask about your saves…'}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(draft) } }} />
          <button className="as-send" type="submit" disabled={busy || !draft.trim()} aria-label="Send"><Icon name="travel" /></button>
        </form>
        <p className="as-footnote">{withSalt ? <>Facts from SALT · words by {status?.model.startsWith('claude') ? 'Claude' : 'AI'} for Trip Planner</> : <>SALT is off: the assistant only knows your saved places.</>}</p>
      </footer>
    </section>
    {handoff && <HandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />}
  </div>
}

function Bubble({ from, children }: { from: 'user' | 'assistant'; children: ReactNode }) {
  return <div className={`as-bubble is-${from}`}>{from === 'assistant' && <span className="as-avatar" aria-hidden="true"><Icon name="trip-chat" /></span>}<div className="as-bubble-body">{children}</div></div>
}

function ResultBlock({ block, savedByVenue, now, onReserve, onShow }: { block: AssistantBlock; savedByVenue: Map<string, SavedPlace>; now: number; onReserve: (venueId: string, name: string, time: string, party: number, date: string) => void; onShow: (address: string) => void }) {
  if (block.type === 'error') return <p className="as-note">SALT: {block.message}</p>
  if (block.type === 'venues') {
    if (!block.venues.length) return <p className="as-note" data-salt>No match in SALT’s Back Bay directory ({block.query}).</p>
    if (block.venues.length <= 3) return <ul className="as-options as-venues">{block.venues.map((venue) => <VenueRow key={venue.venue_id} venue={venue} saved={savedByVenue.get(venue.venue_id)} onShow={onShow} />)}</ul>
    return <VenueList venues={block.venues} query={block.query} onShow={onShow} />
  }
  const { response } = block
  const checkedAt = response.answers.find((a) => a.checked_at)?.checked_at
  return <div className="as-availability">
    <p className="as-card-head">{new Date(`${response.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })} · around {displayTime(`${response.date}T${response.time}`)} · {response.party_size} people</p>
    <ul className="as-options">{response.answers.map((answer) => <AnswerRow key={answer.venue_id} answer={answer} saved={savedByVenue.get(answer.venue_id)} around={displayTime(`${response.date}T${response.time}`)} onReserve={(time) => onReserve(answer.venue_id, answer.name, time, response.party_size, response.date)} />)}</ul>
    {checkedAt && <p className="as-checked"><span className="freshness" data-salt><i aria-hidden="true" />{checkedLabel(checkedAt, now)}</span></p>}
  </div>
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
  return <li>
    <PlaceholderPhoto seed={venue.venue_id} className="as-thumb" />
    <span className="as-option-name"><button className="ex-name-link" onClick={() => venue.address && onShow(venue.address)}>{venue.name}</button><small>{venue.address ? `${streetAddress(venue.address)} · ` : ''}{saved ? `${SOURCE_LABEL[saved.source]} · ` : ''}{venue.reservable === true ? 'Takes reservations' : venue.reservable === false ? 'No reservations' : 'Reservations unknown'}{venue.live_availability ? ' · Live tables' : ''}</small></span>
    <span className={`as-status is-${venue.status.toLowerCase()}`} data-salt>{STATUS_LABEL[venue.status] ?? venue.status}</span>
  </li>
}

function AnswerRow({ answer, saved, around, onReserve }: { answer: LiveAnswer; saved?: SavedPlace; around: string; onReserve: (time: string) => void }) {
  const [all, setAll] = useState(false)
  const times = answer.times.map((iso) => ({ time: displayTime(iso) }))
  const { shown, hidden } = nearestTimes(times, around)
  return <li>
    <PlaceholderPhoto seed={answer.venue_id} className="as-thumb" />
    <span className="as-option-name">{answer.name}<small>{saved ? SOURCE_LABEL[saved.source] : 'Not in your saves'}</small></span>
    {times.length
      ? <span className="chips" data-salt>{(all ? times : shown).map(({ time }) => <button key={time} className="time-chip" aria-label={`${answer.name} at ${time}`} onClick={() => onReserve(time)}>{time}</button>)}
        {hidden > 0 && <button className="more-times" aria-expanded={all} aria-label={all ? `Fewer times for ${answer.name}` : `${hidden} more times for ${answer.name}`} onClick={() => setAll(!all)}>{all ? 'Less' : `+${hidden}`}</button>}</span>
      : <span className="row-note" data-salt>{answer.availability === 'NONE_REPORTED' ? 'No tables found' : answer.availability === 'NOT_SUPPORTED' ? 'Can’t check live' : 'Couldn’t check just now'}</span>}
  </li>
}

// "Checked with SALT": the tool calls behind the answer, for anyone who wants
// to see exactly what was asked.
function Receipt({ blocks }: { blocks: AssistantBlock[] }) {
  const [open, setOpen] = useState(false)
  const calls = blocks.filter((b) => b.type !== 'error')
  return <div className="as-receipt">
    <button className="as-receipt-toggle" aria-expanded={open} onClick={() => setOpen(!open)} data-salt>
      Checked with SALT · {[...new Set(calls.map((b) => b.type === 'venues' ? 'search_venues' : 'check_availability'))].join(', ')}
    </button>
    {open && <ul>{calls.map((b, i) => <li key={i}><code>{b.type === 'venues' ? `search_venues(neighbourhood: "back_bay", include_closed: true) → ${b.venues.length} (${b.query})` : `check_availability(venue_ids: [${b.request.venue_ids.length}], date: "${b.request.date}", time: "${b.request.time}", party_size: ${b.request.party_size})`}</code></li>)}</ul>}
  </div>
}
