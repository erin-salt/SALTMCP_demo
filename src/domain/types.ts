// ─── Trip Planner (fictional host product) ─────────────────────────────────
// Everything below is owned by the host: the trip, the itinerary, the saves and
// where they came from. SALT never sees provenance or itinerary events.

export type VenueId = string
export type MealId = 'sat-dinner' | 'sun-lunch'
export type SaveSource = 'tiktok' | 'you' | 'friend' | 'trip-chat' | 'browsing'
export type ItemKind = 'travel' | 'stay' | 'activity' | 'event'

// Map positions are percentages on the stylised Back Bay illustration.
export interface MapPoint { x: number; y: number }
export interface SavedPlace { id: VenueId; name: string; source: SaveSource; walkMin: number; at: MapPoint }
export interface ItineraryItem { time: string; title: string; detail?: string; kind: ItemKind; confirmed?: boolean; at?: MapPoint }
export interface OpenMeal { id: MealId; label: 'Lunch' | 'Dinner'; period: MealPeriod; around: string; timeChoices: string[] }
export interface TripDay { id: string; weekday: string; day: string; month: string; isoDate: string; weather: { temp: string; sky: 'sun' | 'cloud' | 'rain' }; items: ItineraryItem[]; openMeals: OpenMeal[] }
export interface HostTrip {
  title: string
  destination: string
  dates: string
  partySize: number
  travellers: { initials: string; name: string }[]
  stay: { hotel: string; area: string; at: MapPoint }
  days: TripDay[]
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
// What the host builds by combining SALT's response with its own context.

export interface EventNote { title: string; time: string; minutes: number }
export interface TimeOption { time: string; nearEvent?: EventNote }
export interface MealOption { place: SavedPlace; times: TimeOption[] }
export type ExcludedResult = Exclude<SaltVenueResult, { kind: 'times-observed' }>
export interface MealPlan { options: MealOption[]; others: { place: SavedPlace; result: ExcludedResult }[] }
export interface MealSelection { venueId: VenueId; time: string }
export interface MealQuery { partySize: number; time: string }
