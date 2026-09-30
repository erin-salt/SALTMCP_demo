// ─── WAYFARER (host product) ────────────────────────────────────────────────
// Everything below is owned by the host: the trip, the itinerary, the saves and
// where they came from. SALT never sees provenance or itinerary events.

export type VenueId = string
export type MealId = 'sat-dinner' | 'sun-lunch'
export type SaveSource = 'tiktok' | 'you' | 'friend' | 'trip-chat' | 'browsing'
export type ItemKind = 'travel' | 'stay' | 'activity' | 'event'

export interface SavedPlace { id: VenueId; name: string; source: SaveSource }
export interface ItineraryItem { time: string; title: string; detail?: string; kind: ItemKind }
export interface OpenMeal { id: MealId; label: 'Lunch' | 'Dinner'; period: MealPeriod; around: string }
export interface TripDay { id: string; weekday: string; day: string; month: string; isoDate: string; items: ItineraryItem[]; openMeals: OpenMeal[] }
export interface Todo { id: string; label: string; done: boolean }
export interface HostTrip {
  destination: string
  dates: string
  partySize: number
  stay: { hotel: string; area: string }
  days: TripDay[]
  todos: Todo[]
  saved: SavedPlace[]
}

// ─── SALT (simulated) ───────────────────────────────────────────────────────
// The shape of what the host sends and receives. Values come from a
// deterministic fixture in this phase; nothing is requested live.

export type MealPeriod = 'lunch' | 'dinner'
export interface SaltRequest { venueIds: VenueId[]; partySize: number; date: string; period: MealPeriod; preferredTime: string }
// Mirrors the SALT adapter's vocabulary (planning/reservations/07 §6, §8):
// closure is a venue label; availability is only claimed when coverage is
// "checked", and a provider's "no tables" window stays attributed to it.
export type SaltVenueResult =
  | { venueId: VenueId; kind: 'times-observed'; times: string[] }
  | { venueId: VenueId; kind: 'provider-no-tables'; window: string }
  | { venueId: VenueId; kind: 'unknown' }
  | { venueId: VenueId; kind: 'not-covered' }
  | { venueId: VenueId; kind: 'not-matched' }
  | { venueId: VenueId; kind: 'closed-permanently' }
export type SaltResultKind = SaltVenueResult['kind']
export interface SaltResponse { results: SaltVenueResult[] }

// ─── Host derivation ────────────────────────────────────────────────────────
// What WAYFARER builds by combining SALT's response with its own context.

export interface EventNote { title: string; time: string; minutes: number }
export interface TimeOption { time: string; nearEvent?: EventNote }
export interface MealOption { place: SavedPlace; times: TimeOption[] }
export type ExcludedResult = Exclude<SaltVenueResult, { kind: 'times-observed' }>
export interface MealPlan { options: MealOption[]; others: { place: SavedPlace; result: ExcludedResult }[] }
export interface MealSelection { venueId: VenueId; time: string }
