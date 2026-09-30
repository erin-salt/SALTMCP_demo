import type { MealId, SavedRestaurant, SaltVenueResult, TripDay, TripFeasibility } from './demoTypes'

const HEADLINE_IDS: Record<MealId, string[]> = { 'saturday-dinner': ['krasi', 'la-padrona'], 'sunday-lunch': ['saltie-girl', 'back-bay-social'] }

export function deriveTripFeasibility(restaurants: SavedRestaurant[], saltResults: SaltVenueResult[], days: TripDay[]): TripFeasibility {
  const saltById = new Map(saltResults.map((result) => [result.restaurantId, result]))
  const dayByMeal = new Map(days.map((day) => [day.openMeal.id, day]))
  const optionsByMeal = Object.fromEntries(days.map((day) => {
    const ids = HEADLINE_IDS[day.openMeal.id]
    return [day.openMeal.id, ids.flatMap((id) => {
      const restaurant = restaurants.find((item) => item.id === id)
      const time = saltById.get(id as SavedRestaurant['id'])?.availability[day.openMeal.id]
      return restaurant && time ? [{ restaurant, time, isAlternative: time !== day.openMeal.targetTime }] : []
    })]
  })) as TripFeasibility['optionsByMeal']

  const enriched = restaurants.map((restaurant) => {
    const salt = saltById.get(restaurant.id)
    if (salt?.operatingStatus === 'permanently-closed') return { ...restaurant, status: 'closed' as const }
    const matches = Object.entries(salt?.availability ?? {})
    if (!matches.length) return { ...restaurant, status: 'no-match' as const }
    const [mealId, time] = matches[0] as [MealId, string]
    const day = dayByMeal.get(mealId)!
    return { ...restaurant, status: 'available' as const, match: { mealId, day: day.day, time }, singleTripMatch: restaurant.id === 'zuma-boston' }
  })

  // Prototype-derived insight: orchestration compares SALT responses across meal windows.
  const zuma = enriched.find((restaurant) => restaurant.id === 'zuma-boston')
  return { optionsByMeal, restaurants: enriched, matchingInsight: zuma?.match ? { restaurantId: 'zuma-boston', message: 'One available time matches your trip', detail: `${zuma.match.day} · ${zuma.match.time}` } : undefined }
}
