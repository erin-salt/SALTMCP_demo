import { toMinutes } from './planMeal'

// Host presentation rule: when SALT offers many times for one venue, show the
// few closest to the time asked for, in time order. It orders a venue's own
// times; it never ranks venues.
export function nearestTimes<T extends { time: string }>(times: T[], around: string, limit = 3) {
  const target = toMinutes(around)
  const keep = new Set([...times].sort((a, b) => Math.abs(toMinutes(a.time) - target) - Math.abs(toMinutes(b.time) - target)).slice(0, limit))
  return { shown: times.filter((t) => keep.has(t)), hidden: times.length - keep.size }
}
