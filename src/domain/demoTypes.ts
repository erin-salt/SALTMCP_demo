export type MealId = 'saturday-dinner' | 'sunday-lunch'
export type RestaurantId = 'krasi' | 'la-padrona' | 'saltie-girl' | 'zuma-boston' | 'back-bay-social' | 'stephanies' | 'cafe-landwer' | 'abe-louies' | 'lpm' | 'lucca'

export interface SavedRestaurant { id: RestaurantId; name: string; provenance: string; neighbourhood: 'Back Bay' }
export interface Activity { time: string; title: string }
export interface OpenMeal { id: MealId; label: string; targetTime: string }
export interface TripDay { day: string; date: string; activities: Activity[]; openMeal: OpenMeal; mealPosition: number }
export interface SaltVenueResult { restaurantId: RestaurantId; operatingStatus: 'open' | 'permanently-closed'; availability: Partial<Record<MealId, string>>; note?: string }
export interface MealOption { restaurant: SavedRestaurant; time: string; isAlternative: boolean }
export interface EnrichedRestaurant extends SavedRestaurant { status: 'unchecked' | 'available' | 'closed' | 'no-match'; match?: { mealId: MealId; day: string; time: string }; singleTripMatch?: boolean }
export interface TripFeasibility { optionsByMeal: Record<MealId, MealOption[]>; restaurants: EnrichedRestaurant[]; matchingInsight?: { restaurantId: RestaurantId; message: string; detail: string } }
