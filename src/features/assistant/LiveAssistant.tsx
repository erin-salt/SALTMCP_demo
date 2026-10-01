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
import { SCENARIOS, resolveScenario, type Scenario } from './scenarios'

// The free-form assistant: a map of everything SALT covers in Back Bay, and a
// conversation beside it. Claude writes the conversation (the host's words);
// every fact comes from SALT and is shown from SALT's own results.
// `scenario` marks a scripted demo exchange (never sent to the model).
export interface LiveTurn { id: string; role: 'user' | 'assistant'; text: string; blocks?: AssistantBlock[]; pending?: boolean; error?: string; withSalt?: boolean; scenario?: Scenario; demo?: boolean }

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
  // Play a scripted demo exchange: the user's ask, then Trip Planner's suggestions checked by SALT.
  onDemo: (ask: string, scenario: Scenario) => void
}

type Filter = 'all' | 'reservable'
type Sheet = 'peek' | 'half' | 'full'
const STARTERS = ['Which places on Newbury Street take reservations?', 'Which of my saves have a table for 4 on Saturday around 8?', 'What’s at the Prudential Center?']
const STATUS_LABEL: Record<string, string> = { OPERATING: 'Open', CLOSED_PERMANENTLY: 'Closed permanently', CLOSED_TEMPORARILY: 'Temporarily closed', UNKNOWN: 'Status unknown' }
const isClosed = (status: string) => status.startsWith('CLOSED')
const fold = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'")

