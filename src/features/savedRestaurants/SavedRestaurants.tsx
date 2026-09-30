import { useState } from 'react'
import type { EnrichedRestaurant, MealId, RestaurantId, SavedRestaurant, TripFeasibility } from '../../domain/demoTypes'

interface Props { restaurants: SavedRestaurant[]; feasibility?: TripFeasibility; selections: Partial<Record<MealId, RestaurantId>>; onAdd: (meal: MealId, restaurant: RestaurantId) => void }
export function SavedRestaurants({ restaurants, feasibility, selections, onAdd }: Props) {
  const [expanded, setExpanded] = useState(false)
  const list = (feasibility?.restaurants ?? restaurants.map((r) => ({ ...r, status: 'unchecked' as const }))) as EnrichedRestaurant[]
  const visible = expanded ? list : list.slice(0, 5)
  return <aside className="saved" aria-labelledby="saved-heading"><header><div><p className="section-label">Your collection</p><h2 id="saved-heading">Saved restaurants</h2></div><span>10 places</span></header>
    <p className="saved-intro">Places you already chose for this trip.</p>
    <div className="restaurant-list">{visible.map((restaurant) => { const addedMeal = (Object.entries(selections) as [MealId, RestaurantId][]).find(([, id]) => id === restaurant.id)?.[0]
      return <article className={`restaurant-row ${restaurant.status}`} key={restaurant.id}><div className="restaurant-main"><h3>{restaurant.name}</h3>
        {restaurant.status === 'available' && restaurant.match && <p className="availability">{restaurant.match.day} · {restaurant.match.time} available</p>}
        {restaurant.status === 'closed' && <><p className="closed-text">No longer operating</p><small>Removed from trip options</small></>}
        {addedMeal && <p className="added-text">Added to {addedMeal === 'saturday-dinner' ? 'Saturday' : 'Sunday'}</p>}
        <p className="provenance">{restaurant.provenance} · {restaurant.neighbourhood}</p></div>
        {feasibility?.matchingInsight?.restaurantId === restaurant.id && restaurant.match && !addedMeal && <div className="insight"><strong>{feasibility.matchingInsight.message}</strong><span>{feasibility.matchingInsight.detail}</span><button onClick={() => onAdd(restaurant.match!.mealId, restaurant.id)}>Add to Saturday</button></div>}
      </article>})}</div>
    <button className="reveal" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer' : 'Show all 10'}</button>
  </aside>
}
