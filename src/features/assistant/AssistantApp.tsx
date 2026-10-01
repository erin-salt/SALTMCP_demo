import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import { planMeal } from '../../domain/planMeal'
import type { HostTrip, MealRow, MealSelection, PlaceId, SaltVenue, SavedPlace } from '../../domain/types'
import { PlaceholderPhoto } from '../host/art'
import { checkedLabel } from '../host/checked'
import { HandoffSheet, type Handoff } from '../host/HandoffSheet'
import { Icon } from '../host/icons'
import type { SaltMode } from '../host/TripPlannerApp'
import { PROMPTS, type Prompt, type Turn } from './prompts'

// A fictional AI travel assistant. The prompts are scripted (see prompts.ts) so
// the demo stays deterministic; the assistant's wording is the host's, the facts
// are SALT's.
const WEEKDAY: Record<string, string> = { Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday' }

interface Props {
  trip: HostTrip
  saved: SavedPlace[]
  venues: Record<PlaceId, SaltVenue | undefined>
  mode: SaltMode
  highlight: boolean
  turns: Turn[]
  now: number
  onAsk: (prompt: Prompt) => void
  onChoose: (turnId: string, choice: MealSelection) => void
}

export function AssistantApp({ trip, saved, venues, mode, highlight, turns, now, onAsk, onChoose }: Props) {
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const remaining = PROMPTS.filter((prompt) => !turns.some((turn) => turn.prompt.id === prompt.id))
  // Keep the newest message in view, as a chat does.
  const endRef = useRef<HTMLDivElement>(null)
  const latest = turns.at(-1)
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [turns.length, latest?.response, latest?.choice])

  return <div className={`as is-${mode}${highlight ? ' is-highlight' : ''}`}>
    <header className="as-head">
      <span className="as-logo"><span className="as-logo-mark"><Icon name="trip-chat" /></span>Trip Assistant<span className="tp-fictional">Fictional app</span></span>
      <span className="as-context"><Icon name="you" />{trip.title} · {trip.dates} · {saved.length} saved places</span>
    </header>

    <div className="as-thread" aria-live="polite">
      <Bubble from="assistant">Hi! I can help with your {trip.title}. You’ve saved {saved.length} places in Boston. Want me to find a table at one of them?</Bubble>
      {turns.map((turn) => <div key={turn.id} className="as-turn">
        <Bubble from="user">{turn.prompt.text}</Bubble>
        <Reply turn={turn} trip={trip} saved={saved} venues={venues} mode={mode} highlight={highlight} now={now} onChoose={(choice) => onChoose(turn.id, choice)} />
        {turn.choice && <>
          <Bubble from="user">Let’s do {saved.find((p) => p.id === turn.choice!.placeId)?.name} at {turn.choice.time}.</Bubble>
          <Bubble from="assistant">
            <p>Done. I’ve added {saved.find((p) => p.id === turn.choice!.placeId)?.name} at {turn.choice.time} to {WEEKDAY[dayOf(trip, turn).weekday]} {turn.prompt.meal}. It isn’t booked yet; the restaurant confirms the table.</p>
            <button className="tp-button as-reserve" onClick={() => setHandoff({ name: saved.find((p) => p.id === turn.choice!.placeId)!.name, time: turn.choice!.time, day: `${dayOf(trip, turn).weekday} ${dayOf(trip, turn).day} ${dayOf(trip, turn).month}`, party: turn.prompt.partySize, checkedAt: turn.response?.answers.find((a) => a.checked_at)?.checked_at ?? undefined })}>Reserve <Icon name="external" /></button>
          </Bubble>
        </>}
      </div>)}
      <div ref={endRef} />
    </div>

    <footer className="as-composer">
      {remaining.length > 0 && <div className="as-suggestions" aria-label="Suggested questions">
        {remaining.map((prompt, index) => <button key={prompt.id} className={`as-suggestion${index === 0 && turns.length === 0 ? ' is-first' : ''}`} onClick={() => onAsk(prompt)}>{prompt.text}</button>)}
      </div>}
      <div className="as-input" aria-hidden="true"><span>Ask about your Boston trip…</span><Icon name="travel" /></div>
    </footer>
    {handoff && <HandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />}
  </div>
}

