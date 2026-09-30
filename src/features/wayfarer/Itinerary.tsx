import { toMinutes } from '../../domain/planMeal'
import type { HostTrip, ItineraryItem, MealId, MealSelection, OpenMeal, SavedPlace, TripDay } from '../../domain/types'
import type { Exchange } from '../shell/SaltRail'
import type { Handoff } from './HandoffSheet'
import { Icon } from './icons'
import { MealSlot } from './MealSlot'

interface Props {
  trip: HostTrip
  saved: SavedPlace[]
  exchanges: Exchange[]
  selections: Partial<Record<MealId, MealSelection>>
  slotRef: (id: MealId, el: HTMLElement | null) => void
  onCheck: (day: TripDay, meal: OpenMeal) => void
  onSelect: (meal: MealId, selection?: MealSelection) => void
  onReserve: (handoff: Handoff) => void
}

type Entry = { type: 'item'; item: ItineraryItem; minutes: number } | { type: 'meal'; meal: OpenMeal; minutes: number }

export function Itinerary({ trip, saved, exchanges, selections, slotRef, onCheck, onSelect, onReserve }: Props) {
  return <section className="itinerary" aria-label="Itinerary">
    {trip.days.map((day) => {
      const entries: Entry[] = [
        ...day.items.map((item): Entry => ({ type: 'item', item, minutes: toMinutes(item.time) })),
        ...day.openMeals.map((meal): Entry => ({ type: 'meal', meal, minutes: toMinutes(selections[meal.id]?.time ?? meal.around) })),
      ].sort((a, b) => a.minutes - b.minutes)

      return <article className={`day${day.openMeals.length ? '' : ' is-quiet'}`} key={day.id} aria-labelledby={`day-${day.id}`}>
        <h2 className="day-date" id={`day-${day.id}`}><span>{day.weekday}</span><b>{day.day}</b><span className="visually-hidden">{day.month}</span></h2>
        <ol className="day-items">
          {entries.map((entry) => entry.type === 'item'
            ? <li className="item" key={entry.item.title}>
              <time>{entry.item.time}</time>
              <Icon name={entry.item.kind} />
              <div><p className="item-title">{entry.item.title}</p>{entry.item.detail && <p className="item-detail">{entry.item.detail}</p>}</div>
            </li>
            : <MealSlot
              key={entry.meal.id}
              ref={(el) => slotRef(entry.meal.id, el)}
              day={day}
              meal={entry.meal}
              partySize={trip.partySize}
              savedCount={saved.length}
              exchange={exchanges.find((exchange) => exchange.mealId === entry.meal.id)}
              selection={selections[entry.meal.id]}
              onCheck={() => onCheck(day, entry.meal)}
              onSelect={(selection) => onSelect(entry.meal.id, selection)}
              onReserve={onReserve}
            />)}
        </ol>
      </article>
    })}
  </section>
}
