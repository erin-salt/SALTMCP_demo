import type { EventNote, MealPlan, OpenMeal, SaltResponse, SavedPlace, TripDay } from './types'

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
// itinerary. Every save with observed times is offered; order is closeness to
// the planned meal time, then the order the user saved them in. Every other
// save stays in the plan with SALT's reason — nothing is silently dropped.
export function planMeal(saved: SavedPlace[], response: SaltResponse, day: TripDay, meal: OpenMeal): MealPlan {
  const byId = new Map(response.results.map((result) => [result.venueId, result]))
  const target = toMinutes(meal.around)
  const distance = (time: string) => Math.abs(toMinutes(time) - target)
  const plan: MealPlan = { options: [], others: [] }

  saved.forEach((place) => {
    const result = byId.get(place.id) ?? { venueId: place.id, kind: 'not-matched' as const }
    if (result.kind !== 'times-observed') plan.others.push({ place, result })
    else plan.options.push({ place, times: [...result.times].sort((a, b) => toMinutes(a) - toMinutes(b)).map((time) => ({ time, nearEvent: nextEventNote(day, time) })) })
  })

  const closest = (option: MealPlan['options'][number]) => Math.min(...option.times.map(({ time }) => distance(time)))
  plan.options.sort((a, b) => closest(a) - closest(b))
  return plan
}
