import type { EventNote, MealPlan, SaltResponse, SavedPlace, TripDay } from './types'

export const toMinutes = (time: string) => {
  const [, hours, minutes, period] = time.match(/(\d+):(\d+) (AM|PM)/)!
  return (Number(hours) % 12 + (period === 'PM' ? 12 : 0)) * 60 + Number(minutes)
}

// Host rule: WAYFARER notes when a time starts within this many minutes of the
// next thing already in the itinerary. It states the gap only; it does not
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

// Host derivation: combine SALT's response with the user's saves and the
// itinerary. Saves keep the order the user saved them in — the host does not
// rank them. Every save without observed times stays in the plan with SALT's
// reason; nothing is silently dropped.
export function planMeal(saved: SavedPlace[], response: SaltResponse, day: TripDay): MealPlan {
  const byId = new Map(response.results.map((result) => [result.venueId, result]))
  const plan: MealPlan = { options: [], others: [] }

  saved.forEach((place) => {
    const result = byId.get(place.id) ?? { venueId: place.id, kind: 'not-matched' as const }
    if (result.kind !== 'times-observed') plan.others.push({ place, result })
    else plan.options.push({ place, times: [...result.times].sort((a, b) => toMinutes(a) - toMinutes(b)).map((time) => ({ time, nearEvent: nextEventNote(day, time) })) })
  })

  return plan
}
