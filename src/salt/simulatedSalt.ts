import { toMinutes, to24h } from '../domain/planMeal'
import type { AvailabilityRequest, AvailabilityResponse, AvailabilityState, SaltVenue } from '../domain/types'
import { forDisplay } from './liveSalt'

// Deterministic stand-in for SALT's MCP server. Nothing here calls SALT.
//
// Venue records are SALT's served Back Bay records, every public field: every
// save except Lucca Back Bay (permanently closed) is a venue SALT can check live
// today. Availability answers are representative samples, shaped exactly like
// `check_availability`: times near the requested time for the requested party,
// or an honest non-answer.

const VENUES: SaltVenue[] = [
  { venue_id: 'ven_33e0e4553b05eeb8', name: 'Krasi', address: '48 GLOUCESTER ST, Boston, MA 02115', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_c932dca57634d75e', name: 'Piattini', address: '226 NEWBURY ST, Boston, MA 02116', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_9ac23e953cf7f235', name: "Abe & Louie's", address: '793 BOYLSTON ST, Boston, MA 02116', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_9d16b22dc9bc5670', name: 'Lucca Back Bay', address: '116 HUNTINGTON AV, Boston, MA 02116', neighbourhood: 'back_bay', status: 'CLOSED_PERMANENTLY', status_confidence: 'HIGH', reservable: null, live_availability: false },
  { venue_id: 'ven_9595b326ff3a5372', name: 'Saltie Girl', address: '277 DARTMOUTH ST, Boston, MA 02116', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_7bcba82db0f290f1', name: 'Zuma Boston', address: '1 DALTON ST, Boston, MA 02115', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_79d3ee55e58022be', name: 'The Banks Seafood and Steak', address: '406 STUART ST, Boston, MA 02116', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_b766805c4b7d56e8', name: 'Asta', address: '47 MASSACHUSETTS AV, Boston, MA 02115', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_ff12d614a2148ec9', name: 'La Padrona Boston', address: '40 TRINITY PL, Boston, MA 02116', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
  { venue_id: 'ven_0146bb5d9f57b5bd', name: "Stephanie's On Newbury", address: '190 NEWBURY ST, Boston, MA 02116', neighbourhood: 'back_bay', status: 'OPERATING', status_confidence: 'HIGH', reservable: true, live_availability: true },
]

const fold = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

// `search_venues(name)`: the host calls this once, when the user saves a place.
export function searchVenues(name: string): SaltVenue | undefined {
  return VENUES.find((venue) => fold(venue.name).includes(fold(name)))
}
// The same lookup as SALT returns it, for the SALT panel.
export const SEARCH_ARGS = (name: string) => ({ name, neighbourhood: 'back_bay', include_closed: true, limit: 5 })
export function searchResult(name: string) {
  const venues = VENUES.filter((venue) => fold(venue.name).includes(fold(name)))
  return { total_matches: venues.length, venues }
}

type Outcome = string[] | 'none' | 'unknown'
const SAT = '2026-10-17'
const SUN = '2026-10-18'
const SAMPLE: Record<string, Record<string, Record<number, Outcome>>> = {
  ven_33e0e4553b05eeb8: { [SAT]: { 2: ['6:45 PM', '7:30 PM', '8:00 PM'], 4: ['8:45 PM'], 6: 'none' }, [SUN]: { 2: 'none', 4: 'none', 6: 'none' } },
  ven_c932dca57634d75e: { [SAT]: { 2: ['7:00 PM', '7:45 PM'], 4: ['7:45 PM'], 6: 'none' }, [SUN]: { 2: ['12:30 PM', '1:15 PM'], 4: ['1:15 PM'], 6: 'none' } },
  ven_9ac23e953cf7f235: { [SAT]: { 2: ['7:15 PM', '8:45 PM'], 4: ['7:15 PM', '8:30 PM'], 6: ['8:30 PM'] }, [SUN]: { 2: ['12:45 PM', '1:30 PM'], 4: ['1:30 PM'], 6: ['1:30 PM'] } },
  ven_9595b326ff3a5372: { [SAT]: { 2: 'none', 4: 'none', 6: 'none' }, [SUN]: { 2: ['1:00 PM', '1:45 PM'], 4: ['1:45 PM'], 6: 'none' } },
  ven_7bcba82db0f290f1: { [SAT]: { 2: ['8:15 PM'], 4: ['8:45 PM'], 6: 'unknown' }, [SUN]: { 2: ['12:30 PM', '1:30 PM'], 4: ['1:30 PM'], 6: 'none' } },
  ven_79d3ee55e58022be: { [SAT]: { 2: ['7:30 PM', '8:15 PM'], 4: ['8:15 PM'], 6: ['8:15 PM'] }, [SUN]: { 2: ['1:00 PM'], 4: ['1:00 PM'], 6: ['1:30 PM'] } },
  ven_b766805c4b7d56e8: { [SAT]: { 2: ['8:00 PM'], 4: 'none', 6: 'none' }, [SUN]: { 2: 'none', 4: 'none', 6: 'none' } },
  ven_ff12d614a2148ec9: { [SAT]: { 2: ['7:15 PM', '8:00 PM'], 4: ['8:00 PM'], 6: 'unknown' }, [SUN]: { 2: ['12:45 PM', '1:30 PM'], 4: ['1:30 PM'], 6: 'none' } },
  ven_0146bb5d9f57b5bd: { [SAT]: { 2: ['6:45 PM', '7:30 PM'], 4: ['7:30 PM'], 6: ['6:45 PM'] }, [SUN]: { 2: ['1:00 PM', '1:15 PM'], 4: ['12:30 PM'], 6: ['12:30 PM'] } },
}
export const PARTY_SIZES = [2, 4, 6]
const NEARBY_MIN = 75
export const TIME_ZONE = 'America/New_York'

// SALT gives times in venue-local ISO 8601 with the UTC offset.
const offsetOn = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
  .formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === 'timeZoneName')!.value.replace('GMT', '') || '+00:00'
const isoAt = (date: string, time: string) => `${date}T${to24h(time)}:00${offsetOn(date)}`

// `check_availability(venue_ids, date, time, party_size)`, exactly as SALT answers.
export function availability(request: AvailabilityRequest, now = new Date()): AvailabilityResponse {
  const target = toMinutes(request.time)
  const checkedAt = now.toISOString()
  return {
    date: request.date,
    time: request.time,
    party_size: request.party_size,
    time_zone: TIME_ZONE,
    answers: request.venue_ids.map((venueId) => {
      const venue = VENUES.find((v) => v.venue_id === venueId)!
      const base = { venue_id: venueId, name: venue.name }
      if (!venue.live_availability) return { ...base, availability: 'NOT_SUPPORTED' as const, times: [], checked_at: null }
      const outcome = SAMPLE[venueId]?.[request.date]?.[request.party_size] ?? 'unknown'
      const times = Array.isArray(outcome) ? outcome.filter((time) => Math.abs(toMinutes(time) - target) <= NEARBY_MIN) : []
      const availability: AvailabilityState = outcome === 'unknown' ? 'UNKNOWN'
        : !times.length ? 'NONE_REPORTED'
        : times.some((time) => toMinutes(time) === target) ? 'AVAILABLE' : 'ALTERNATIVE_TIMES'
      return { ...base, availability, times: times.map((time) => isoAt(request.date, time)), checked_at: checkedAt }
    }),
  }
}

// The same answer with times the way the host shows them ("7:30 PM").
export const checkAvailability = (request: AvailabilityRequest, now = new Date()) => forDisplay(availability(request, now))

export const requestTime = (time: string) => to24h(time)

// How long the demo pauses so the request is perceptible. Not a latency claim.
export const SIMULATED_EXCHANGE_MS = 900
