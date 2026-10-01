import { useEffect, useRef, useState } from 'react'
import { nextEventNote } from '../../domain/planMeal'
import type { MealQuery, MealRow, MealSelection, OpenMeal, SavedPlace, TripDay } from '../../domain/types'
import { PARTY_SIZES } from '../../salt/simulatedSalt'
import { PlaceholderPhoto } from './art'
import { checkedLabel } from './checked'
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
  now: number
  onChoose: (selection?: MealSelection) => void
  onReserve: (handoff: Handoff) => void
  onQuery?: (query: MealQuery) => void
  onRecheck?: () => void
}

// Both modes list the same saves in the same order, so the comparison is fair.
export const VISIBLE_ROWS = 5
const STALE_AFTER_MIN = 2


type Row = MealRow | { place: SavedPlace; state?: undefined }

// The one place SALT changes the host experience. Without SALT, the app can
// only list saves and send the user off to check each one. With SALT, the host
// asks once, at a moment of intent, and each row shows what came back.
export function MealCard({ mode, day, meal, saved, state, selection, now, onChoose, onReserve, onQuery, onRecheck }: Props) {
  const [changing, setChanging] = useState(false)
  const [expanded, setExpanded] = useState(false)
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
  const chosen = selection && saved.find((place) => place.id === selection.placeId)
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
          <button className="tp-button" onClick={() => onReserve({ name: chosen.name, time: selection.time, day: `${day.weekday} ${day.day} ${day.month}`, party, checkedAt: state?.checkedAt })}>Reserve <Icon name="external" /></button>
          <button className="tp-link" onClick={() => { focusNext.current = 'options'; setChanging(true) }}>Change</button>
          <button className="tp-link" onClick={() => choose(undefined)}>Remove</button>
        </div>
      </div>
    </div>
  }

  const checking = mode === 'with' && !!state?.checking
  const rows: Row[] = mode === 'with' && state?.plan && !checking ? state.plan.rows : saved.map((place) => ({ place }))
  const visible = expanded ? rows : rows.slice(0, VISIBLE_ROWS)
  const stale = !!state?.checkedAt && now - Date.parse(state.checkedAt) >= STALE_AFTER_MIN * 60000
  const listId = `rows-${meal.id}`

  return <div className={`meal-card is-${mode}${checking ? ' is-checking' : ''}`} ref={cardRef}>
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
    <p className="meal-checked" role={mode === 'with' ? 'status' : undefined}>
      {mode === 'with' && (checking ? <><span className="salt-spinner" aria-hidden="true" />Checking tables</>
        : state?.checkedAt ? <>{checkedLabel(state.checkedAt, now)}{stale && onRecheck && <button className="tp-link" onClick={onRecheck}>Check again</button>}</>
        : null)}
    </p>
    <ul className="meal-rows" id={listId} aria-label={`${meal.label} saves`} aria-busy={checking}>
      {visible.map((row, index) => <li className={`meal-row is-${row.state?.kind ?? 'plain'}`} key={row.place.id} style={{ animationDelay: `${index * 50}ms` }}>
        <PlaceholderPhoto seed={row.place.id} className="thumb" />
        <span className="meal-row-name">{row.place.name}<small>{row.place.walkMin} min walk{row.state?.kind === 'times' && row.state.times.filter((t) => t.nearEvent).map(({ time, nearEvent }) => <span className="event-note" key={time}>{time} is {nearEvent!.minutes} min before {nearEvent!.title}</span>)}</small></span>
        <RowEnd row={row} selection={selection} checking={checking} onChoose={choose} />
      </li>)}
    </ul>
    {rows.length > VISIBLE_ROWS && <button className="meal-more" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Show fewer' : `See all ${rows.length} saved places`}
    </button>}
    {changing && <p className="meal-foot is-keep"><button className="tp-link" onClick={() => { focusNext.current = 'planned'; setChanging(false) }}>Keep {chosen?.name} at {selection?.time}</button></p>}
  </div>
}

// The right-hand end of a row: what the user can do with this save now.
function RowEnd({ row, selection, checking, onChoose }: { row: Row; selection?: MealSelection; checking: boolean; onChoose: (selection: MealSelection) => void }) {
  if (checking) return <span className="bar" aria-hidden="true" />
  switch (row.state?.kind) {
    case 'times': return <span className="chips">{row.state.times.map(({ time, nearEvent }) => {
      const active = selection?.placeId === row.place.id && selection.time === time
      return <button key={time} className={`time-chip${nearEvent ? ' has-note' : ''}`} aria-pressed={active} aria-label={`${row.place.name} at ${time}`} title={nearEvent ? `${nearEvent.minutes} min before ${nearEvent.title}` : undefined} onClick={() => onChoose({ placeId: row.place.id, time })}>{time}</button>
    })}</span>
    case 'none-reported': return <span className="row-note">No tables offered around then</span>
    case 'unknown': return <span className="row-note">Couldn’t check just now</span>
    case 'closed': return <span className="salt-fact">Closed permanently</span>
    default: return <span className="check-link">Check availability <Icon name="external" /></span>
  }
}
