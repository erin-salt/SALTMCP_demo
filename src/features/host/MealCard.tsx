import { useEffect, useRef, useState } from 'react'
import { nextEventNote } from '../../domain/planMeal'
import type { ExcludedResult, MealPlan, MealQuery, MealSelection, OpenMeal, SavedPlace, TripDay } from '../../domain/types'
import { PARTY_SIZES } from '../../salt/simulatedSalt'
import { PlaceholderPhoto } from './art'
import type { Handoff } from './HandoffSheet'
import { Icon } from './icons'
import type { MealState, SaltMode } from './TripPlannerApp'

interface Props {
  mode: SaltMode
  day: TripDay
  meal: OpenMeal
  saved: SavedPlace[]
  state?: MealState
  selection?: MealSelection
  onChoose: (selection?: MealSelection) => void
  onReserve: (handoff: Handoff) => void
  onQuery?: (query: MealQuery) => void
}

const reason = (result: ExcludedResult) => {
  switch (result.kind) {
    case 'provider-no-tables': return `Provider showed no tables ${result.window}`
    case 'unknown': return 'Couldn’t confirm times'
    case 'not-covered': return 'Times not checked'
    case 'not-matched': return 'Couldn’t match venue'
    case 'closed-permanently': return 'Closed permanently'
  }
}

// The one place SALT changes the host experience. Without SALT, the app can
// only list saves and send the user off to check each one. With SALT, the same
// card shows which saves have observed times for this party, around this time.
export function MealCard({ mode, day, meal, saved, state, selection, onChoose, onReserve, onQuery }: Props) {
  const [changing, setChanging] = useState(false)
  // Choosing or removing swaps the card's content, so keyboard focus is moved
  // to the new content instead of being dropped.
  const focusNext = useRef<'planned' | 'options' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusNext.current) return
    const target = focusNext.current === 'planned' ? cardRef.current?.querySelector<HTMLElement>('h3') : cardRef.current?.querySelector<HTMLElement>('.time-chip, select')
    target?.focus()
    focusNext.current = null
  })
  const party = state?.query.partySize ?? 2
  const around = state?.query.time ?? meal.around
  const chosen = selection && saved.find((place) => place.id === selection.venueId)
  const choose = (next?: MealSelection) => { focusNext.current = next ? 'planned' : 'options'; onChoose(next); setChanging(false) }

  if (chosen && selection && !changing) {
    const note = nextEventNote(day, selection.time)
    return <div className="meal-card is-planned" ref={cardRef}>
      <PlaceholderPhoto seed={chosen.id} className="meal-photo" />
      <div className="meal-planned">
        <p className="meal-kicker">{meal.label} · {party} people</p>
        <h3 tabIndex={-1}>{chosen.name}</h3>
        <p className="meal-planned-meta">{selection.time}<span className="not-booked">Not booked</span></p>
        {note && <p className="event-note">{note.minutes} min before {note.title}</p>}
        <div className="meal-actions">
          <button className="tp-button" onClick={() => onReserve({ name: chosen.name, time: selection.time, day: `${day.weekday} ${day.day} ${day.month}`, party })}>Reserve <Icon name="external" /></button>
          <button className="tp-link" onClick={() => { focusNext.current = 'options'; setChanging(true) }}>Change</button>
          <button className="tp-link" onClick={() => choose(undefined)}>Remove</button>
        </div>
      </div>
    </div>
  }

  return <div className={`meal-card is-${mode}${state?.checking ? ' is-checking' : ''}`} ref={cardRef}>
    <header className="meal-head">
      <h3>{meal.label}</h3>
      <div className="meal-query">
        <label className="pill-select"><span className="visually-hidden">Party size</span>
          <select value={party} onChange={(event) => onQuery?.({ partySize: Number(event.target.value), time: around })}>{PARTY_SIZES.map((n) => <option key={n} value={n}>{n} people</option>)}</select>
        </label>
        <label className="pill-select"><span className="visually-hidden">Time</span>
          <select value={around} onChange={(event) => onQuery?.({ partySize: party, time: event.target.value })}>{meal.timeChoices.map((t) => <option key={t} value={t}>around {t}</option>)}</select>
        </label>
      </div>
    </header>
    {mode === 'without'
      ? <WithoutSalt saved={saved} />
      : state?.checking || !state?.plan
        ? <ul className="meal-rows" aria-busy="true">{[0, 1, 2].map((i) => <li className="meal-row is-skeleton" key={i}><span className="thumb" /><span className="bar" /></li>)}</ul>
        : <WithSalt plan={state.plan} saved={saved} meal={meal} selection={selection} onChoose={choose} />}
    {changing && <p className="meal-foot is-keep"><button className="tp-link" onClick={() => { focusNext.current = 'planned'; setChanging(false) }}>Keep {chosen?.name} at {selection?.time}</button></p>}
  </div>
}

