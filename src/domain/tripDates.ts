import type { HostTrip } from './types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86_400_000
const iso = (date: Date) => date.toISOString().slice(0, 10)

// Live answers need a real, upcoming date. Keep the trip's own dates while its
// Saturday is comfortably ahead; otherwise move it to the next Friday–Monday at
// least a week away. Everything else about the trip stays the same.
export function tripForLive(trip: HostTrip, today = new Date()): HostTrip {
  const start = new Date(`${trip.days[0].isoDate}T12:00:00Z`)
  const daysAhead = (start.getTime() - today.getTime()) / DAY_MS
  if (daysAhead >= 2 && daysAhead <= 50) return trip

  const friday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7, 12))
  while (friday.getUTCDay() !== 5) friday.setUTCDate(friday.getUTCDate() + 1)
  const days = trip.days.map((day, index) => {
    const date = new Date(friday.getTime() + index * DAY_MS)
    return { ...day, weekday: WEEKDAYS[date.getUTCDay()], day: String(date.getUTCDate()), month: MONTHS[date.getUTCMonth()], isoDate: iso(date) }
  })
  const first = days[0], last = days.at(-1)!
  return { ...trip, days, dates: `${first.weekday} ${first.day} – ${last.weekday} ${last.day} ${last.month}` }
}
