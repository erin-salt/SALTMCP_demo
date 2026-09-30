import { useEffect, useRef } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import type { HostTrip, MealId, MealSelection, SavedPlace } from '../../domain/types'
import { PlaceholderPhoto } from './art'
import { Icon } from './icons'
import type { MealState } from './TripPlannerApp'

interface Props {
  place: SavedPlace
  trip: HostTrip
  meals: Partial<Record<MealId, MealState>>
  selections: Partial<Record<MealId, MealSelection>>
  onChoose: (meal: MealId, selection: MealSelection) => void
  onRemove: () => void
  onClose: () => void
}

const REASON = {
  'provider-no-tables': 'Provider showed no tables',
  unknown: 'Couldn’t confirm times',
  'not-covered': 'Times not checked',
  'not-matched': 'Couldn’t match venue',
  'closed-permanently': 'Closed permanently',
} as const

// A saved place, as the host shows it: its own content first, then whatever
// SALT has told it about this place for the meals already checked on this trip.
export function SavedDetail({ place, trip, meals, selections, onChoose, onRemove, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus()
  }, [])

  const checked = trip.days.flatMap((day) => day.openMeals.flatMap((meal) => {
    const state = meals[meal.id]
    return state?.plan ? [{ day, meal, state, plan: state.plan }] : []
  }))
  const closed = checked.some(({ plan }) => plan.others.some((o) => o.place.id === place.id && o.result.kind === 'closed-permanently'))

  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="sheet place-sheet" role="dialog" aria-modal="true" aria-labelledby="place-title" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <PlaceholderPhoto seed={place.id} className={`place-photo${closed ? ' is-closed' : ''}`} />
      <button ref={closeRef} className="sheet-close" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      <h2 id="place-title">{place.name}</h2>
      <p className="place-meta"><Icon name={place.source} />{SOURCE_LABEL[place.source]}<span>·</span>{place.walkMin} min walk from your hotel</p>

      {closed
        ? <div className="place-closed">
          <p><span className="salt-fact">Closed permanently</span></p>
          <button className="tp-button is-quiet" onClick={onRemove}>Remove from saved</button>
        </div>
        : <ul className="place-meals" aria-label="For this trip">
          {checked.map(({ day, meal, state, plan }) => {
            const option = plan.options.find((o) => o.place.id === place.id)
            const other = plan.others.find((o) => o.place.id === place.id)
            const chosen = selections[meal.id]?.venueId === place.id ? selections[meal.id] : undefined
            return <li key={meal.id}>
              <p className="place-meal-label">{day.weekday} {meal.label.toLowerCase()}<span>{state.query.partySize} people · around {state.query.time}</span></p>
              {chosen
                ? <p className="place-planned">Planned for {chosen.time} <span className="not-booked">Not booked</span></p>
                : option
                  ? <span className="chips is-left">{option.times.map(({ time }) => <button key={time} className="time-chip" aria-label={`${place.name} at ${time}, ${day.weekday} ${meal.label.toLowerCase()}`} onClick={() => onChoose(meal.id, { venueId: place.id, time })}>{time}</button>)}</span>
                  : <p className="place-reason">{other ? REASON[other.result.kind] : 'Not checked'}{other?.result.kind === 'provider-no-tables' && ` ${other.result.window}`}</p>}
            </li>
          })}
        </ul>}
    </section>
  </div>
}
