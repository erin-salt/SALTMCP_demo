import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import { nearestTimes } from '../../domain/times'
import type { HostTrip, SavedPlace } from '../../domain/types'
import type { AssistantBlock, AssistantStatus, Coverage, LiveAnswer, LiveVenue } from '../../salt/assistantClient'
import { displayTime } from '../../salt/liveSalt'
import { PlaceholderPhoto } from '../host/art'
import { checkedLabel } from '../host/checked'
import { HandoffSheet, type Handoff } from '../host/HandoffSheet'
import { Icon } from '../host/icons'
import type { SaltMode } from '../host/TripPlannerApp'

// The free-form assistant: Claude writes the conversation (the host's words);
// every fact comes from SALT and is shown as a card built from SALT's results.
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
  coverage?: Coverage | null
  now: number
  onSend: (text: string) => void
}

const SUGGESTIONS: { group: string; prompts: string[] }[] = [
  { group: 'Try it', prompts: ['Which of my saves have a table for 4 on Saturday around 8?', 'Lunch for 2 on Sunday at any of my saves?'] },
  { group: 'Check a place', prompts: ['Is Lucca Back Bay still open?', 'Does Sorellina take reservations?'] },
  { group: 'Test the limits', prompts: ['What’s the best Italian restaurant in Back Bay?', 'Can you book Krasi for me?', 'Any tables in Seattle tonight?'] },
]
const STATUS_LABEL: Record<string, string> = { OPERATING: 'Open', CLOSED_PERMANENTLY: 'Closed permanently', CLOSED_TEMPORARILY: 'Temporarily closed', UNKNOWN: 'Status unknown' }

export function LiveAssistant({ trip, saved, savedByVenue, mode, highlight, turns, status, coverage, now, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((turn) => turn.pending)
  const last = turns.at(-1)
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [turns.length, last?.pending])

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

  return <div className={`as is-live is-${mode}${highlight ? ' is-highlight' : ''}`}>
    <header className="as-head">
      <span className="as-logo"><span className="as-logo-mark"><Icon name="trip-chat" /></span>Trip Assistant<span className="tp-fictional">Fictional app</span></span>
      <span className="as-context"><Icon name="you" />{trip.title} · {trip.dates} · {saved.length} saved places</span>
    </header>

    <div className="as-thread" aria-live="polite">
      <Bubble from="assistant">
        <CapabilityCard mode={mode} saved={saved} coverage={coverage} onPick={fill} />
      </Bubble>
      {turns.map((turn) => turn.role === 'user'
        ? <Bubble key={turn.id} from="user">{turn.text}</Bubble>
        : <Bubble key={turn.id} from="assistant">
          {turn.pending
            ? <p className="as-checking"><span className="freshness is-checking" data-salt={mode === 'with' || undefined}><span className="salt-spinner" aria-hidden="true" />{mode === 'with' ? 'Thinking and checking with SALT' : 'Thinking'}</span></p>
            : turn.withSalt && mode === 'without'
              // Without SALT, no SALT facts anywhere, including the AI's words about them.
              ? <p className="as-hidden-answer">This answer came from SALT. Switch SALT on to see it.</p>
              : turn.error
              ? <p className="as-error">{turn.error}</p>
              : <>
                {highlight && turn.blocks?.length ? <span className="as-tags"><span className="host-tag">Words: Trip Planner’s AI</span><span className="salt-tag">Facts: SALT</span></span> : null}
                <p className="as-prose">{turn.text}</p>
                {turn.blocks?.map((block, index) => <ResultBlock key={index} block={block} savedByVenue={savedByVenue} now={now} onReserve={reserve} />)}
                {turn.blocks?.some((b) => b.type !== 'error') && <Receipt blocks={turn.blocks} />}
              </>}
        </Bubble>)}
      <div ref={endRef} />
    </div>

    <footer className="as-composer">
      {!busy && <div className="as-suggestion-groups" aria-label="Suggested questions">
        {SUGGESTIONS.map(({ group, prompts }) => <div key={group} className="as-suggestion-group">
          <span>{group}</span>
          <div>{prompts.map((prompt) => <button key={prompt} className="as-suggestion" onClick={() => send(prompt)}>{prompt}</button>)}</div>
        </div>)}
      </div>}
      <form className="as-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="as-input">Message Trip Assistant</label>
        <textarea id="as-input" ref={inputRef} rows={1} maxLength={600} value={draft} placeholder="Ask about any Back Bay restaurant, or your saves…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(draft) } }} />
        <button className="as-send" type="submit" disabled={busy || !draft.trim()} aria-label="Send"><Icon name="travel" /></button>
      </form>
      <p className="as-footnote">{mode === 'with'
        ? <>Live: answers use SALT’s real data{status ? <> · written by Claude for Trip Planner</> : null}. Covers Back Bay, Boston.</>
        : <>SALT is off: the assistant only knows your saved places.</>}</p>
    </footer>
    {handoff && <HandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />}
  </div>
}

