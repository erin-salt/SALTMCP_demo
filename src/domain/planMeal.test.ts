import { describe, expect, it } from 'vitest'
import { WAYFARER_TRIP } from '../data/hostProductFixture'
import { simulateSaltCheck } from '../salt/simulatedSalt'
import { nextEventNote, planMeal } from './planMeal'
import type { TripDay } from './types'

const day = (id: string) => WAYFARER_TRIP.days.find((d) => d.id === id)!
const plan = (d: TripDay) => {
  const meal = d.openMeals[0]
  const response = simulateSaltCheck({ venueIds: WAYFARER_TRIP.saved.map((p) => p.id), partySize: 2, date: d.isoDate, period: meal.period, preferredTime: meal.around })
  return planMeal(WAYFARER_TRIP.saved, response, d, meal)
}

describe('simulateSaltCheck', () => {
  it('uses the adapter vocabulary and never invents a result for an unknown venue', () => {
    const response = simulateSaltCheck({ venueIds: ['krasi', 'saltie-girl', 'la-padrona', 'lucca', 'lpm'], partySize: 2, date: '2026-10-17', period: 'dinner', preferredTime: '7:30 PM' })
    expect(response.results).toEqual([
      { venueId: 'krasi', kind: 'times-observed', times: ['7:30 PM', '8:00 PM'] },
      { venueId: 'saltie-girl', kind: 'provider-no-tables', window: '6:30–8:30 PM' },
      { venueId: 'la-padrona', kind: 'not-covered' },
      { venueId: 'lucca', kind: 'closed-permanently' },
      { venueId: 'lpm', kind: 'not-matched' },
    ])
  })
})

describe('planMeal (host derivation)', () => {
  it('offers every save with observed times, closest to the planned time first', () => {
    expect(plan(day('sat')).options.map((o) => [o.place.id, o.times.map((t) => t.time)])).toEqual([
      ['krasi', ['7:30 PM', '8:00 PM']], ['abe-louies', ['7:15 PM']], ['zuma-boston', ['8:15 PM', '8:45 PM']],
    ])
    expect(plan(day('sun')).options.map((o) => o.place.id)).toEqual(['saltie-girl', 'cafe-landwer', 'back-bay-social'])
  })

  it('keeps every other save in the plan with SALT’s own reason', () => {
    const { options, others } = plan(day('sat'))
    expect(options.length + others.length).toBe(WAYFARER_TRIP.saved.length)
    expect(Object.fromEntries(others.map((o) => [o.place.id, o.result.kind]))).toEqual({
      'la-padrona': 'not-covered', 'saltie-girl': 'provider-no-tables', 'back-bay-social': 'unknown',
      stephanies: 'unknown', 'cafe-landwer': 'provider-no-tables', lpm: 'not-matched', lucca: 'closed-permanently',
    })
  })

  it('notes a time only from events already in the itinerary', () => {
    const zuma = plan(day('sat')).options.find((o) => o.place.id === 'zuma-boston')!
    expect(zuma.times.map((t) => t.nearEvent)).toEqual([undefined, { title: 'Jazz set', time: '9:15 PM', minutes: 30 }])
    expect(nextEventNote(day('sat'), '9:15 PM')).toBeUndefined()
  })
})
