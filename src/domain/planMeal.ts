import type { AvailabilityResponse, EventNote, MealPlan, PlaceId, RowState, SaltVenue, SavedPlace, TripDay } from './types'

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

// Host rule: Trip Planner notes when a time starts within this many minutes of
// the next thing already in the itinerary. It states the gap only; it does not
// assume a dining duration or travel time.
export const EVENT_NOTE_WINDOW_MIN = 30

export function nextEventNote(day: TripDay, time: string): EventNote | undefined {
  const start = toMinutes(time)
  const next = day.items
    .map((item) => ({ item, minutes: toMinutes(item.time) - start }))
    .filter(({ minutes }) => minutes > 0)
    .sort((a, b) => a.minutes - b.minutes)[0]
  return next && next.minutes <= EVENT_NOTE_WINDOW_MIN ? { title: next.item.title, time: next.item.time, minutes: next.minutes } : undefined
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
export function planMeal(saved: SavedPlace[], venues: Record<PlaceId, SaltVenue | undefined>, response: AvailabilityResponse, day: TripDay): MealPlan {
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
        : { kind: 'times', times: answer.times.map((time) => ({ time, nearEvent: nextEventNote(day, time) })) }
      return { place, state }
    }),
  }
}