const dayOf = (trip: HostTrip, turn: Turn) => trip.days.find((d) => d.id === turn.prompt.dayId)!

function Bubble({ from, children }: { from: 'user' | 'assistant'; children: ReactNode }) {
  return <div className={`as-bubble is-${from}`}>{from === 'assistant' && <span className="as-avatar" aria-hidden="true"><Icon name="trip-chat" /></span>}<div className="as-bubble-body">{children}</div></div>
}

function Reply({ turn, trip, saved, venues, mode, highlight, now, onChoose }: { turn: Turn; trip: HostTrip; saved: SavedPlace[]; venues: Record<PlaceId, SaltVenue | undefined>; mode: SaltMode; highlight: boolean; now: number; onChoose: (choice: MealSelection) => void }) {
  const day = dayOf(trip, turn)
  const when = `${WEEKDAY[day.weekday]} around ${turn.prompt.time}`

  // Without SALT the assistant knows the saves but nothing current about them.
  if (mode === 'without') return <Bubble from="assistant">
    <p>I can’t check whether restaurants are still open or have tables, so I can’t confirm any of these. Here are your saved places; you’ll need to check each one:</p>
    <ul className="as-list">{saved.slice(0, 5).map((place) => <li key={place.id}><span>{place.name}</span><span className="check-link">Check availability <Icon name="external" /></span></li>)}</ul>
    <p className="as-more">and {saved.length - 5} more</p>
  </Bubble>

  if (turn.checking || !turn.response) return <Bubble from="assistant">
    <p className="as-checking"><span className="freshness is-checking" data-salt><span className="salt-spinner" aria-hidden="true" />Checking your saved places</span></p>
  </Bubble>

  return <Answer turn={turn} rows={planMeal(saved, venues, turn.response).rows} when={when} highlight={highlight} now={now} onChoose={onChoose} />
}

const VISIBLE_OPTIONS = 4

function Answer({ turn, rows, when, highlight, now, onChoose }: { turn: Turn; rows: MealRow[]; when: string; highlight: boolean; now: number; onChoose: (choice: MealSelection) => void }) {
  const [all, setAll] = useState(false)
  const withTimes = rows.filter((row) => row.state.kind === 'times')
  const notes = rows.filter((row) => row.state.kind !== 'times' && row.state.kind !== 'not-supported')
  const checkedAt = turn.response?.answers.find((a) => a.checked_at)?.checked_at
  return <Bubble from="assistant">
    {highlight && <span className="as-tags"><span className="host-tag">Places from the user’s saves</span><span className="salt-tag">Answer data from SALT</span></span>}
    <p>{withTimes.length} of your saved places have tables {when} for {turn.prompt.partySize}:</p>
    <ul className="as-options">
      {(all ? withTimes : withTimes.slice(0, VISIBLE_OPTIONS)).map(({ place, state }) => <li key={place.id}>
        <PlaceholderPhoto seed={place.id} className="as-thumb" />
        <span className="as-option-name">{place.name}<small>{SOURCE_LABEL[place.source]}</small></span>
        <span className="chips" data-salt>{state.kind === 'times' && state.times.map(({ time }) => <button key={time} className="time-chip" aria-pressed={turn.choice?.placeId === place.id && turn.choice.time === time} aria-label={`${place.name} at ${time}`} onClick={() => onChoose({ placeId: place.id, time })}>{time}</button>)}</span>
      </li>)}
    </ul>
    {withTimes.length > VISIBLE_OPTIONS && <button className="as-show-all" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${withTimes.length}`}</button>}
    {notes.length > 0 && <ul className="as-notes">
      {notes.map(({ place, state }) => <li key={place.id}>
        {state.kind === 'closed' ? <><b>{place.name}</b> <span className="row-note" data-salt>has closed permanently</span>. You may want to remove it from your saves.</>
          : state.kind === 'none-reported' ? <><b>{place.name}</b>: <span className="row-note" data-salt>no tables found</span> around then.</>
          : <><b>{place.name}</b>: <span className="row-note" data-salt>couldn’t check just now</span>.</>}
      </li>)}
    </ul>}
    {checkedAt && <p className="as-checked"><span className="freshness" data-salt><i aria-hidden="true" />{checkedLabel(checkedAt, now)}</span></p>}
  </Bubble>
}