function Bubble({ from, children }: { from: 'user' | 'assistant'; children: ReactNode }) {
  return <div className={`as-bubble is-${from}`}>{from === 'assistant' && <span className="as-avatar" aria-hidden="true"><Icon name="trip-chat" /></span>}<div className="as-bubble-body">{children}</div></div>
}

// What the viewer can try, what it can't do, and where it works. The live
// list is coverage, not a recommendation: alphabetical, everything SALT checks.
function CapabilityCard({ mode, saved, coverage, onPick }: { mode: SaltMode; saved: SavedPlace[]; coverage?: Coverage | null; onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  if (mode === 'without') return <p>Hi! I can help with your Boston weekend. You’ve saved {saved.length} places. Without SALT I can’t check whether they’re open or have tables, but I can list them for you.</p>
  const live = [...(coverage?.live ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  return <div className="as-capabilities">
    <p>Hi! Ask me about your {saved.length} saved places, or any restaurant in Boston’s Back Bay. Using SALT, I can tell you:</p>
    <ul className="as-can" data-salt>
      <li><Icon name="check" />If a place is still open</li>
      <li><Icon name="check" />If it takes reservations</li>
      <li><Icon name="check" />If there’s a table for your date, time and party size</li>
    </ul>
    <p className="as-cannot">I can’t recommend or rank restaurants, share menus, reviews or hours, or book for you. You book direct with the restaurant.</p>
    <div className="as-coverage">
      <p><b>Where SALT works:</b> Back Bay, Boston, the neighbourhood around Newbury Street, Boylston Street and Copley Square.{coverage ? <> Live tables for <b>{coverage.live.length}</b> of its {coverage.operating} open venues.</> : null}</p>
      {live.length > 0 && <>
        <button className="as-show-all" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide the list' : 'New to Back Bay? See where SALT can check tables'}</button>
        {open && <div className="as-coverage-list">
          {live.map((venue) => <button key={venue.venue_id} onClick={() => onPick(`Is there a table at ${venue.name} for 2 on Saturday around 7:30?`)}>{venue.name.replace(/ –.*$/, '')}</button>)}
        </div>}
      </>}
    </div>
  </div>
}

function ResultBlock({ block, savedByVenue, now, onReserve }: { block: AssistantBlock; savedByVenue: Map<string, SavedPlace>; now: number; onReserve: (venueId: string, name: string, time: string, party: number, date: string) => void }) {
  if (block.type === 'error') return <p className="as-note">SALT: {block.message}</p>
  if (block.type === 'venues') {
    if (!block.venues.length) return <p className="as-note" data-salt>SALT found no restaurant called “{block.query}” in Back Bay.</p>
    return <ul className="as-options as-venues">{block.venues.slice(0, 3).map((venue) => <VenueRow key={venue.venue_id} venue={venue} saved={savedByVenue.get(venue.venue_id)} />)}</ul>
  }
  const { response } = block
  const checkedAt = response.answers.find((a) => a.checked_at)?.checked_at
  return <div className="as-availability">
    <p className="as-card-head">{new Date(`${response.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })} · around {displayTime(`${response.date}T${response.time}`)} · {response.party_size} people</p>
    <ul className="as-options">{response.answers.map((answer) => <AnswerRow key={answer.venue_id} answer={answer} saved={savedByVenue.get(answer.venue_id)} around={displayTime(`${response.date}T${response.time}`)} onReserve={(time) => onReserve(answer.venue_id, answer.name, time, response.party_size, response.date)} />)}</ul>
    {checkedAt && <p className="as-checked"><span className="freshness" data-salt><i aria-hidden="true" />{checkedLabel(checkedAt, now)}</span></p>}
  </div>
}

function VenueRow({ venue, saved }: { venue: LiveVenue; saved?: SavedPlace }) {
  return <li>
    <PlaceholderPhoto seed={venue.venue_id} className="as-thumb" />
    <span className="as-option-name">{venue.name}<small>{saved ? `${SOURCE_LABEL[saved.source]} · ` : ''}{venue.reservable === true ? 'Takes reservations' : venue.reservable === false ? 'No reservations' : 'Reservations unknown'}{' · '}{venue.live_availability ? 'Tables checkable live' : 'Tables not checkable live'}</small></span>
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
      Checked with SALT · {calls.map((b) => b.type === 'venues' ? 'search_venues' : 'check_availability').join(', ')}
    </button>
    {open && <ul>{calls.map((b, i) => <li key={i}><code>{b.type === 'venues' ? `search_venues(name: "${b.query}", neighbourhood: "back_bay")` : `check_availability(venue_ids: [${b.request.venue_ids.length}], date: "${b.request.date}", time: "${b.request.time}", party_size: ${b.request.party_size})`}</code></li>)}</ul>}
  </div>
}