// Today's experience: the saves are listed in the order they were saved, and
// each one sends the user away to find out whether it works.
function WithoutSalt({ saved }: { saved: SavedPlace[] }) {
  return <>
    <ul className="meal-rows">
      {saved.slice(0, 4).map((place) => <li className="meal-row" key={place.id}>
        <PlaceholderPhoto seed={place.id} className="thumb" />
        <span className="meal-row-name">{place.name}<small>{place.walkMin} min walk</small></span>
        <span className="check-link">Check availability <Icon name="external" /></span>
      </li>)}
    </ul>
    <p className="meal-foot">See all {saved.length} saved places</p>
  </>
}

// With SALT: the same saves, in the same order, now carrying what SALT knows.
// Saves with observed times and saves known to have closed stay in place; the
// rest fold into one quiet line, each with SALT's reason one click away.
function WithSalt({ plan, saved, meal, selection, onChoose }: { plan: MealPlan; saved: SavedPlace[]; meal: OpenMeal; selection?: MealSelection; onChoose: (selection: MealSelection) => void }) {
  const [showOthers, setShowOthers] = useState(false)
  const othersId = `others-${meal.id}`
  const options = new Map(plan.options.map((option) => [option.place.id, option]))
  const closed = new Set(plan.others.filter((o) => o.result.kind === 'closed-permanently').map((o) => o.place.id))
  // Host rule: saves with times in the order they were saved, then closed saves.
  const rows = [...saved.filter((place) => options.has(place.id)), ...saved.filter((place) => closed.has(place.id))]
  const others = plan.others.filter((o) => !closed.has(o.place.id))
  return <>
    {plan.options.length === 0 && <p className="meal-empty">No times observed at your saves for this party and time</p>}
    <ul className="meal-rows" aria-label={`${meal.label} options`}>
      {rows.map((place, index) => {
        const option = options.get(place.id)
        return <li className={`meal-row${option ? '' : ' is-closed'}`} key={place.id} style={{ animationDelay: `${index * 60}ms` }}>
          <PlaceholderPhoto seed={place.id} className="thumb" />
          <span className="meal-row-name">{place.name}<small>{place.walkMin} min walk{option?.times.filter((time) => time.nearEvent).map(({ time, nearEvent }) => <span className="event-note" key={time}>{time} is {nearEvent!.minutes} min before {nearEvent!.title}</span>)}</small></span>
          {option
            ? <span className="chips">{option.times.map(({ time, nearEvent }) => {
              const active = selection?.venueId === place.id && selection.time === time
              return <button key={time} className={`time-chip${nearEvent ? ' has-note' : ''}`} aria-pressed={active} aria-label={`${place.name} at ${time}`} title={nearEvent ? `${nearEvent.minutes} min before ${nearEvent.title}` : undefined} onClick={() => onChoose({ venueId: place.id, time })}>{time}</button>
            })}</span>
            : <span className="salt-fact">Closed permanently</span>}
        </li>
      })}
    </ul>
    {others.length > 0 && <div className="others">
      <button className="others-toggle" aria-expanded={showOthers} aria-controls={othersId} onClick={() => setShowOthers(!showOthers)}>
        {others.length} more saves <span>no times observed</span>
      </button>
      <ul id={othersId} aria-label="Other saves" hidden={!showOthers}>
        {others.map(({ place, result }) => <li key={place.id} className={`is-${result.kind}`}><span>{place.name}</span><span>{reason(result)}</span></li>)}
      </ul>
    </div>}
  </>
}
