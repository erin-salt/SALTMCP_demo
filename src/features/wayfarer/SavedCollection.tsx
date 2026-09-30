import { SOURCE_LABEL } from '../../data/hostProductFixture'
import type { MealId, MealSelection, OpenMeal, SavedPlace, TripDay, VenueId } from '../../domain/types'
import { Icon } from './icons'

interface Props {
  saved: SavedPlace[]
  selections: Partial<Record<MealId, MealSelection>>
  meals: { day: TripDay; meal: OpenMeal }[]
  closedVenues: Set<VenueId>
  onRemove: (id: VenueId) => void
}

// The user's collection is host data. It is not filtered by meal; it only
// reflects facts that hold for the whole trip: a place is in the plan, or it
// is known to have closed.
export function SavedCollection({ saved, selections, meals, closedVenues, onRemove }: Props) {
  const plannedFor = (id: VenueId) => meals.flatMap(({ day, meal }) => {
    const selection = selections[meal.id]
    return selection?.venueId === id ? [`${day.weekday} ${meal.label.toLowerCase()} · ${selection.time}`] : []
  })

  return <section className="side-block saved" aria-labelledby="saved-title">
    <h2 id="saved-title">Saved in Boston <span className="count">{saved.length}</span></h2>
    <ul>
      {saved.map((place) => {
        const closed = closedVenues.has(place.id)
        const planned = plannedFor(place.id)
        return <li key={place.id} className={`saved-place${closed ? ' is-closed' : ''}`}>
          <span className="saved-name">{place.name}{closed && <span className="salt-fact">Closed permanently</span>}</span>
          {closed
            ? <button className="wf-link" onClick={() => onRemove(place.id)} aria-label={`Remove ${place.name} from saved`}>Remove</button>
            : planned.length > 0
              ? <span className="saved-status is-planned">{planned.join(', ')}</span>
              : <span className="saved-source" title={SOURCE_LABEL[place.source]}><Icon name={place.source} />{SOURCE_LABEL[place.source]}</span>}
        </li>
      })}
    </ul>
  </section>
}
