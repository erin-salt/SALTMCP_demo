import type { AvailabilityResponse, MealPlan, PlaceId, RowState, SaltVenue, SavedPlace } from './types'

// Accepts "7:30 PM" (host display) or "19:30" (contract).
export const toMinutes = (time: string) => {
  const [, hours, minutes, period] = time.match(/(\d+):(\d+)(?: (AM|PM))?/)!
  const h = Number(hours)
  return (period ? h % 12 + (period === 'PM' ? 12 : 0) : h) * 60 + Number(minutes)
}
export const to24h = (time: string) => {
  const minutes = toMinutes(time)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

// The host only asks about venues SALT says it can check live, and never about
// closed ones.
export const checkableVenueIds = (saved: SavedPlace[], venues: Record<PlaceId, SaltVenue | undefined>) =>
  saved.flatMap((place) => {
    const venue = venues[place.id]
    return venue?.live_availability && venue.status !== 'CLOSED_PERMANENTLY' ? [venue.venue_id] : []
  })

// Host derivation: one row per save, in the order the user saved them. The
// host does not rank. Each row carries what SALT said about that place: its
// venue record (closed, or not checkable live) or its availability answer.
export function planMeal(saved: SavedPlace[], venues: Record<PlaceId, SaltVenue | undefined>, response: AvailabilityResponse): MealPlan {
  const answers = new Map(response.answers.map((answer) => [answer.venue_id, answer]))
  return {
    rows: saved.map((place) => {
      const venue = venues[place.id]
      const answer = venue && answers.get(venue.venue_id)
      const state: RowState =
        venue?.status === 'CLOSED_PERMANENTLY' ? { kind: 'closed' }
        : !answer || answer.availability === 'NOT_SUPPORTED' ? { kind: 'not-supported' }
        : answer.availability === 'NONE_REPORTED' ? { kind: 'none-reported' }
        : answer.availability === 'UNKNOWN' ? { kind: 'unknown' }
        : { kind: 'times', times: answer.times.map((time) => ({ time })) }
      return { place, state }
    }),
  }
}