export function LiveAssistant({ trip, saved, savedByVenue, mode, highlight, turns, directory, now, onSend, onDemo }: Props) {
  const [draft, setDraft] = useState('')
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>()
  const [about, setAbout] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [demoIntro, setDemoIntro] = useState(false)
  // The answer whose highlight the user dismissed with "Show all".
  const [clearedFor, setClearedFor] = useState<string>()
  const [focus, setFocus] = useState<{ keys: string[]; at: string; after?: string }>()
  const focusSeq = useRef(0)
  const [sheet, setSheet] = useState<Sheet>('peek')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mapRef = useRef<HTMLElement>(null)
  // On a phone the map sits under the demo's header: bring it to the top of the screen.
  const revealMap = () => { if (window.matchMedia?.('(max-width: 760px)').matches) mapRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((turn) => turn.pending)
  const last = turns.at(-1)
  const withSalt = mode === 'with'
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [turns.length, last?.pending])

  // What the latest answer was about: lit up on the map, which fits to it.
  const latest = useMemo(() => [...turns].reverse().find((t) => t.role === 'assistant' && !t.pending && (t.blocks?.length || t.scenario)), [turns])
  const highlighted = useMemo(() => new Set(withSalt && latest && latest.id !== clearedFor
    ? [...(latest.scenario?.venues.map((v) => v.venue_id) ?? []), ...(latest.blocks?.flatMap((b) => b.type === 'venues' ? b.venues.map((v) => v.venue_id) : b.type === 'availability' ? b.response.answers.map((a) => a.venue_id) : []) ?? [])]
    : []), [latest, withSalt, clearedFor])

  const venues = useMemo(() => withSalt ? directory?.venues ?? [] : [], [withSalt, directory])
  const byId = useMemo(() => new Map(venues.map((v) => [v.venue_id, v])), [venues])
  const savedIds = new Set(savedByVenue.keys())
  const q = fold(query.trim())
  const matches = (v: LiveVenue) => (filter === 'all' || (v.status === 'OPERATING' && v.reservable === true)) && (!q || fold(v.name).includes(q))
  // Closed places are a demo-only layer: hidden unless shown, or part of the latest answer.
  const onMap = venues.filter((v) => !isClosed(v.status) || showClosed || highlighted.has(v.venue_id))
  // With SALT: every venue SALT has. Without: only the saves, from the host's own data.
  const places: MapPlace[] = withSalt
    ? [...spotsFor(onMap, (v) => v.address)].map(([key, group]) => ({
      key, lat: ADDRESS_LATLNG[key][0], lng: ADDRESS_LATLNG[key][1], names: group.map((v) => v.name), ids: group.map((v) => v.venue_id),
      status: group.some((v) => v.status === 'OPERATING' && v.reservable === true) ? 'reservable' : group.every((v) => isClosed(v.status)) ? 'closed' : 'other',
      match: group.some(matches) && (!highlighted.size || group.some((v) => highlighted.has(v.venue_id)) || !!q || filter !== 'all'),
      highlighted: group.some((v) => highlighted.has(v.venue_id)), saved: group.some((v) => savedIds.has(v.venue_id)),
    }))
    : [...spotsFor(saved, (p) => p.address)].map(([key, group]) => ({
      key, lat: ADDRESS_LATLNG[key][0], lng: ADDRESS_LATLNG[key][1], names: group.map((p) => p.name), ids: [], status: 'saved',
      match: !q || group.some((p) => fold(p.name).includes(q)), highlighted: false, saved: true,
    }))
  const counts = { all: venues.filter((v) => !isClosed(v.status)).length, reservable: venues.filter((v) => v.status === 'OPERATING' && v.reservable === true).length, closed: venues.filter((v) => isClosed(v.status)).length }
  const showAll = () => { setClearedFor(latest?.id); setSelected(undefined); setFocus({ keys: places.map((p) => p.key), at: `all-${++focusSeq.current}`, after: latest?.id }) }
  const playDemo = (index: number) => {
    const scenario = resolveScenario(SCENARIOS[index % SCENARIOS.length], venues)
    if (!scenario || busy) return
    setShowClosed(true); setDemoIntro(false); setSelected(undefined); setSheet((s) => s === 'peek' ? 'half' : s); revealMap()
    onDemo(scenario.def.ask, scenario)
  }
  const nextDemo = (current?: Scenario) => playDemo(current ? SCENARIOS.findIndex((d) => d.id === current.def.id) + 1 : 0)
  const listed = q ? (withSalt ? venues.filter(matches).map((v) => ({ key: v.address ?? '', name: v.name })) : saved.filter((p) => fold(p.name).includes(q)).map((p) => ({ key: p.address ?? '', name: p.name }))).slice(0, 6) : []

  // Fit the map to each new answer's venues.
  const answerFit = useMemo(() => {
    if (!latest) return undefined
    const keys = [...new Set([...highlighted].map((id) => byId.get(id)?.address).filter((a): a is string => !!a))]
    return keys.length ? { keys, at: latest.id } : undefined
  }, [latest, highlighted, byId])
  // A place picked since the latest answer wins over the answer's own fit.
  const fit = focus && focus.after === latest?.id ? focus : answerFit

  // One-tap changes to the latest table check, instead of the assistant asking.
  const followUps = useMemo(() => {
    const last = turns.at(-1)
    const request = withSalt && last?.role === 'assistant' && !last.pending ? last.blocks?.filter((b) => b.type === 'availability').at(-1)?.request : undefined
    if (!request) return []
    const [h, m] = request.time.split(':').map(Number)
    const later = h < 21 ? `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}` : undefined
    return [
      ...trip.days.filter((d) => d.isoDate !== request.date).slice(0, 2).map((d) => ({ label: `${d.weekday} ${d.day} ${d.month}`, text: `Same check on ${d.weekday} ${d.month} ${d.day}` })),
      ...(later ? [{ label: `Around ${displayTime(`${request.date}T${later}`)}`, text: `Same check around ${displayTime(`${request.date}T${later}`)}` }] : []),
      ...(request.party_size < 6 ? [{ label: `For ${request.party_size + 2}`, text: `Same check for ${request.party_size + 2} people` }] : []),
    ]
  }, [turns, withSalt, trip.days])

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
  // From the chat or the search: select it and fly the map there.
  const show = (key: string) => { setSelected(key); setQuery(''); setFocus({ keys: [key], at: `pick-${++focusSeq.current}`, after: latest?.id }); setSheet('peek'); revealMap() }

  const atSpot = selected ? venues.filter((v) => v.address === selected) : []
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

  return <div className={`as ex is-live is-${mode}${highlight ? ' is-highlight' : ''}`}>
    <section className="ex-map" aria-label="Back Bay" ref={mapRef}>
      <VenueMap places={places} selected={selected} fit={fit} card={card} onSelect={(key) => { setSelected(key); if (key) setSheet('peek') }}>
        <div className="ex-map-bar">
          <label className="ex-search"><Icon name="search" /><span className="visually-hidden">Find a place</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={withSalt ? 'Search Back Bay' : 'Search your saves'} />
          </label>
          {withSalt && directory && <div className="ex-filter" role="group" aria-label="Show">
            {(['all', 'reservable'] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : 'Takes reservations'} <b data-salt>{counts[f]}</b></button>)}
            <button className="ex-demo-chip" aria-pressed={showClosed} onClick={() => { setShowClosed(!showClosed); setDemoIntro(!showClosed) }}><span>Demo</span>Closed venues</button>
          </div>}
          {withSalt && highlighted.size > 0 && <button className="ex-showall" onClick={showAll}>{highlighted.size} {highlighted.size === 1 ? 'place' : 'places'} from the chat <b>Show all ×</b></button>}
          {withSalt && directory && showClosed && demoIntro && <div className="ex-demo" role="note">
            <button className="ex-demo-close" aria-label="Close" onClick={() => setDemoIntro(false)}><Icon name="x" /></button>
            <p className="ex-demo-tag">Demo only</p>
            <p>SALT keeps a record of every permanently closed venue ({counts.closed} in Back Bay), so your app never sends a traveller somewhere that’s shut.</p>
            <p className="ex-demo-try">See it happen: Trip Planner suggests three places, and one has closed.</p>
            <div className="ex-demo-options">{SCENARIOS.map((d, i) => <button key={d.id} disabled={busy} onClick={() => playDemo(i)}>{d.title}</button>)}</div>
          </div>}
          {listed.length > 0 && <ul className="ex-results">{listed.map((r) => <li key={r.name}><button onClick={() => show(r.key)}>{r.name}</button></li>)}</ul>}
        </div>
        {highlight && withSalt && directory && <span className="ex-tag salt-tag">Places and statuses: SALT</span>}
        {withSalt && directory === undefined && <p className="ex-overlay"><span className="salt-spinner" aria-hidden="true" />Loading SALT’s Back Bay directory…</p>}
        {withSalt && directory === null && <p className="ex-overlay">Couldn’t load SALT’s Back Bay directory. The assistant can still answer.</p>}
        {!withSalt && <p className="ex-overlay is-quiet">Without SALT, Trip Planner only knows your {saved.length} saved places.</p>}
        {withSalt && directory && <ul className="ex-legend" aria-label="Key">
          <li><i className="is-reservable" />Takes reservations</li><li><i className="is-other" />Other places</li><li><i className="is-saved" />Your saves</li>{showClosed && <li><i className="is-closed" />Closed</li>}
        </ul>}
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
                  : turn.scenario
                    ? <ScenarioResult scenario={turn.scenario} highlight={highlight} onShow={show} onNext={() => nextDemo(turn.scenario)} busy={busy} />
                    : <>
                    {highlight && turn.blocks?.length ? <span className="as-tags"><span className="host-tag">Words: Trip Planner’s AI</span><span className="salt-tag">Facts: SALT</span></span> : null}
                    <p className="as-prose">{turn.text}</p>
                    {turn.blocks?.length ? <TurnResults blocks={turn.blocks} savedByVenue={savedByVenue} now={now} addressOf={(id) => byId.get(id)?.address} onReserve={reserve} onShow={show} /> : null}
                  </>}
          </Bubble>)}
        <div ref={endRef} />
      </div>
      <footer className="as-composer">
        {!turns.length && <div className="ex-starters" aria-label="Ideas">{(withSalt ? STARTERS : ['Which of my saves are open on Saturday?']).map((prompt) => <button key={prompt} className="as-suggestion" onClick={() => send(prompt)}>{prompt}</button>)}</div>}
        {!busy && followUps.length > 0 && <div className="ex-starters is-followups" aria-label="Change the check"><span>Try</span>{followUps.map((f) => <button key={f.label} className="as-suggestion" onClick={() => send(f.text)}>{f.label}</button>)}</div>}
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

