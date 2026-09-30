import { toMinutes } from '../domain/planMeal'
import type { SaltRequest, SaltResponse, SaltResultKind, SaltVenueResult, VenueId } from '../domain/types'

// Deterministic stand-in for SALT. Nothing here is live.
//
// Venue-level facts follow SALT's Back Bay venue records: Lucca Back Bay is
// CLOSED_PERM; La Padrona's main record has an AMBIGUOUS identity, so the
// availability adapter cannot check it; LPM has no record in the Back Bay
// dataset. The others are confirmed, reservable matches.
//
// Availability is representative sample data. Like the adapter, which reads a
// grid of slots around the requested time, a response only reports times
// within 75 minutes either side of the requested time, for the requested party.
type Outcome = string[] | { noTables: string } | 'unknown'
type Venue = { kind: 'checked'; outcomes: Record<string, Record<number, Outcome>> } | { kind: 'not-covered' | 'closed-permanently' }

const SAT = '2026-10-17|dinner'
const SUN = '2026-10-18|lunch'
const NO_TABLES_SAT = { noTables: '6:30–8:30 PM' }
const NO_TABLES_SUN = { noTables: '12:00–2:00 PM' }
export const PARTY_SIZES = [2, 4, 6]
const WINDOW_MIN = 75

const SNAPSHOT: Record<VenueId, Venue> = {
  krasi: { kind: 'checked', outcomes: { [SAT]: { 2: ['6:45 PM', '7:30 PM', '8:00 PM'], 4: ['8:45 PM'], 6: NO_TABLES_SAT }, [SUN]: { 2: NO_TABLES_SUN, 4: NO_TABLES_SUN, 6: NO_TABLES_SUN } } },
  'abe-louies': { kind: 'checked', outcomes: { [SAT]: { 2: ['7:15 PM', '8:30 PM'], 4: ['7:15 PM', '8:30 PM'], 6: ['8:30 PM'] }, [SUN]: { 2: 'unknown', 4: 'unknown', 6: 'unknown' } } },
  'zuma-boston': { kind: 'checked', outcomes: { [SAT]: { 2: ['8:15 PM', '8:45 PM'], 4: ['8:45 PM'], 6: 'unknown' }, [SUN]: { 2: 'unknown', 4: 'unknown', 6: 'unknown' } } },
  'saltie-girl': { kind: 'checked', outcomes: { [SAT]: { 2: NO_TABLES_SAT, 4: NO_TABLES_SAT, 6: NO_TABLES_SAT }, [SUN]: { 2: ['1:00 PM', '1:45 PM'], 4: ['1:45 PM'], 6: NO_TABLES_SUN } } },
  'cafe-landwer': { kind: 'checked', outcomes: { [SAT]: { 2: NO_TABLES_SAT, 4: NO_TABLES_SAT, 6: NO_TABLES_SAT }, [SUN]: { 2: ['1:15 PM'], 4: ['12:15 PM', '1:15 PM'], 6: ['12:15 PM'] } } },
  'back-bay-social': { kind: 'checked', outcomes: { [SAT]: { 2: 'unknown', 4: ['7:00 PM'], 6: ['7:00 PM'] }, [SUN]: { 2: ['12:30 PM', '2:00 PM'], 4: ['12:30 PM', '2:00 PM'], 6: ['2:00 PM'] } } },
  stephanies: { kind: 'checked', outcomes: { [SAT]: { 2: 'unknown', 4: 'unknown', 6: 'unknown' }, [SUN]: { 2: NO_TABLES_SUN, 4: NO_TABLES_SUN, 6: NO_TABLES_SUN } } },
  'la-padrona': { kind: 'not-covered' },
  lucca: { kind: 'closed-permanently' },
}

export function simulateSaltCheck(request: SaltRequest): SaltResponse {
  const target = toMinutes(request.preferredTime)
  return {
    results: request.venueIds.map((venueId): SaltVenueResult => {
      const venue = SNAPSHOT[venueId]
      if (!venue) return { venueId, kind: 'not-matched' }
      if (venue.kind !== 'checked') return { venueId, kind: venue.kind }
      const outcome = venue.outcomes[`${request.date}|${request.period}`]?.[request.partySize] ?? 'unknown'
      if (outcome === 'unknown') return { venueId, kind: 'unknown' }
      if (!Array.isArray(outcome)) return { venueId, kind: 'provider-no-tables', window: outcome.noTables }
      const times = outcome.filter((time) => Math.abs(toMinutes(time) - target) <= WINDOW_MIN)
      return times.length ? { venueId, kind: 'times-observed', times } : { venueId, kind: 'unknown' }
    }),
  }
}

// How SALT's result states read in the rail.
export const RESULT_LABEL: Record<SaltResultKind, string> = {
  'times-observed': 'times observed',
  'provider-no-tables': 'provider showed no tables',
  unknown: 'couldn’t confirm',
  'not-covered': 'times not checked',
  'not-matched': 'venue not matched',
  'closed-permanently': 'closed permanently',
}

// How long the demo pauses to make an exchange perceptible. Not a latency claim.
export const SIMULATED_EXCHANGE_MS = 900
