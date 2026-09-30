import type { MealId, RestaurantId, TripDay, TripFeasibility } from '../../domain/demoTypes'

interface Props { days: TripDay[]; feasibility?: TripFeasibility; selections: Partial<Record<MealId, RestaurantId>>; onAdd: (meal: MealId, restaurant: RestaurantId) => void }
export function Itinerary({ days, feasibility, selections, onAdd }: Props) {
  return <section className="itinerary" aria-labelledby="trip-heading"><p className="section-label" id="trip-heading">Your trip</p>
    <div className="days">{days.map((day) => <article className="day" key={day.day}><header><h2>{day.day}</h2><span>{day.date}</span></header>
      <div className="timeline">{[...day.activities.slice(0, day.mealPosition), day.openMeal, ...day.activities.slice(day.mealPosition)].map((item) => {
        if ('id' in item) {
          const selectedId = selections[item.id]; const selected = selectedId && feasibility?.restaurants.find((r) => r.id === selectedId)
          return <div className="timeline-item meal" key={item.id}><div className="time">{selected?.match?.time ?? item.label}</div><div className="event">
            {selected ? <><h3>{selected.name}</h3><p>{item.label}</p><button className="change-button" onClick={() => onAdd(item.id, selected.id)}>Change choice</button></> : <><h3>{item.label}</h3><p>around {item.targetTime}</p>{!feasibility && <span className="open-label">Open</span>}
              {feasibility && <div className="options">{feasibility.optionsByMeal[item.id].map((option) => <div className="option" key={option.restaurant.id}><div><strong>{option.restaurant.name}</strong><span>{option.time} available</span><small>From your saves</small></div><button onClick={() => onAdd(item.id, option.restaurant.id)}>{option.isAlternative ? `Add at ${option.time.replace(' PM','')}` : 'Add'}</button></div>)}</div>}
            </>}
          </div></div>
        }
        return <div className="timeline-item" key={item.title}><div className="time">{item.time}</div><div className="event"><h3>{item.title}</h3></div></div>
      })}</div>
    </article>)}</div>
  </section>
}
