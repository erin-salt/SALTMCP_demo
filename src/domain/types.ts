// ─── Trip Planner (fictional host product) ─────────────────────────────────
// Everything below is owned by the host: the trip, the itinerary, the saves and
// where they came from. SALT never sees provenance or itinerary events.

export type PlaceId = string
export type MealId = 'sat-dinner' | 'sun-lunch'
export type SaveSource = 'tiktok' | 'you' | 'friend' | 'trip-chat' | 'browsing'
export type ItemKind = 'travel' | 'stay' | 'activity' | 'event'

// Map positions are percentages on the stylised Back Bay illustration.
export interface MapPoint { x: number; y: number }
export interface SavedPlace { id: PlaceId; name: string; source: SaveSource; walkMin: number; at: MapPoint }
export interface ItineraryItem { time: string; title: string; detail?: string; kind: ItemKind; confirmed?: boolean; at?: MapPoint }
export interface OpenMeal { id: MealId; label: 'Lunch' | 'Dinner'; around: string; timeChoices: string[] }
export interface TripDay { id: string; weekday: string; day: string; month: string; isoDate: string; weather: { temp: string; sky: 'sun' | 'cloud' | 'rain' }; items: ItineraryItem[]; openMeals: OpenMeal[] }
export interface HostTrip {
  title: string
  dates: string
  partySize: number
  travellers: { initials: string; name: string }[]
  stay: { hotel: string; area: string; at: MapPoint }
  days: TripDay[]
  saved: SavedPlace[]
}

// ─── SALT public MCP contract (simulated responses) ─────────────────────────
// Field names and values follow SALT's published tool schemas. Responses in
// this demo come from a fixture; nothing here calls SALT.

export type VenueStatus = 'OPERATING' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY' | 'UNKNOWN'
export interface SaltVenue {
  venue_id: string
  name: string
  status: VenueStatus
  reservable: boolean | null
  live_availability: boolean
}
export type AvailabilityState = 'AVAILABLE' | 'ALTERNATIVE_TIMES' | 'NONE_REPORTED' | 'UNKNOWN' | 'NOT_SUPPORTED'
export interface AvailabilityRequest { venue_ids: string[]; date: string; time: string; party_size: number }
// `times` and `checked_at` are ISO 8601 in the real contract; the demo keeps
// times as venue-local display strings and converts only for display in the rail.
export interface AvailabilityAnswer { venue_id: string; name: string; availability: AvailabilityState; times: string[]; checked_at: string | null }
export interface AvailabilityResponse { date: string; time: string; party_size: number; time_zone: string; answers: AvailabilityAnswer[] }

// ─── Host derivation ────────────────────────────────────────────────────────
// What the host shows for each save, combining SALT's venue record, SALT's
// availability answer and the host's own itinerary.

export interface EventNote { title: string; time: string; minutes: number }
export interface TimeOption { time: string; nearEvent?: EventNote }
export type RowState =
  | { kind: 'times'; times: TimeOption[] }
  | { kind: 'none-reported' }
  | { kind: 'unknown' }
  | { kind: 'not-supported' }
  | { kind: 'closed' }
export interface MealRow { place: SavedPlace; state: RowState }
export interface MealPlan { rows: MealRow[] }
export interface MealSelection { placeId: PlaceId; time: string }
export interface MealQuery { partySize: number; time: string }
