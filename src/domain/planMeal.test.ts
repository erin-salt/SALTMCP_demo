import { describe, expect, it } from 'vitest'
import { HOST_TRIP } from '../data/hostProductFixture'
import { simulateSaltCheck } from '../salt/simulatedSalt'
import { nextEventNote, planMeal } from './planMeal'

const day = (id: string) => HOST_TRIP.days.find((d) => d.id === id)!
const ids = HOST_TRIP.saved.map((p) => p.id)
const check = (dayId: string, partySize = 2, time?: string) => {
  const d = day(dayId)
  const meal = d.openMeals[0]
  const response = simulateSaltCheck({ venueIds: ids, partySize, date: d.isoDate, period: meal.period, preferredTime: time ?? meal.around })
  return { response, plan: planMeal(HOST_TRIP.saved, response, d) }
}

describe('simulateSaltCheck', () => {
  it('uses the adapter vocabulary and never invents a result for an unknown venue', () => {
    const { response } = check('sat')
    const byId = Object.fromEntries(response.results.map((r) => [r.venueId, r]))
    expect(byId.krasi).toEqual({ venueId: 'krasi', kind: 'times-observed', times: ['6:45 PM', '7:30 PM', '8:00 PM'] })
    expect(byId['saltie-girl']).toEqual({ venueId: 'saltie-girl', kind: 'provider-no-tables', window: '6:30–8:30 PM' })
    expect(byId['la-padrona'].kind).toBe('not-covered')
    expect(byId.lucca.kind).toBe('closed-permanently')
    expect(byId.lpm.kind).toBe('not-matched')
  })

  it('answers for the requested party and only reports times near the requested time', () => {
    const times = (partySize: number, time?: string) => check('sat', partySize, time).plan.options.map((o) => [o.place.id, o.times.map((t) => t.time)])
    expect(times(4)).toEqual([['krasi', ['8:45 PM']], ['abe-louies', ['7:15 PM', '8:30 PM']], ['zuma-boston', ['8:45 PM']], ['back-bay-social', ['7:00 PM']]])
    expect(times(2, '7:00 PM')).toContainEqual(['zuma-boston', ['8:15 PM']])
  })
})

describe('planMeal (host derivation)', () => {
  it('keeps saves in the order the user saved them, without ranking', () => {
    expect(check('sat').plan.options.map((o) => o.place.id)).toEqual(['krasi', 'abe-louies', 'zuma-boston'])
    expect(check('sun').plan.options.map((o) => o.place.id)).toEqual(['saltie-girl', 'back-bay-social', 'cafe-landwer'])
  })

  it('keeps every other save in the plan with SALT’s own reason', () => {
    const { options, others } = check('sat').plan
    expect(options.length + others.length).toBe(HOST_TRIP.saved.length)
    expect(others.find((o) => o.place.id === 'lucca')?.result.kind).toBe('closed-permanently')
  })

  it('notes a time only from events already in the itinerary', () => {
    const zuma = check('sat').plan.options.find((o) => o.place.id === 'zuma-boston')!
    expect(zuma.times.map((t) => t.nearEvent)).toEqual([undefined, { title: 'Jazz set', time: '9:15 PM', minutes: 30 }])
    expect(nextEventNote(day('sat'), '9:15 PM')).toBeUndefined()
  })
})
