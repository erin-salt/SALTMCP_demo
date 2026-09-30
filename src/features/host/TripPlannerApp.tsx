import { useState } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import { toMinutes } from '../../domain/planMeal'
import type { HostTrip, ItineraryItem, MealId, MealPlan, MealQuery, MealSelection, OpenMeal, SavedPlace, VenueId } from '../../domain/types'
import { BackBayMap, PlaceholderPhoto } from './art'
import { HandoffSheet, type Handoff } from './HandoffSheet'
import { Icon } from './icons'
import { MealCard } from './MealCard'

export type SaltMode = 'without' | 'with'
export interface MealState { query: MealQuery; checking: boolean; plan?: MealPlan }

interface Props {
  trip: HostTrip
  saved: SavedPlace[]
  mode: SaltMode
  interactive: boolean
  dayId: string
  meals: Partial<Record<MealId, MealState>>
  selections: Partial<Record<MealId, MealSelection>>
  onDay?: (dayId: string) => void
  onChoose?: (meal: MealId, selection?: MealSelection) => void
}

export function TripPlannerApp({ trip, saved, mode, interactive, dayId, meals, selections, onDay, onChoose }: Props) {
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const day = trip.days.find((d) => d.id === dayId)!
  const meal = day.openMeals[0]
  const plan = mode === 'with' && meal ? meals[meal.id]?.plan : undefined
  const knownClosed = new Set<VenueId>(mode === 'with' ? Object.values(meals).flatMap((state) => state?.plan?.others.filter((o) => o.result.kind === 'closed-permanently').map((o) => o.place.id) ?? []) : [])
  const withTimes = new Set(plan?.options.map((option) => option.place.id))
  const plannedFor = (id: VenueId) => trip.days.flatMap((d) => d.openMeals.flatMap((m) => selections[m.id]?.venueId === id ? [`${d.weekday} ${m.label.toLowerCase()} · ${selections[m.id]!.time}`] : []))

  type Entry = { type: 'item'; item: ItineraryItem; minutes: number } | { type: 'meal'; meal: OpenMeal; minutes: number }
  const entries: Entry[] = [
    ...day.items.map((item): Entry => ({ type: 'item', item, minutes: toMinutes(item.time) })),
    ...day.openMeals.map((m): Entry => ({ type: 'meal', meal: m, minutes: toMinutes(selections[m.id]?.time ?? meals[m.id]?.query.time ?? m.around) })),
  ].sort((a, b) => a.minutes - b.minutes)

  return <div className={`tp is-${mode}`} inert={!interactive}>
    <nav className="tp-nav" aria-label="Trip Planner">
      <span className="tp-logo"><span className="tp-logo-mark"><Icon name="compass" /></span>Trip Planner<span className="tp-fictional">Fictional app</span></span>
      <ul><li aria-current="page">Trips</li><li>Saved</li><li>Explore</li></ul>
      <span className="tp-avatar">JM</span>
    </nav>

    <header className="tp-head">
      <div>
        <h1>{trip.title}</h1>
        <p className="tp-head-meta"><span>{trip.dates}</span><span>{trip.stay.hotel}</span></p>
      </div>
      <div className="tp-people" aria-label={`${trip.travellers.length} travellers`}>
        {trip.travellers.map((t) => <span key={t.initials} className="tp-avatar" title={t.name}>{t.initials}</span>)}
        <span className="tp-share">Share</span>
      </div>
    </header>

    <div className="tp-map-wrap">
      <BackBayMap>
        <span className="pin is-hotel" style={{ left: `${trip.stay.at.x}%`, top: `${trip.stay.at.y}%` }} title={trip.stay.hotel}>H</span>
        {day.items.filter((item) => item.at).map((item) => <span key={item.title} className="pin is-stop" style={{ left: `${item.at!.x}%`, top: `${item.at!.y}%` }} title={item.title} />)}
        {saved.map((place) => {
          const state = mode === 'without' ? 'plain' : knownClosed.has(place.id) ? 'closed' : plannedFor(place.id).length ? 'planned' : withTimes.has(place.id) ? 'times' : plan ? 'quiet' : 'plain'
          return <span key={place.id} className={`pin is-save is-${state}`} style={{ left: `${place.at.x}%`, top: `${place.at.y}%` }} title={place.name}>{state === 'closed' && <Icon name="x" />}</span>
        })}
      </BackBayMap>
    </div>

    <div className="tp-body">
      <section className="tp-plan" aria-label="Itinerary">
        <div className="day-tabs" role="tablist" aria-label="Days">
          {trip.days.map((d) => <button key={d.id} role="tab" aria-selected={d.id === dayId} className="day-tab" onClick={() => onDay?.(d.id)}>
            <span className="day-tab-date"><small>{d.weekday}</small>{d.day}</span>
            <span className="day-tab-weather"><Icon name={d.weather.sky} />{d.weather.temp}</span>
            {d.openMeals.some((m) => !selections[m.id]) && <i className="day-tab-dot" aria-label="Open meal to plan" />}
          </button>)}
        </div>
        <ol className="timeline" role="tabpanel" aria-label={`${day.weekday} ${day.day} ${day.month}`}>
          {entries.map((entry) => entry.type === 'item'
            ? <li className="tl-item" key={entry.item.title}>
              <time>{entry.item.time}</time>
              <span className="tl-icon"><Icon name={entry.item.kind} /></span>
              <div className="tl-body"><p className="tl-title">{entry.item.title}</p>{entry.item.detail && <p className="tl-detail">{entry.item.detail}</p>}</div>
              {entry.item.confirmed && <span className="tl-confirmed" title="Confirmed"><Icon name="check" /></span>}
            </li>
            : <li className="tl-item is-meal" key={entry.meal.id} aria-label={`${day.weekday} ${entry.meal.label.toLowerCase()}`}>
              <time>{selections[entry.meal.id]?.time ?? meals[entry.meal.id]?.query.time ?? entry.meal.around}</time>
              <span className="tl-icon"><Icon name="meal" /></span>
              <MealCard mode={mode} day={day} meal={entry.meal} saved={saved} state={meals[entry.meal.id]} selection={selections[entry.meal.id]} onChoose={(selection) => onChoose?.(entry.meal.id, selection)} onReserve={setHandoff} />
            </li>)}
        </ol>
      </section>

      <section className="tp-saved" aria-labelledby={`saved-${mode}`}>
        <h2 id={`saved-${mode}`}>Saved in Boston <span>{saved.length}</span></h2>
        <ul>
          {saved.map((place) => {
            const closed = knownClosed.has(place.id)
            const planned = plannedFor(place.id)
            return <li key={place.id} className={`saved-row${closed ? ' is-closed' : ''}`}>
              <span className="saved-thumb"><PlaceholderPhoto seed={place.id} />{withTimes.has(place.id) && !planned.length && <i className="saved-dot" title="Times observed for your plan" />}</span>
              <span className="saved-text">
                <span className="saved-name">{place.name}</span>
                <span className="saved-meta">{closed ? <span className="salt-fact">Closed permanently</span> : planned.length ? <span className="saved-planned">{planned.join(', ')}</span> : <>{SOURCE_LABEL[place.source]} · {place.walkMin} min walk</>}</span>
              </span>
            </li>
          })}
        </ul>
      </section>
    </div>
    {handoff && <HandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />}
  </div>
}
