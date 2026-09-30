import { useRef, useState } from 'react'
import type { HostTrip, MealId, MealSelection, OpenMeal, SavedPlace, TripDay, VenueId } from '../../domain/types'
import type { Exchange } from '../shell/SaltRail'
import { HandoffSheet, type Handoff } from './HandoffSheet'
import { Icon } from './icons'
import { Itinerary } from './Itinerary'
import { SavedCollection } from './SavedCollection'
import { TripTodos } from './TripTodos'

interface Props {
  trip: HostTrip
  saved: SavedPlace[]
  exchanges: Exchange[]
  selections: Partial<Record<MealId, MealSelection>>
  closedVenues: Set<VenueId>
  onCheck: (day: TripDay, meal: OpenMeal) => void
  onSelect: (meal: MealId, selection?: MealSelection) => void
  onRemoveSave: (id: VenueId) => void
}

export function WayfarerApp({ trip, saved, exchanges, selections, closedVenues, onCheck, onSelect, onRemoveSave }: Props) {
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const slotRefs = useRef<Partial<Record<MealId, HTMLElement | null>>>({})
  const meals = trip.days.flatMap((day) => day.openMeals.map((meal) => ({ day, meal })))
  const placeName = (id: VenueId) => trip.saved.find((place) => place.id === id)?.name ?? ''

  const focusMeal = (id: MealId) => {
    const slot = slotRefs.current[id]
    slot?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    slot?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }

  return <div className="wf">
    <nav className="wf-nav" aria-label="Wayfarer">
      <span className="wf-logo"><Icon name="compass" />Wayfarer</span>
      <ul>
        <li aria-current="page">Trips</li>
        <li>Saved</li>
        <li>Explore</li>
      </ul>
      <span className="wf-avatar" aria-label="Your account">JM</span>
    </nav>

    <header className="wf-trip">
      <p className="wf-crumb">Trips <span aria-hidden="true">›</span> Upcoming</p>
      <h1>{trip.destination}</h1>
      <p className="wf-trip-meta"><span>{trip.dates}</span><span>{trip.partySize} travellers</span><span>{trip.stay.hotel}, {trip.stay.area}</span></p>
      <div className="wf-tabs" role="presentation"><span className="is-active">Itinerary</span><span>Bookings</span><span>Documents</span></div>
    </header>

    <div className="wf-body">
      <Itinerary
        trip={trip}
        saved={saved}
        exchanges={exchanges}
        selections={selections}
        slotRef={(id, el) => { slotRefs.current[id] = el }}
        onCheck={onCheck}
        onSelect={onSelect}
        onReserve={setHandoff}
      />
      <div className="wf-side">
        <SavedCollection saved={saved} selections={selections} meals={meals} closedVenues={closedVenues} onRemove={onRemoveSave} />
        <TripTodos todos={trip.todos} meals={meals} selections={selections} placeName={placeName} onOpenMeal={focusMeal} />
      </div>
    </div>
    {handoff && <HandoffSheet handoff={handoff} partySize={trip.partySize} onClose={() => setHandoff(null)} />}
  </div>
}
