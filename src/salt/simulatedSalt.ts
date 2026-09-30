import type { SaltRequest, SaltResponse, SaltResultKind, SaltVenueResult, VenueId } from '../domain/types'

// Deterministic stand-in for SALT. Nothing here is live.
//
// Venue-level facts follow SALT's Back Bay venue records: Lucca Back Bay is
// CLOSED_PERM; La Padrona's main record has an AMBIGUOUS identity, so the
// availability adapter cannot check it; LPM has no record in the Back Bay
// dataset. The others are confirmed, reservable matches.
//
// Availability outcomes are representative samples of the adapter's result
// states for a party of 2, keyed by date and meal period.
type Outcome = { kind: 'times-observed'; times: string[] } | { kind: 'provider-no-tables'; window: string } | { kind: 'unknown' }
type Venue = { kind: 'checked'; outcomes: Record<string, Outcome> } | { kind: 'not-covered' | 'closed-permanently' }

const SAT = '2026-10-17|dinner'
const SUN = '2026-10-18|lunch'
const times = (...list: string[]): Outcome => ({ kind: 'times-observed', times: list })
const noTables = (window: string): Outcome => ({ kind: 'provider-no-tables', window })
const unknown: Outcome = { kind: 'unknown' }

const SNAPSHOT: Record<VenueId, Venue> = {
  krasi: { kind: 'checked', outcomes: { [SAT]: times('7:30 PM', '8:00 PM'), [SUN]: noTables('12:00–2:00 PM') } },
  'abe-louies': { kind: 'checked', outcomes: { [SAT]: times('7:15 PM'), [SUN]: unknown } },
  'zuma-boston': { kind: 'checked', outcomes: { [SAT]: times('8:15 PM', '8:45 PM'), [SUN]: unknown } },
  'saltie-girl': { kind: 'checked', outcomes: { [SAT]: noTables('6:30–8:30 PM'), [SUN]: times('1:00 PM', '1:45 PM') } },
  'cafe-landwer': { kind: 'checked', outcomes: { [SAT]: noTables('6:30–8:30 PM'), [SUN]: times('1:15 PM') } },
  'back-bay-social': { kind: 'checked', outcomes: { [SAT]: unknown, [SUN]: times('12:30 PM', '2:00 PM') } },
  stephanies: { kind: 'checked', outcomes: { [SAT]: unknown, [SUN]: noTables('12:00–2:00 PM') } },
  'la-padrona': { kind: 'not-covered' },
  lucca: { kind: 'closed-permanently' },
}

export function simulateSaltCheck(request: SaltRequest): SaltResponse {
  return {
    results: request.venueIds.map((venueId): SaltVenueResult => {
      const venue = SNAPSHOT[venueId]
      if (!venue) return { venueId, kind: 'not-matched' }
      if (venue.kind !== 'checked') return { venueId, kind: venue.kind }
      return { venueId, ...(venue.outcomes[`${request.date}|${request.period}`] ?? unknown) }
    }),
  }
}

// How SALT's result states read in the rail, in the order they are listed.
export const RESULT_LABEL: Record<SaltResultKind, string> = {
  'times-observed': 'times observed',
  'provider-no-tables': 'provider showed no tables',
  unknown: 'couldn’t confirm',
  'not-covered': 'times not checked',
  'not-matched': 'venue not matched',
  'closed-permanently': 'closed permanently',
}

// How long the demo pauses to make the exchange perceptible. Not a latency claim.
export const SIMULATED_EXCHANGE_MS = 1100
