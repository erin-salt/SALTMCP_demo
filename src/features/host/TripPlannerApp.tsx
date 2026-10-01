import { useState } from 'react'
import { SOURCE_LABEL } from '../../data/hostProductFixture'
import { toMinutes } from '../../domain/planMeal'
import type { HostTrip, ItineraryItem, MealId, MealPlan, MealQuery, MealSelection, OpenMeal, PlaceId, SaltVenue, SavedPlace } from '../../domain/types'
import { BackBayMap, PlaceholderPhoto } from './art'
import { HandoffSheet, type Handoff } from './HandoffSheet'
import { Icon } from './icons'
import { MealCard } from './MealCard'
import { SavedDetail } from './SavedDetail'

export type SaltMode = 'without' | 'with'
export interface MealState { query: MealQuery; checking: boolean; plan?: MealPlan; checkedAt?: string; error?: { message: string; retryAfter?: number } }

interface Props {
  trip: HostTrip
  saved: SavedPlace[]
  mode: SaltMode
  highlight: boolean
  dayId: string
  meals: Partial<Record<MealId, MealState>>
  selections: Partial<Record<MealId, MealSelection>>
  venues: Record<PlaceId, SaltVenue | undefined>
  now: number
  onDay?: (dayId: string) => void
  onChoose?: (meal: MealId, selection?: MealSelection) => void
  onQuery?: (meal: MealId, query: MealQuery) => void
  onRemoveSave?: (id: PlaceId) => void
  onRecheck?: (meal: MealId) => void
}

export function TripPlannerApp({ trip, saved, mode, highlight, dayId, meals, selections, venues, now, onDay, onChoose, onQuery, onRemoveSave, onRecheck }: Props) {
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [detail, setDetail] = useState<PlaceId | null>(null)
  const detailPlace = saved.find((place) => place.id === detail)
  const day = trip.days.find((d) => d.id === dayId)!
  const meal = day.openMeals[0]
  const current = meal ? meals[meal.id] : undefined
  const plan = mode === 'with' && !current?.checking ? current?.plan : undefined
  // Closure is part of SALT's venue record, known from when the place was saved.
  const knownClosed = new Set<PlaceId>(mode === 'with' ? saved.filter((place) => venues[place.id]?.status === 'CLOSED_PERMANENTLY').map((place) => place.id) : [])
  const withTimes = new Set(plan?.rows.filter((row) => row.state.kind === 'times').map((row) => row.place.id))
  const plannedFor = (id: PlaceId) => trip.days.flatMap((d) => d.openMeals.flatMap((m) => selections[m.id]?.placeId === id ? [`${d.weekday} ${m.label.toLowerCase()} · ${selections[m.id]!.time}`] : []))

  type Entry = { type: 'item'; item: ItineraryItem; minutes: number } | { type: 'meal'; meal: OpenMeal; minutes: number }
  const entries: Entry[] = [
    ...day.items.map((item): Entry => ({ type: 'item', item, minutes: toMinutes(item.time) })),
    ...day.openMeals.map((m): Entry => ({ type: 'meal', meal: m, minutes: toMinutes(selections[m.id]?.time ?? meals[m.id]?.query.time ?? m.around) })),
  ].sort((a, b) => a.minutes - b.minutes)

  return <div className={`tp is-${mode}${highlight ? ' is-highlight' : ''}`}>
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
      {highlight && <span className="salt-tag is-map">Pins from SALT</span>}
      <BackBayMap>
        <span className="pin is-hotel" style={{ left: `${trip.stay.at.x}%`, top: `${trip.stay.at.y}%` }} title={trip.stay.hotel}>H</span>
        {day.items.filter((item) => item.at).map((item) => <span key={item.title} className="pin is-stop" style={{ left: `${item.at!.x}%`, top: `${item.at!.y}%` }} title={item.title} />)}
        {saved.map((place) => {
          const state = mode === 'without' ? 'plain' : knownClosed.has(place.id) ? 'closed' : plannedFor(place.id).length ? 'planned' : withTimes.has(place.id) ? 'times' : 'quiet'
          return <span key={place.id} data-salt={state === 'times' || state === 'closed' || undefined} className={`pin is-save is-${state}`} style={{ left: `${place.at.x}%`, top: `${place.at.y}%` }} title={place.name}>{state === 'closed' && <Icon name="x" />}</span>
        })}
      </BackBayMap>
    </div>

    <div className="tp-body">
      <section className="tp-plan" aria-label="Itinerary">
        <div className="day-tabs" role="tablist" aria-label="Days" onKeyDown={(event) => {
          const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
          if (!step) return
          const index = (trip.days.findIndex((d) => d.id === dayId) + step + trip.days.length) % trip.days.length
          onDay?.(trip.days[index].id)
          event.currentTarget.querySelectorAll<HTMLElement>('[role=tab]')[index]?.focus()
        }}>
          {trip.days.map((d) => <button key={d.id} role="tab" aria-selected={d.id === dayId} tabIndex={d.id === dayId ? 0 : -1} className="day-tab" onClick={() => onDay?.(d.id)}>
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
              <MealCard mode={mode} day={day} meal={entry.meal} saved={saved} state={meals[entry.meal.id]} selection={selections[entry.meal.id]} now={now} onChoose={(selection) => onChoose?.(entry.meal.id, selection)} onReserve={setHandoff} onQuery={(query) => onQuery?.(entry.meal.id, query)} onRecheck={onRecheck && (() => onRecheck(entry.meal.id))} highlight={highlight} />
            </li>)}
        </ol>
      </section>

      <section className="tp-saved" aria-labelledby={`saved-${mode}`}>
        <header className="saved-head">
          <h2 id={`saved-${mode}`}>Your saved places{highlight && <span className="host-tag">The user’s saves · not from SALT</span>}</h2>
          <p>{saved.length} places you saved for Boston</p>
        </header>
        {/* The user's own collection: where each place came from, and any plan or
            known closure as a separate status. */}
        <ul>
          {saved.map((place) => {
            const closed = knownClosed.has(place.id)
            const planned = plannedFor(place.id)
            return <li key={place.id} className={`saved-row${closed ? ' is-closed' : ''}`} onClick={() => setDetail(place.id)}>
              <PlaceholderPhoto seed={place.id} className="saved-thumb" />
              <span className="saved-text">
                <button className="saved-name" onClick={(event) => { event.stopPropagation(); setDetail(place.id) }}>{place.name}</button>
                <span className="saved-source"><Icon name={place.source} />{SOURCE_LABEL[place.source]}</span>
              </span>
              {closed ? <span className="saved-status is-closed" data-salt>Closed</span>
                : planned.length > 0 && <span className="saved-status is-planned">{planned[0].split(' · ')[0]}</span>}
            </li>
          })}
        </ul>
      </section>
    </div>
    {handoff && <HandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />}
    {detailPlace && <SavedDetail
      place={detailPlace}
      venue={venues[detailPlace.id]}
      trip={trip}
      now={now}
      meals={meals}
      selections={selections}
      onChoose={(meal, selection) => { onChoose?.(meal, selection); setDetail(null) }}
      onRemove={() => { onRemoveSave?.(detailPlace.id); setDetail(null) }}
      onClose={() => setDetail(null)}
    />}
  </div>
}