// Demo: Trip Planner's own suggestions (scripted), then SALT's record for each.
function ScenarioResult({ scenario, highlight, busy, onShow, onNext }: { scenario: Scenario; highlight: boolean; busy: boolean; onShow: (address: string) => void; onNext: () => void }) {
  const closed = scenario.venues.find((v) => v.venue_id === scenario.closedId)!
  return <div className="sc">
    <span className="as-tags"><span className="sc-demo">Demo · scripted</span>{highlight && <><span className="host-tag">Suggestions: Trip Planner’s AI</span><span className="salt-tag">Check: SALT</span></>}</span>
    <p className="as-prose">Here are three ideas: {scenario.venues[0].name}, {scenario.venues[1].name} and {scenario.venues[2].name}.</p>
    <div className="tr-card sc-card">
      <header className="tr-head"><b>Checked with SALT before showing you</b></header>
      <ul>{scenario.venues.map((v) => {
        const gone = v.venue_id === scenario.closedId
        return <li key={v.venue_id} className={`tr-row sc-row${gone ? ' is-gone' : ''}`}>
          <span className="tr-label"><span className="tr-name"><button className="ex-name-link" onClick={() => v.address && onShow(v.address)}>{v.name}</button></span><small>{streetAddress(v.address)}</small></span>
          <span className="sc-verdict" data-salt>{gone ? 'Permanently closed' : v.reservable === true ? 'Open · Takes reservations' : 'Open'}</span>
        </li>
      })}</ul>
    </div>
    <p className="sc-caught">SALT caught that {closed.name} has closed for good, so Trip Planner can drop it before a traveller turns up to a locked door.</p>
    <button className="vc-ask" disabled={busy} onClick={onNext}>Try another</button>
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
  const checkedIds = new Set(checks.flatMap((c) => c.response.answers.map((a) => a.venue_id)))
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
      // A place that was also checked for tables appears with its times instead.
      const rest = block.venues.filter((v) => !checkedIds.has(v.venue_id))
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
