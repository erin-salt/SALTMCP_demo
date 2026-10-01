import { describe, expect, it } from 'vitest'
import { HOST_TRIP } from '../data/hostProductFixture'
import { tripForLive } from '../domain/tripDates'
import { nearestTimes } from '../domain/times'
import { displayTime } from './liveSalt'

describe('live helpers', () => {
  it('shows SALT’s venue-local times the way the host does', () => {
    expect(displayTime('2026-10-17T21:30:00-04:00')).toBe('9:30 PM')
    expect(displayTime('2026-10-18T12:15:00-04:00')).toBe('12:15 PM')
  })

  it('keeps the trip dates while they are ahead, and moves them once they are not', () => {
    expect(tripForLive(HOST_TRIP, new Date('2026-10-01T12:00:00Z'))).toBe(HOST_TRIP)
    const moved = tripForLive(HOST_TRIP, new Date('2026-11-20T12:00:00Z'))
    expect(moved.days.map((d) => `${d.weekday} ${d.isoDate}`)).toEqual(['Fri 2026-11-27', 'Sat 2026-11-28', 'Sun 2026-11-29', 'Mon 2026-11-30'])
    expect(moved.dates).toBe('Fri 27 – Mon 30 Nov')
  })

  it('shows the few times closest to the request, in time order', () => {
    const times = ['6:30 PM', '6:45 PM', '7:00 PM', '7:15 PM', '7:30 PM', '7:45 PM', '8:00 PM'].map((time) => ({ time }))
    expect(nearestTimes(times, '7:30 PM')).toEqual({ shown: [{ time: '7:15 PM' }, { time: '7:30 PM' }, { time: '7:45 PM' }], hidden: 4 })
  })
})
