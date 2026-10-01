import { useEffect, useRef } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import type { HostTrip, MealId, MealSelection, RowState, SaltVenue, SavedPlace } from '../../domain/types'
import { PlaceholderPhoto } from './art'
import { Icon } from './icons'
import { checkedLabel } from './checked'
import type { MealState } from './TripPlannerApp'

interface Props {
  place: SavedPlace
  venue?: SaltVenue
  trip: HostTrip
  meals: Partial<Record<MealId, MealState>>
  selections: Partial<Record<MealId, MealSelection>>
  now: number
  onChoose: (meal: MealId, selection: MealSelection) => void
  onRemove: () => void
  onClose: () => void
}

const NOTE: Partial<Record<RowState['kind'], string>> = {
  'none-reported': 'No tables found',
  unknown: 'Couldn’t check just now',
}

// A saved place, as the host shows it: its own content first, then what SALT
// knows about the venue, then the latest answer for each meal already checked.
export function SavedDetail({ place, venue, trip, meals, selections, now, onChoose, onRemove, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus()
  }, [])

  const closed = venue?.status === 'CLOSED_PERMANENTLY'
  const checkable = !!venue?.live_availability && !closed
  const checked = trip.days.flatMap((day) => day.openMeals.flatMap((meal) => {
    const state = meals[meal.id]
    const row = state?.plan?.rows.find((r) => r.place.id === place.id)
    return state?.plan && !state.checking && row ? [{ day, meal, state, row }] : []
  }))

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
        : !checkable
          ? <div className="place-closed">
            <p className="place-reason">Tables for this place can’t be checked in Trip Planner yet.</p>
            <span className="check-link">Check availability with the restaurant <Icon name="external" /></span>
          </div>
          : <ul className="place-meals" aria-label="For this trip">
            {checked.length === 0 && <li className="place-reason">Open a day with a meal to plan and Trip Planner will check tables.</li>}
            {checked.map(({ day, meal, state, row }) => {
              const chosen = selections[meal.id]?.placeId === place.id ? selections[meal.id] : undefined
              return <li key={meal.id}>
                <p className="place-meal-label">{day.weekday} {meal.label.toLowerCase()}<span>{state.query.partySize} people · around {state.query.time}</span></p>
                {chosen
                  ? <p className="place-planned">Planned for {chosen.time} <span className="not-booked">Not booked</span></p>
                  : row.state.kind === 'times'
                    ? <span className="chips is-left">{row.state.times.map(({ time }) => <button key={time} className="time-chip" aria-label={`${place.name} at ${time}, ${day.weekday} ${meal.label.toLowerCase()}`} onClick={() => onChoose(meal.id, { placeId: place.id, time })}>{time}</button>)}</span>
                    : <p className="place-reason">{NOTE[row.state.kind]}</p>}
                {state.checkedAt && <p className="place-checked">{checkedLabel(state.checkedAt, now)}</p>}
              </li>
            })}
          </ul>}
    </section>
  </div>
}
