import { toMinutes, to24h } from '../domain/planMeal'
import type { AvailabilityRequest, AvailabilityResponse, AvailabilityState, SaltVenue } from '../domain/types'

// Deterministic stand-in for SALT's MCP server. Nothing here calls SALT.
//
// Venue records match SALT's served Back Bay data: statuses, reservability and
// which venues support live availability are real (about 30% of operating,
// reservable Back Bay venues do). Availability answers are representative
// samples, shaped like `check_availability`: times near the requested time for
// the requested party, or an honest non-answer.

const VENUES: SaltVenue[] = [
  { venue_id: 'ven_33e0e4553b05eeb8', name: 'Krasi', status: 'OPERATING', reservable: true, live_availability: true },
  { venue_id: 'ven_24d04b5685cd4dc2', name: 'Sorellina', status: 'OPERATING', reservable: true, live_availability: false },
  { venue_id: 'ven_9ac23e953cf7f235', name: "Abe & Louie's", status: 'OPERATING', reservable: true, live_availability: true },
  { venue_id: 'ven_9d16b22dc9bc5670', name: 'Lucca Back Bay', status: 'CLOSED_PERMANENTLY', reservable: null, live_availability: false },
  { venue_id: 'ven_9595b326ff3a5372', name: 'Saltie Girl', status: 'OPERATING', reservable: true, live_availability: true },
  { venue_id: 'ven_7bcba82db0f290f1', name: 'Zuma Boston', status: 'OPERATING', reservable: true, live_availability: true },
  { venue_id: 'ven_13ca58e0d34eb0f2', name: 'Uni', status: 'OPERATING', reservable: true, live_availability: false },
  { venue_id: 'ven_18e24fcc57ac8587', name: 'Deuxave', status: 'OPERATING', reservable: true, live_availability: false },
  { venue_id: 'ven_11f7301fbeea24b8', name: 'Mooncusser', status: 'OPERATING', reservable: true, live_availability: false },
  { venue_id: 'ven_4cff4a74bd86e2e3', name: 'Parish Cafe & Bar', status: 'OPERATING', reservable: true, live_availability: false },
]

const fold = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

// `search_venues(name)`: the host calls this once, when the user saves a place.
export function searchVenues(name: string): SaltVenue | undefined {
  return VENUES.find((venue) => fold(venue.name).includes(fold(name)))
}

type Outcome = string[] | 'none' | 'unknown'
const SAT = '2026-10-17'
const SUN = '2026-10-18'
const SAMPLE: Record<string, Record<string, Record<number, Outcome>>> = {
  ven_33e0e4553b05eeb8: { [SAT]: { 2: ['6:45 PM', '7:30 PM', '8:00 PM'], 4: ['8:45 PM'], 6: 'none' }, [SUN]: { 2: 'none', 4: 'none', 6: 'none' } },
  ven_9ac23e953cf7f235: { [SAT]: { 2: ['7:15 PM', '8:45 PM'], 4: ['7:15 PM', '8:30 PM'], 6: ['8:30 PM'] }, [SUN]: { 2: 'unknown', 4: 'unknown', 6: 'unknown' } },
  ven_9595b326ff3a5372: { [SAT]: { 2: 'none', 4: 'none', 6: 'none' }, [SUN]: { 2: ['1:00 PM', '1:45 PM'], 4: ['1:45 PM'], 6: 'none' } },
  ven_7bcba82db0f290f1: { [SAT]: { 2: ['8:15 PM'], 4: ['8:45 PM'], 6: 'unknown' }, [SUN]: { 2: ['12:30 PM', '1:30 PM'], 4: ['1:30 PM'], 6: 'none' } },
}
export const PARTY_SIZES = [2, 4, 6]
const NEARBY_MIN = 75
export const TIME_ZONE = 'America/New_York'

// `check_availability(venue_ids, date, time, party_size)`.
export function checkAvailability(request: AvailabilityRequest, now = new Date()): AvailabilityResponse {
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
      return { ...base, availability, times, checked_at: checkedAt }
    }),
  }
}

export const requestTime = (time: string) => to24h(time)

// How long the demo pauses so the request is perceptible. Not a latency claim.
export const SIMULATED_EXCHANGE_MS = 900
